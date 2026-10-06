import { db, type Media, type MediaStatus } from "./db";
import { AiError, generateCopy } from "./ai";
import { isShuttingDown, type Job } from "./jobs";
import { log } from "./log";
import { mediaFilePath } from "./media";
import { planHasAi } from "./plans";
import type { JobDirective } from "./publisher";
import { addUsage, getSettings } from "./settings";
import { getTranscriber, TranscriberError } from "./transcriber";

function setStatus(id: string, status: MediaStatus, error: string | null = null) {
  db.prepare("UPDATE media SET status = ?, error = ? WHERE id = ?").run(status, error, id);
}

/** El trabajo murió sin terminar: el vídeo no puede quedarse "transcribiendo" para siempre. */
export function onMediaJobDead(job: Pick<Job, "ref_id">) {
  db.prepare(
    "UPDATE media SET status = 'error', error = 'No se pudo procesar el vídeo. Pulsa Reintentar.' WHERE id = ? AND status IN ('queued', 'transcribing', 'generating')",
  ).run(job.ref_id);
}

/**
 * Transcribe el vídeo y genera título, descripción, palabras clave y hashtags.
 * La transcripción se guarda antes de llamar a la IA: si la IA falla, reintentar no vuelve a transcribir.
 */
export async function handleProcessMedia(job: Job): Promise<JobDirective> {
  const media = db.prepare("SELECT * FROM media WHERE id = ?").get(job.ref_id) as Media | undefined;
  if (!media) return { type: "done" };
  const logCtx = { jobId: job.id, mediaId: media.id, attempt: job.attempts };
  // El plan pasó a Free mientras esperaba en la cola: sin IA, el vídeo queda listo para escribir el texto a mano
  if (!planHasAi(media.workspace_id)) {
    setStatus(media.id, "ready", null);
    return { type: "done" };
  }

  try {
    let transcript = media.transcript;
    let language = media.language;
    if (transcript === null) {
      setStatus(media.id, "transcribing");
      const started = Date.now();
      const t = await getTranscriber().transcribe(mediaFilePath(media));
      transcript = t.text;
      language = t.language;
      db.prepare("UPDATE media SET transcript = ?, language = ?, duration_s = ? WHERE id = ?").run(
        transcript,
        language,
        t.durationS,
        media.id,
      );
      log.info("media.transcribed", { ...logCtx, ms: Date.now() - started, chars: transcript.length, language });
    }

    setStatus(media.id, "generating");
    const { copy, model, tokens } = await generateCopy({
      transcript,
      settings: getSettings(media.workspace_id),
      detectedLanguage: language,
      fileName: media.original_name,
    });
    db.prepare("UPDATE media SET ai = ?, status = 'ready', error = NULL WHERE id = ?").run(JSON.stringify({ ...copy, model }), media.id);
    addUsage(media.workspace_id, "ai_tokens", tokens);
    addUsage(media.workspace_id, "videos_processed", 1);
    log.info("media.ready", { ...logCtx, model, tokens });
    return { type: "done" };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    // Whisper se paró porque la app se está apagando: el vídeo vuelve a la cola tal cual (sin error ni otro cobro)
    if (isShuttingDown() && e instanceof TranscriberError) {
      setStatus(media.id, "queued", null);
      log.info("media.requeued_on_shutdown", logCtx);
      return { type: "wait", ms: 1000 };
    }
    const retryable = e instanceof AiError && e.retryable;
    if (retryable && job.attempts < job.max_attempts) {
      setStatus(media.id, "queued", message);
      log.warn("media.retry", { ...logCtx, err: e });
      return { type: "retry", error: message };
    }
    // Errores inesperados (no de Whisper ni de la IA) no muestran detalles internos al usuario
    const known = e instanceof AiError || e instanceof TranscriberError;
    setStatus(media.id, "error", known ? message : "No se pudo procesar el vídeo. Pulsa Reintentar.");
    log.error("media.failed", { ...logCtx, err: e });
    return { type: "done" };
  }
}
