import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { DATA_DIR } from "./db";
import { badRequest } from "./errors";

/**
 * Imágenes de portada que sube el usuario (o el fotograma que el navegador captura del vídeo).
 * Se guardan fuera de uploads/ (esa carpeta la limpia la purga de vídeos) en data/covers/<espacio>/.
 * Nunca se sobrescriben: cada portada es un fichero nuevo, así una publicación programada
 * conserva la suya aunque el usuario elija otra para la siguiente.
 */
export const COVER_DIR = path.join(DATA_DIR, "covers");
/** Límite de YouTube para miniaturas personalizadas: 2 MB (Facebook admite 10 MB) */
export const MAX_COVER_BYTES = 2 * 1024 * 1024;
const COVER_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png)$/;

function sniff(buf: Buffer): "jpg" | "png" | null {
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpg";
  if (buf.length > 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  return null;
}

/** Guarda la imagen (JPEG o PNG, comprobado por su contenido, no por el nombre) y devuelve su id. */
export function saveCover(workspaceId: string, buf: Buffer) {
  if (!buf.length) throw badRequest("La imagen está vacía");
  if (buf.length > MAX_COVER_BYTES) throw badRequest("La portada no puede pasar de 2 MB (límite de YouTube)");
  const ext = sniff(buf);
  if (!ext) throw badRequest("La portada tiene que ser una imagen JPG o PNG");
  const id = `${randomUUID()}.${ext}`;
  const dir = path.join(COVER_DIR, path.basename(workspaceId));
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, id), buf);
  return id;
}

/** Valida que la portada existe y es de ese espacio. Devuelve la ruta relativa que se guarda en posts.cover_file. */
export function coverFileFor(workspaceId: string, coverId: string) {
  if (!COVER_ID.test(coverId)) throw badRequest("Portada no válida");
  const rel = `${path.basename(workspaceId)}/${coverId}`;
  if (!fs.existsSync(path.join(COVER_DIR, rel))) throw badRequest("La portada ya no existe: vuelve a elegirla");
  return rel;
}

export function coverPath(rel: string | null) {
  if (!rel) return null;
  const [ws, file] = rel.split("/");
  if (!ws || !file || !COVER_ID.test(file)) return null;
  const full = path.join(COVER_DIR, path.basename(ws), file);
  return fs.existsSync(full) ? full : null;
}

export const coverMime = (full: string) => (full.endsWith(".png") ? "image/png" : "image/jpeg");
