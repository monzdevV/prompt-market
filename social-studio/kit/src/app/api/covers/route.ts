import { badRequest, withSession } from "@/lib/api";
import { MAX_COVER_BYTES, saveCover } from "@/lib/covers";
import { ApiError } from "@/lib/errors";
import { rateLimit } from "@/lib/rate-limit";

/** Sube una imagen de portada (el cuerpo es la imagen tal cual: JPEG o PNG, máx. 2 MB). Devuelve su id. */
export const POST = withSession(async (req, s) => {
  const rl = rateLimit(`cover:${s.workspaceId}`, 60, 60 * 60_000);
  if (!rl.ok) throw new ApiError(429, "rate_limited", "Has subido muchas portadas seguidas. Espera un poco.");
  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > MAX_COVER_BYTES) throw badRequest("La portada no puede pasar de 2 MB (límite de YouTube)");
  const buf = Buffer.from(await req.arrayBuffer());
  return Response.json({ coverId: saveCover(s.workspaceId, buf) }, { status: 201 });
});
