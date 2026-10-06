import fs from "node:fs";
import path from "node:path";
import { backup } from "node:sqlite";
import { DATA_DIR, db, rawDb, UPLOAD_DIR } from "./db";
import { log } from "./log";

/**
 * Tareas de mantenimiento de la instalación: copias de seguridad y limpieza de vídeos.
 */
export const BACKUP_DIR = path.join(DATA_DIR, "backups");

/**
 * Copia en caliente de la base (API de copia de SQLite: consistente aunque haya escrituras y WAL).
 * nodejs.org/api/sqlite.html#sqlitebackupsourcedb-path-options (Node ≥ 23.8 / 22.16)
 */
export async function backupDatabase(now = new Date(), opts: { onlyIfMissing?: boolean } = {}) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const name = `studio-${now.toISOString().slice(0, 10)}.db`;
  const dest = path.join(BACKUP_DIR, name);
  // Al arrancar: si hoy ya hay copia no se pisa (cada reinicio no debe sustituir la copia buena del día)
  if (opts.onlyIfMissing && fs.existsSync(dest)) return dest;
  const tmp = `${dest}.tmp`;
  fs.rmSync(tmp, { force: true });
  await backup(rawDb(), tmp, { rate: 100 });
  fs.renameSync(tmp, dest);
  // Rotación: se conservan las últimas N copias
  const keep = Number(process.env.BACKUP_KEEP) || 14;
  const all = fs
    .readdirSync(BACKUP_DIR)
    .filter((f) => /^studio-\d{4}-\d{2}-\d{2}\.db$/.test(f))
    .sort();
  for (const old of all.slice(0, Math.max(0, all.length - keep))) fs.rmSync(path.join(BACKUP_DIR, old), { force: true });
  log.info("maintenance.backup_done", { file: name, kept: Math.min(all.length, keep) });
  return dest;
}

/**
 * Borra el FICHERO de vídeos antiguos que ya no se van a volver a usar, para liberar espacio.
 * Solo si el vídeo tiene publicaciones y TODAS están resueltas: cada destino de cada publicación no
 * borrada está «publicado» (o la publicación se borró). Un borrador, un destino fallido (se puede
 * reintentar) o uno pendiente conservan el fichero. Se conserva la fila (transcripción, texto y métricas).
 */
export function purgeOldUploads(retentionDays = Number(process.env.UPLOAD_RETENTION_DAYS) || 30) {
  const cutoff = Date.now() - retentionDays * 24 * 3600_000;
  const rows = db
    .prepare(
      `SELECT m.id, m.filename FROM media m
       WHERE m.size > 0 AND m.created_at < ?
         AND m.status NOT IN ('queued', 'transcribing', 'generating')
         AND EXISTS (SELECT 1 FROM posts p WHERE p.media_id = m.id)
         AND NOT EXISTS (
           SELECT 1 FROM posts p JOIN post_targets t ON t.post_id = p.id
           WHERE p.media_id = m.id AND p.deleted_at IS NULL AND t.status != 'published'
         )`,
    )
    .all(cutoff) as { id: string; filename: string }[];
  for (const r of rows) {
    fs.rmSync(path.join(UPLOAD_DIR, path.basename(r.filename)), { force: true });
    db.prepare("UPDATE media SET size = 0 WHERE id = ?").run(r.id);
  }
  // Ficheros huérfanos (subidas interrumpidas sin fila) de más de un día
  const known = new Set((db.prepare("SELECT filename FROM media").all() as { filename: string }[]).map((r) => r.filename));
  let orphans = 0;
  for (const f of fs.existsSync(UPLOAD_DIR) ? fs.readdirSync(UPLOAD_DIR) : []) {
    const full = path.join(UPLOAD_DIR, f);
    if (!known.has(f) && fs.statSync(full).mtimeMs < Date.now() - 24 * 3600_000) {
      fs.rmSync(full, { force: true });
      orphans++;
    }
  }
  if (rows.length || orphans) log.info("maintenance.uploads_purged", { files: rows.length, orphans });
  return { files: rows.length, orphans };
}

/** Espacio libre en el disco de datos (para /api/health). */
export function freeDiskBytes() {
  try {
    const s = fs.statfsSync(DATA_DIR);
    return s.bavail * s.bsize;
  } catch {
    return null;
  }
}
