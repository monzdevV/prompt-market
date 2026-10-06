import fs from "node:fs";
import path from "node:path";
import { db, tx, UPLOAD_DIR, type Media } from "./db";
import { enqueue } from "./jobs";
import { assertWithinLimit, limitsFor, planHasAi, planLimitError } from "./plans";
import { addUsage } from "./settings";
import { badRequest } from "./errors";

export const ALLOWED_EXTENSIONS = [".mp4", ".mov", ".m4v", ".webm"] as const;

/** Almacenamiento del plan del espacio; STORAGE_QUOTA_MB, si se define, es un tope global de la instalación. */
export function storageQuotaBytes(workspaceId: string) {
  const planMb = limitsFor(workspaceId).storageMb;
  const capMb = Number(process.env.STORAGE_QUOTA_MB);
  return (Number.isFinite(capMb) && capMb > 0 ? Math.min(planMb, capMb) : planMb) * 1024 * 1024;
}

// Bytes de subidas en curso por espacio: evita que varias subidas en paralelo superen la cuota
// (cada una vería el mismo espacio libre si solo contásemos lo ya guardado). Un único proceso.
const reserved = new Map<string, number>();

export function usedStorageBytes(workspaceId: string) {
  const stored = (db.prepare("SELECT COALESCE(SUM(size), 0) AS n FROM media WHERE workspace_id = ?").get(workspaceId) as { n: number }).n;
  return stored + (reserved.get(workspaceId) ?? 0);
}

/** Reserva espacio para una subida en curso. Devuelve la función que lo libera (llamar siempre en finally). */
export function reserveStorage(workspaceId: string, bytes: number) {
  reserved.set(workspaceId, (reserved.get(workspaceId) ?? 0) + bytes);
  let released = false;
  return () => {
    if (released) return;
    released = true;
    const left = (reserved.get(workspaceId) ?? 0) - bytes;
    if (left > 0) reserved.set(workspaceId, left);
    else reserved.delete(workspaceId);
  };
}

export function maxUploadBytes() {
  const mb = Number(process.env.MAX_UPLOAD_MB);
  return (Number.isFinite(mb) && mb > 0 ? mb : 500) * 1024 * 1024;
}

/**
 * Comprueba la "firma" del fichero, no lo que diga el navegador:
 * MP4/MOV/M4V llevan "ftyp" en el byte 4; WebM/MKV empiezan por 1A 45 DF A3.
 */
export function looksLikeVideo(head: Buffer) {
  if (head.length >= 12 && head.subarray(4, 8).toString("latin1") === "ftyp") return true;
  if (head.length >= 4 && head.readUInt32BE(0) === 0x1a45dfa3) return true;
  return false;
}

export function safeOriginalName(raw: string | null) {
  let name = "video.mp4";
  if (raw) {
    try {
      name = decodeURIComponent(raw);
    } catch {
      name = raw;
    }
  }
  // Solo el nombre (sin rutas) y sin caracteres de control
  name = path.basename(name.replace(/\\/g, "/")).replace(/[\u0000-\u001f\u007f]/g, "").trim();
  return (name || "video.mp4").slice(0, 200);
}

export function mediaFilePath(media: Pick<Media, "filename">) {
  return path.join(UPLOAD_DIR, media.filename);
}

/** Registra el vídeo ya guardado en disco y encola su transcripción + IA. */
export function createMedia(m: {
  id: string;
  workspaceId: string;
  filename: string;
  originalName: string;
  mime: string;
  size: number;
}) {
  tx(() => {
    assertWithinLimit(m.workspaceId, "videosPerMonth");
    addUsage(m.workspaceId, "videos_uploaded", 1);
    // Sin IA en el plan: el vídeo queda listo al momento y el texto lo escribe el usuario
    if (!planHasAi(m.workspaceId)) {
      db.prepare(
        `INSERT INTO media (id, workspace_id, filename, original_name, mime, size, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, 'ready', ?)`,
      ).run(m.id, m.workspaceId, m.filename, m.originalName, m.mime, m.size, Date.now());
      return;
    }
    // Con IA: transcripción + texto, que cuentan para el límite de textos de IA
    assertWithinLimit(m.workspaceId, "aiGenerationsPerMonth");
    addUsage(m.workspaceId, "ai_generations", 1);
    db.prepare(
      `INSERT INTO media (id, workspace_id, filename, original_name, mime, size, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 'queued', ?)`,
    ).run(m.id, m.workspaceId, m.filename, m.originalName, m.mime, m.size, Date.now());
    enqueue("process_media", m.id, m.workspaceId);
  });
}

export function getMedia(workspaceId: string, id: string) {
  return db.prepare("SELECT * FROM media WHERE id = ? AND workspace_id = ?").get(id, workspaceId) as Media | undefined;
}

export function hasAnyMedia(workspaceId: string) {
  return !!db.prepare("SELECT 1 FROM media WHERE workspace_id = ? LIMIT 1").get(workspaceId);
}

/** Vuelve a generar el texto (y a transcribir si no había transcripción). No hace nada si ya está en marcha. */
export function requestRegenerate(workspaceId: string, id: string) {
  return tx(() => {
    const media = getMedia(workspaceId, id);
    if (!media) return null;
    // Free no incluye IA (transcripción ni texto): se corta aquí, antes de encolar nada
    if (!planHasAi(workspaceId)) throw planLimitError("aiGenerationsPerMonth", 0);
    if (media.status === "queued" || media.status === "transcribing" || media.status === "generating") return media;
    if (media.size === 0 && !media.transcript) throw badRequest("El fichero de este vídeo ya se borró. Súbelo de nuevo.");
    assertWithinLimit(workspaceId, "aiGenerationsPerMonth");
    addUsage(workspaceId, "ai_generations", 1);
    db.prepare("UPDATE media SET status = 'queued', error = NULL WHERE id = ?").run(id);
    enqueue("process_media", id, workspaceId);
    return { ...media, status: "queued" as const };
  });
}

/** Borra ficheros de vídeo cuya fila ya no existe (p. ej. tras borrar una cuenta de usuario). */
export function deleteMediaFiles(filenames: string[]) {
  for (const f of filenames) {
    fs.rm(path.join(UPLOAD_DIR, path.basename(f)), { force: true }, () => {});
  }
}
