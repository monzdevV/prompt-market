import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { Readable, Transform } from "node:stream";
import type { ReadableStream as NodeReadableStream } from "node:stream/web";
import { pipeline } from "node:stream/promises";
import { UPLOAD_DIR } from "@/lib/db";
import { ApiError, assertSameOrigin, badRequest, errorResponse, unauthorized } from "@/lib/api";
import { log } from "@/lib/log";
import { ALLOWED_EXTENSIONS, createMedia, looksLikeVideo, maxUploadBytes, reserveStorage, safeOriginalName, storageQuotaBytes, usedStorageBytes } from "@/lib/media";
import { assertWithinLimit } from "@/lib/plans";
import { rateLimit } from "@/lib/rate-limit";
import { getSession } from "@/lib/session";

const tooLarge = () =>
  new ApiError(413, "too_large", `El vídeo supera el máximo de ${Math.round(maxUploadBytes() / 1024 / 1024)} MB`);

/**
 * Recibe el vídeo como cuerpo binario (sin multipart) y lo guarda en disco en streaming.
 * Queda fuera del proxy para que el vídeo no pase por memoria: la sesión se comprueba aquí.
 */
export async function POST(request: Request) {
  let dest: string | null = null;
  let release: (() => void) | null = null;
  try {
    assertSameOrigin(request);
    const session = await getSession();
    if (!session) throw unauthorized();
    const rl = rateLimit(`upload:${session.workspaceId}`, 30, 60 * 60_000);
    if (!rl.ok) throw new ApiError(429, "rate_limited", "Has subido muchos vídeos seguidos. Espera un poco.");
    if (!request.body) throw badRequest("Falta el vídeo");

    // Antes de recibir nada: ¿le quedan vídeos este mes? (se vuelve a comprobar al guardar)
    assertWithinLimit(session.workspaceId, "videosPerMonth");
    const free = storageQuotaBytes(session.workspaceId) - usedStorageBytes(session.workspaceId);
    if (free <= 0) throw new ApiError(413, "quota", "Has llegado al límite de almacenamiento de tu cuenta");
    const max = Math.min(maxUploadBytes(), free);
    const declared = Number(request.headers.get("content-length"));
    if (declared > max) {
      throw declared > maxUploadBytes() ? tooLarge() : new ApiError(413, "quota", "Este vídeo no cabe en el espacio que te queda");
    }

    // Se reserva lo que el navegador dice que envía (y no se acepta ni un byte más); sin tamaño declarado, el máximo
    const allowed = declared > 0 ? Math.min(declared, max) : max;
    release = reserveStorage(session.workspaceId, allowed);

    const originalName = safeOriginalName(request.headers.get("x-filename"));
    const ext = path.extname(originalName).toLowerCase();
    if (!(ALLOWED_EXTENSIONS as readonly string[]).includes(ext)) {
      throw badRequest(`Formato no admitido. Usa ${ALLOWED_EXTENSIONS.join(", ")}`);
    }
    const mime = ext === ".webm" ? "video/webm" : ext === ".mov" ? "video/quicktime" : "video/mp4";

    const id = randomUUID();
    const filename = `${id}${ext}`;
    dest = path.join(UPLOAD_DIR, filename);

    // Cuenta bytes mientras escribe (no nos fiamos de Content-Length) y guarda la cabecera para validarla
    let size = 0;
    let head = Buffer.alloc(0);
    const guard = new Transform({
      transform(chunk: Buffer, _enc, cb) {
        size += chunk.length;
        if (size > allowed) return cb(size > maxUploadBytes() ? tooLarge() : new ApiError(413, "quota", "El vídeo es mayor de lo anunciado o no cabe en tu espacio"));
        if (head.length < 16) head = Buffer.concat([head, chunk.subarray(0, 16 - head.length)]);
        cb(null, chunk);
      },
    });
    await pipeline(Readable.fromWeb(request.body as NodeReadableStream), guard, fs.createWriteStream(dest));

    if (size === 0) throw badRequest("El vídeo está vacío");
    if (!looksLikeVideo(head)) throw badRequest("El archivo no parece un vídeo MP4, MOV o WebM válido");

    createMedia({ id, workspaceId: session.workspaceId, filename, originalName, mime, size });
    log.info("media.uploaded", { mediaId: id, workspaceId: session.workspaceId, size });
    dest = null;
    return Response.json({ id });
  } catch (e) {
    if (e && typeof e === "object" && "code" in e && (e as { code?: string }).code === "ABORT_ERR") {
      e = badRequest("Se cortó la subida");
    }
    return errorResponse(e);
  } finally {
    // Subida fallida o rechazada: no dejamos ficheros a medias
    if (dest) fs.rm(dest, { force: true }, () => {});
    release?.();
  }
}
