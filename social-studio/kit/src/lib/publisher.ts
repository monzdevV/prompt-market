import { db, type AccountWithTokens, type Media, type Post, type Target } from "./db";
import { getAccountWithTokens, markNeedsReauth } from "./accounts";
import { coverPath } from "./covers";
import { buildCaption } from "./core/caption";
import { stillOwned, type Job } from "./jobs";
import { log } from "./log";
import { mediaFilePath } from "./media";
import { HttpError, RejectedError, UnknownOutcomeError, type RemoteRef } from "./platforms/common";
import { publisherFor } from "./platforms";
import { refreshPostStatus } from "./posts";
import { addUsage } from "./settings";

/** Qué hacer con el trabajo después de ejecutarlo. */
export type JobDirective = { type: "done" } | { type: "wait"; ms: number } | { type: "retry"; error: string };

const DONE = { type: "done" } as const;

/** Otro ejecutor retomó este trabajo: este no debe escribir nada más. */
class LeaseLostError extends Error {}

function setTarget(id: number, fields: Partial<Pick<Target, "status" | "error" | "remote_id" | "remote_url" | "published_at">>) {
  const keys = Object.keys(fields) as (keyof typeof fields)[];
  db.prepare(`UPDATE post_targets SET ${keys.map((k) => `${k} = ?`).join(", ")} WHERE id = ?`).run(
    ...keys.map((k) => fields[k] ?? null),
    id,
  );
}

function errorText(e: unknown) {
  return (e instanceof Error ? e.message : String(e)).slice(0, 1000);
}

async function freshAccount(account: AccountWithTokens) {
  const p = publisherFor(account);
  return p.refresh ? p.refresh(account) : account;
}

/**
 * Publica un destino (una cuenta de una publicación). Es reentrante: si el proceso muere a mitad,
 * el trabajo se retoma y el adaptador continúa desde remote_ref en lugar de empezar de cero.
 */
export async function handlePublishTarget(job: Job): Promise<JobDirective> {
  const target = db.prepare("SELECT * FROM post_targets WHERE id = ?").get(Number(job.ref_id)) as Target | undefined;
  if (!target || (target.status !== "pending" && target.status !== "publishing")) return DONE;
  const post = db.prepare("SELECT * FROM posts WHERE id = ?").get(target.post_id) as Post;
  // Se reprogramó mientras el trabajo ya estaba reclamado
  if (target.status === "pending" && post.scheduled_at > Date.now() + 5000) {
    return { type: "wait", ms: post.scheduled_at - Date.now() };
  }
  const media = db.prepare("SELECT * FROM media WHERE id = ?").get(post.media_id) as Media;

  const ref: RemoteRef = target.remote_ref ? JSON.parse(target.remote_ref) : {};

  let account = getAccountWithTokens(target.account_id);
  if (!account || account.status !== "active") {
    const why = account ? "La cuenta necesita que la vuelvas a conectar" : "La cuenta ya no está conectada";
    // Si ya había empezado a publicar (p. ej. TikTok publica solo al recibir el vídeo), no sabemos si salió
    setTarget(target.id, ref.committed
      ? { status: "needs_review", error: `${why}. Comprueba en la red si el vídeo llegó a publicarse.` }
      : { status: "failed", error: why });
    refreshPostStatus(post.id);
    return DONE;
  }

  if (target.status === "pending") {
    setTarget(target.id, { status: "publishing", error: null });
    refreshPostStatus(post.id);
  }

  const hashtags = JSON.parse(post.hashtags) as string[];
  const logCtx = { jobId: job.id, targetId: target.id, platform: account.platform, attempt: job.attempts };

  try {
    account = await freshAccount(account);
    const outcome = await publisherFor(account).publish({
      account,
      post,
      media,
      filePath: mediaFilePath(media),
      caption: buildCaption(post.description, hashtags),
      hashtags,
      options: JSON.parse(target.options),
      cover: { path: coverPath(post.cover_file), offsetMs: post.cover_offset_ms },
      ref,
      saveRef(patch) {
        // Si perdimos el trabajo (otro ejecutor lo retomó) no seguimos: evitaría dos subidas a la vez
        if (!stillOwned(job)) throw new LeaseLostError();
        Object.assign(ref, patch);
        db.prepare("UPDATE post_targets SET remote_ref = ? WHERE id = ?").run(JSON.stringify(ref), target.id);
      },
    });
    if (outcome.status === "wait") return { type: "wait", ms: outcome.ms };
    if (!stillOwned(job)) throw new LeaseLostError();

    setTarget(target.id, {
      status: "published",
      error: null,
      remote_id: outcome.remoteId,
      remote_url: outcome.url ?? null,
      published_at: Date.now(),
    });
    refreshPostStatus(post.id);
    addUsage(post.workspace_id, "posts_published", 1);
    log.info("publish.done", logCtx);
    return DONE;
  } catch (e) {
    if (e instanceof LeaseLostError) {
      log.warn("publish.lease_lost", logCtx);
      return DONE;
    }
    let message = errorText(e);
    const authError = e instanceof HttpError && e.auth;
    if (authError) {
      markNeedsReauth(account.id);
      message = "La red rechazó el permiso: vuelve a conectar la cuenta en Cuentas";
    }

    if (e instanceof UnknownOutcomeError) {
      setTarget(target.id, { status: "needs_review", error: message });
      refreshPostStatus(post.id);
      log.warn("publish.needs_review", { ...logCtx, err: e });
      return DONE;
    }

    // Fallo pasajero con intentos disponibles: el siguiente intento continúa (o verifica) desde remote_ref
    if (e instanceof HttpError && e.retryable && !authError && job.attempts < job.max_attempts) {
      setTarget(target.id, { error: `Reintentando: ${message}` });
      log.warn("publish.retry", { ...logCtx, err: e });
      return { type: "retry", error: message };
    }

    // Sin más reintentos. Si el paso que publica llegó a empezar y la red no ha confirmado un rechazo,
    // el resultado es incierto: nunca lo dejamos como "error" reintentable (duplicaría el vídeo).
    const uncertain = !!ref.committed && !(e instanceof RejectedError);
    setTarget(target.id, {
      status: uncertain ? "needs_review" : "failed",
      error: uncertain ? `No sabemos si llegó a publicarse (${message}). Compruébalo en la red.` : message,
    });
    refreshPostStatus(post.id);
    log.warn("publish.failed", { ...logCtx, uncertain, err: e });
    return DONE;
  }
}

/**
 * El trabajo murió sin terminar (fallo inesperado o se agotaron los intentos tras caídas del proceso).
 * El destino no puede quedarse en "publicando" para siempre: si llegó a empezar a publicar, a revisar; si no, error.
 */
export function onPublishJobDead(job: Pick<Job, "ref_id">, reason: string) {
  const target = db.prepare("SELECT * FROM post_targets WHERE id = ?").get(Number(job.ref_id)) as Target | undefined;
  if (!target || (target.status !== "pending" && target.status !== "publishing")) return;
  const committed = !!(target.remote_ref && (JSON.parse(target.remote_ref) as RemoteRef).committed);
  setTarget(target.id, committed
    ? { status: "needs_review", error: `Se interrumpió al publicar (${reason}). Comprueba en la red si salió.` }
    : { status: "failed", error: `No se pudo publicar: ${reason}` });
  refreshPostStatus(target.post_id);
}
