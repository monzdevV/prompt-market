import { randomUUID } from "node:crypto";
import { db } from "./db";

/**
 * Cola de trabajos persistente en SQLite.
 *
 * - Sobrevive a reinicios: nada se pierde por un "void promesa()" que muere con el proceso.
 * - Reclamar es atómico (un UPDATE … RETURNING), así que un trabajo nunca lo ejecutan dos a la vez.
 * - Cada trabajo reclamado tiene un "lease": si el proceso muere, otro lo retoma cuando caduca.
 * - Todas las escrituras posteriores comprueban locked_by (fencing): un ejecutor que perdió el
 *   lease no puede pisar el resultado del que lo retomó. locked_by es único POR RECLAMACIÓN
 *   (WORKER_ID + token aleatorio), así que el fencing funciona también dentro del mismo proceso.
 */

export type JobKind = "process_media" | "publish_target" | "sync_account" | "convert_media";

export type Job = {
  id: number;
  workspace_id: string;
  kind: JobKind;
  ref_id: string;
  status: "queued" | "running" | "done" | "failed";
  run_after: number;
  attempts: number;
  max_attempts: number;
  locked_by: string | null;
  locked_until: number | null;
  last_error: string | null;
};

export const WORKER_ID = randomUUID();

// Apagado en curso: un trabajo cortado por el apagado vuelve a la cola sin contar como fallo
let shuttingDown = false;
export const markShuttingDown = () => {
  shuttingDown = true;
};
export const isShuttingDown = () => shuttingDown;

/** Encola si no hay ya un trabajo vivo para ese mismo objeto (índice único jobs_live). */
export function enqueue(kind: JobKind, refId: string | number, workspaceId: string, runAfter = Date.now()) {
  const now = Date.now();
  db.prepare(
    `INSERT INTO jobs (workspace_id, kind, ref_id, run_after, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT (kind, ref_id) WHERE status IN ('queued', 'running')
     DO UPDATE SET run_after = MIN(jobs.run_after, excluded.run_after), updated_at = excluded.updated_at`,
  ).run(workspaceId, kind, String(refId), runAfter, now, now);
}

/** Cambia la hora de un trabajo aún no empezado (reprogramar / publicar ya). */
export function reschedule(kind: JobKind, refId: string | number, runAfter: number) {
  db.prepare("UPDATE jobs SET run_after = ?, updated_at = ? WHERE kind = ? AND ref_id = ? AND status = 'queued'").run(
    runAfter,
    Date.now(),
    kind,
    String(refId),
  );
}

export function cancelQueued(kind: JobKind, refIds: (string | number)[]) {
  if (!refIds.length) return;
  db.prepare(
    `DELETE FROM jobs WHERE kind = ? AND status = 'queued' AND ref_id IN (${refIds.map(() => "?").join(",")})`,
  ).run(kind, ...refIds.map(String));
}

export function claim(kind: JobKind, leaseMs: number, workerId: string = WORKER_ID): Job | undefined {
  const now = Date.now();
  const lock = `${workerId}#${randomUUID()}`;
  return db
    .prepare(
      `UPDATE jobs SET status = 'running', locked_by = ?, locked_until = ?, attempts = attempts + 1, updated_at = ?
       WHERE id = (
         SELECT id FROM jobs
         WHERE kind = ? AND ((status = 'queued' AND run_after <= ?)
                             OR (status = 'running' AND locked_until < ? AND attempts < max_attempts))
         -- Reparto justo entre clientes: antes el espacio que lleva más tiempo sin ser atendido,
         -- así un cliente que sube 30 vídeos no deja esperando a todos los demás
         ORDER BY (SELECT MAX(j2.updated_at) FROM jobs j2
                   WHERE j2.workspace_id = jobs.workspace_id AND j2.kind = jobs.kind AND j2.status IN ('running', 'done', 'failed')) IS NOT NULL,
                  (SELECT MAX(j2.updated_at) FROM jobs j2
                   WHERE j2.workspace_id = jobs.workspace_id AND j2.kind = jobs.kind AND j2.status IN ('running', 'done', 'failed')),
                  run_after
         LIMIT 1
       )
       RETURNING *`,
    )
    .get(lock, now + leaseMs, now, kind, now, now) as Job | undefined;
}

/** ¿Sigue este ejecutor siendo el dueño del trabajo? (si perdió el lease, otro lo retomó y no debe escribir) */
export function stillOwned(job: Job) {
  return !!db.prepare("SELECT 1 FROM jobs WHERE id = ? AND locked_by = ? AND status = 'running'").get(job.id, job.locked_by);
}

export function heartbeat(job: Job, leaseMs: number) {
  const r = db
    .prepare("UPDATE jobs SET locked_until = ?, updated_at = ? WHERE id = ? AND locked_by = ? AND status = 'running'")
    .run(Date.now() + leaseMs, Date.now(), job.id, job.locked_by);
  return r.changes === 1;
}

export function complete(job: Job) {
  const r = db
    .prepare(
      "UPDATE jobs SET status = 'done', locked_by = NULL, locked_until = NULL, last_error = NULL, updated_at = ? WHERE id = ? AND locked_by = ?",
    )
    .run(Date.now(), job.id, job.locked_by);
  return r.changes === 1;
}

/** Vuelve a la cola dentro de un rato (p. ej. esperando a que la red procese el vídeo). No cuenta como intento. */
export function requeue(job: Job, delayMs: number) {
  const r = db
    .prepare(
      `UPDATE jobs SET status = 'queued', run_after = ?, attempts = MAX(attempts - 1, 0), locked_by = NULL, locked_until = NULL, updated_at = ?
       WHERE id = ? AND locked_by = ?`,
    )
    .run(Date.now() + delayMs, Date.now(), job.id, job.locked_by);
  return r.changes === 1;
}

/** Fallo: reintenta con espera exponencial hasta max_attempts; después queda 'failed'. Devuelve si se reintentará. */
export function fail(job: Job, error: string, opts: { retryable: boolean }) {
  const retry = opts.retryable && job.attempts < job.max_attempts;
  const delay = Math.min(30_000 * 2 ** (job.attempts - 1), 30 * 60_000);
  db.prepare(
    `UPDATE jobs SET status = ?, run_after = ?, last_error = ?, locked_by = NULL, locked_until = NULL, updated_at = ?
     WHERE id = ? AND locked_by = ?`,
  ).run(retry ? "queued" : "failed", Date.now() + delay, error.slice(0, 1000), Date.now(), job.id, job.locked_by);
  return retry;
}

/**
 * Trabajos cuyo ejecutor murió (lease caducado) y ya no tienen intentos: p. ej. uno que tumba el
 * proceso cada vez. Se marcan como fallidos y se devuelven para limpiar lo que dejaron a medias.
 */
export function reapExhausted(): Job[] {
  return db
    .prepare(
      `UPDATE jobs SET status = 'failed', locked_by = NULL, locked_until = NULL, updated_at = ?,
         last_error = COALESCE(last_error, 'El proceso se detuvo varias veces durante este trabajo')
       WHERE status = 'running' AND locked_until < ? AND attempts >= max_attempts
       RETURNING *`,
    )
    .all(Date.now(), Date.now()) as Job[];
}

export function beat(workerId: string = WORKER_ID) {
  db.prepare(
    "INSERT INTO worker_heartbeat (id, worker_id, seen_at) VALUES (1, ?, ?) ON CONFLICT (id) DO UPDATE SET worker_id = excluded.worker_id, seen_at = excluded.seen_at",
  ).run(workerId, Date.now());
}

export function lastBeat() {
  return (db.prepare("SELECT seen_at FROM worker_heartbeat WHERE id = 1").get() as { seen_at: number } | undefined)?.seen_at ?? null;
}

/** Borra el histórico de trabajos terminados hace más de 30 días. */
export function purgeOldJobs() {
  db.prepare("DELETE FROM jobs WHERE status IN ('done', 'failed') AND updated_at < ?").run(Date.now() - 30 * 24 * 3600_000);
}
