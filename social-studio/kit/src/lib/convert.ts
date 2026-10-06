import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { db, tx, UPLOAD_DIR, type Media } from "./db";
import { badRequest, notFound } from "./errors";
import { enqueue, isShuttingDown, type Job } from "./jobs";
import { log } from "./log";
import { getMedia, mediaFilePath, storageQuotaBytes, usedStorageBytes } from "./media";
import type { JobDirective } from "./publisher";

/**
 * «Convertir a vertical»: crea una copia 9:16 (1080x1920) de un vídeo horizontal para publicarlo
 * como Short, Reel o historia. El trabajo pesado lo hace scripts/to-vertical.py (PyAV) en la cola.
 * La copia hereda la transcripción y el texto de IA del original: el audio es el mismo.
 */

// VERTICAL_SCRIPT solo para los tests (un sustituto que no necesita Python)
const script = () => process.env.VERTICAL_SCRIPT ?? path.join(process.cwd(), "scripts", "to-vertical.py");
const TIMEOUT_MS = 30 * 60_000;

/** Pide la versión vertical. Si ya existe (o está en marcha), devuelve esa en vez de crear otra. */
export function requestVertical(workspaceId: string, sourceId: string): Media {
  return tx(() => {
    const src = getMedia(workspaceId, sourceId);
    if (!src) throw notFound("El vídeo");
    if (src.size === 0) throw badRequest("El fichero de este vídeo ya se borró. Súbelo de nuevo.");
    const existing = db
      .prepare("SELECT * FROM media WHERE workspace_id = ? AND source_media_id = ? AND status != 'error' ORDER BY created_at DESC LIMIT 1")
      .get(workspaceId, sourceId) as Media | undefined;
    if (existing) return existing;
    // La versión vertical suele pesar menos que el original: se exige al menos ese espacio libre
    if (usedStorageBytes(workspaceId) + src.size > storageQuotaBytes(workspaceId)) {
      throw badRequest("No queda espacio para crear la versión vertical. Borra vídeos antiguos para liberar espacio.");
    }
    const id = randomUUID();
    const base = src.original_name.replace(/\.[^.]+$/, "");
    db.prepare(
      `INSERT INTO media (id, workspace_id, filename, original_name, mime, size, status, created_at, source_media_id)
       VALUES (?, ?, ?, ?, 'video/mp4', 0, 'queued', ?, ?)`,
    ).run(id, workspaceId, `${id}.mp4`, `${base}-vertical.mp4`.slice(0, 200), Date.now(), sourceId);
    enqueue("convert_media", id, workspaceId);
    return getMedia(workspaceId, id)!;
  });
}

function runScript(src: string, dst: string): Promise<{ ok: boolean; width?: number; height?: number; duration?: number | null; error?: string }> {
  return new Promise((resolve) => {
    const proc = spawn(process.env.PYTHON_BIN ?? "python", [script(), src, dst], {
      env: { ...process.env, PYTHONIOENCODING: "utf-8", PYTHONUNBUFFERED: "1" },
      windowsHide: true,
    });
    let out = "";
    let err = "";
    const timer = setTimeout(() => proc.kill(), TIMEOUT_MS);
    proc.stdout.on("data", (d) => (out += d));
    proc.stderr.on("data", (d) => (err = (err + d).slice(-2000)));
    proc.on("error", (e) => {
      clearTimeout(timer);
      resolve({ ok: false, error: `No se pudo ejecutar Python: ${e.message}` });
    });
    proc.on("close", (code) => {
      clearTimeout(timer);
      const line = out.trim().split("\n").pop() ?? "";
      try {
        resolve(JSON.parse(line));
      } catch {
        resolve({ ok: false, error: code === null ? "La conversión tardó demasiado" : `La conversión falló (${code}): ${err.slice(-300)}` });
      }
    });
  });
}

export async function handleConvertMedia(job: Job): Promise<JobDirective> {
  const media = db.prepare("SELECT * FROM media WHERE id = ?").get(job.ref_id) as Media | undefined;
  if (!media || media.status !== "queued") return { type: "done" };
  const src = media.source_media_id ? (db.prepare("SELECT * FROM media WHERE id = ?").get(media.source_media_id) as Media | undefined) : undefined;
  const fail = (message: string) => {
    db.prepare("UPDATE media SET status = 'error', error = ? WHERE id = ?").run(message, media.id);
    return { type: "done" } as const;
  };
  if (!src || src.size === 0) return fail("El vídeo original ya no existe");

  const dst = path.join(UPLOAD_DIR, media.filename);
  const tmp = `${dst}.part.mp4`;
  const started = Date.now();
  const r = await runScript(mediaFilePath(src), tmp);
  if (!r.ok) {
    fs.rmSync(tmp, { force: true });
    // Apagado a mitad: vuelve a la cola tal cual
    if (isShuttingDown()) return { type: "wait", ms: 1000 };
    log.warn("convert.failed", { mediaId: media.id, err: r.error });
    return fail("No se pudo convertir el vídeo a vertical. Prueba con otro archivo.");
  }
  fs.renameSync(tmp, dst);
  const size = fs.statSync(dst).size;
  // Hereda del original lo que no cambia: transcripción, idioma, texto de IA y duración
  db.prepare(
    `UPDATE media SET size = ?, width = ?, height = ?, duration_s = COALESCE(?, ?), transcript = ?, language = ?, ai = ?,
       status = 'ready', error = NULL WHERE id = ?`,
  ).run(size, r.width ?? 1080, r.height ?? 1920, r.duration ?? null, src.duration_s, src.transcript, src.language, src.ai, media.id);
  log.info("convert.done", { mediaId: media.id, ms: Date.now() - started, size });
  return { type: "done" };
}

export function onConvertJobDead(job: Pick<Job, "ref_id">) {
  db.prepare("UPDATE media SET status = 'error', error = 'La conversión se interrumpió' WHERE id = ? AND status = 'queued'").run(job.ref_id);
}
