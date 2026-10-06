import { handleConvertMedia, onConvertJobDead } from "./convert";
import * as jobs from "./jobs";
import { purgeExpiredSessions } from "./auth";
import { purgeLoginStates } from "./social-auth";
import { log } from "./log";
import { handleProcessMedia, onMediaJobDead } from "./media-processing";
import { handlePublishTarget, onPublishJobDead, type JobDirective } from "./publisher";
import { handleSyncAccount, onSyncJobDead, purgeStaleYoutubeMetadata, scheduleDueSyncs } from "./sync";
import { backupDatabase, purgeOldUploads } from "./maintenance";
import { getTranscriber } from "./transcriber";

/**
 * Ejecutor de trabajos dentro del propio proceso de Next (la app corre en un solo servidor).
 * La cola vive en SQLite, así que para sacarlo a un proceso aparte basta con llamar a startWorker() desde otro sitio.
 */

const LEASE_MS = 2 * 60_000;
const TICK_MS = 2000;

type Kind = {
  concurrency: number;
  handler: (job: jobs.Job) => Promise<JobDirective>;
  /** Limpia lo que el trabajo dejó a medias cuando muere sin terminar. */
  onDead: (job: jobs.Job, reason: string) => void;
};

const KINDS: Record<jobs.JobKind, Kind> = {
  // Whisper usa toda la CPU: de uno en uno
  process_media: { concurrency: 1, handler: handleProcessMedia, onDead: (job) => onMediaJobDead(job) },
  publish_target: { concurrency: 3, handler: handlePublishTarget, onDead: onPublishJobDead },
  // Pocas a la vez: las cuotas de las APIs son por app y las comparten todos los clientes
  sync_account: { concurrency: 2, handler: handleSyncAccount, onDead: (job) => onSyncJobDead(job) },
  // Convertir a vertical también usa mucha CPU: de uno en uno
  convert_media: { concurrency: 1, handler: handleConvertMedia, onDead: (job) => onConvertJobDead(job) },
};

const running: Record<jobs.JobKind, number> = { process_media: 0, publish_target: 0, sync_account: 0, convert_media: 0 };
let stopping = false;

/** Ninguna escritura de la cola debe tumbar el proceso (p. ej. SQLITE_BUSY): se registra y el lease hará el resto. */
function safely(what: string, job: jobs.Job, fn: () => void) {
  try {
    fn();
  } catch (e) {
    log.error(`job.${what}_failed`, { jobId: job.id, err: e });
  }
}

async function run(kind: jobs.JobKind, job: jobs.Job) {
  running[kind]++;
  // Mientras trabaja, renueva el lease para que nadie lo dé por muerto
  const hb = setInterval(
    () =>
      safely("heartbeat", job, () => {
        if (!jobs.heartbeat(job, LEASE_MS)) log.warn("job.lease_lost", { jobId: job.id, kind });
      }),
    LEASE_MS / 3,
  );
  try {
    const d = await KINDS[kind].handler(job);
    safely("finish", job, () => {
      if (d.type === "done") jobs.complete(job);
      else if (d.type === "wait") jobs.requeue(job, d.ms);
      else jobs.fail(job, d.error, { retryable: true });
    });
  } catch (e) {
    // Fallo no previsto por el handler (un bug): se registra, se limpia el estado y no se reintenta a ciegas
    const reason = e instanceof Error ? e.message : String(e);
    log.error("job.crashed", { jobId: job.id, kind, err: e });
    safely("on_dead", job, () => KINDS[kind].onDead(job, "error interno"));
    safely("finish", job, () => jobs.fail(job, reason, { retryable: false }));
  } finally {
    clearInterval(hb);
    running[kind]--;
  }
}

function tick() {
  if (stopping) return;
  try {
    jobs.beat();
    for (const dead of jobs.reapExhausted()) {
      log.error("job.exhausted", { jobId: dead.id, kind: dead.kind });
      KINDS[dead.kind].onDead(dead, "el servidor se detuvo varias veces");
    }
    for (const kind of Object.keys(KINDS) as jobs.JobKind[]) {
      while (running[kind] < KINDS[kind].concurrency) {
        const job = jobs.claim(kind, LEASE_MS);
        if (!job) break;
        void run(kind, job);
      }
    }
  } catch (e) {
    log.error("worker.tick_failed", { err: e });
  }
}

export function startWorker() {
  const g = globalThis as unknown as { __worker?: boolean };
  if (g.__worker) return;
  g.__worker = true;

  setInterval(tick, TICK_MS).unref();
  // Analítica: cada 5 min se encolan las cuentas cuya última sincronización caducó (por defecto cada 6 h)
  const schedule = () => {
    try {
      scheduleDueSyncs();
    } catch (e) {
      log.error("sync.schedule_failed", { err: e });
    }
  };
  setInterval(schedule, 5 * 60_000).unref();
  schedule();
  setInterval(() => {
    try {
      purgeExpiredSessions();
      purgeLoginStates();
      jobs.purgeOldJobs();
      purgeStaleYoutubeMetadata();
      purgeOldUploads();
    } catch (e) {
      log.error("worker.cleanup_failed", { err: e });
    }
  }, 3600_000).unref();
  // Copia de seguridad diaria de la base (y una al arrancar si hoy aún no hay)
  const doBackup = () => backupDatabase().catch((e) => log.error("maintenance.backup_failed", { err: e }));
  setInterval(doBackup, 24 * 3600_000).unref();
  setTimeout(() => backupDatabase(new Date(), { onlyIfMissing: true }).catch((e) => log.error("maintenance.backup_failed", { err: e })), 60_000).unref();

  // Apagado ordenado: dejar de coger trabajos, parar Whisper y esperar (máx. 20 s) a los que están en marcha.
  // Lo que no termine se retoma al volver a arrancar (lease + reanudación), así que nunca se duplica nada.
  const stop = async (signal: string) => {
    if (stopping) return;
    stopping = true;
    jobs.markShuttingDown();
    log.info("worker.stopping", { signal, running: { ...running } });
    try {
      (getTranscriber() as { stop?: () => void }).stop?.();
    } catch {
      // Sin transcriptor configurado: nada que parar
    }
    const deadline = Date.now() + 20_000;
    while (Object.values(running).some((n) => n > 0) && Date.now() < deadline) await new Promise((r) => setTimeout(r, 250));
    process.exit(0);
  };
  process.once("SIGTERM", () => void stop("SIGTERM"));
  process.once("SIGINT", () => void stop("SIGINT"));
  log.info("worker.started", { workerId: jobs.WORKER_ID });
  tick();
}
