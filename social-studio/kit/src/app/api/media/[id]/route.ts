import { notFound, withSession } from "@/lib/api";
import { getMedia, requestRegenerate } from "@/lib/media";
import { rateLimit } from "@/lib/rate-limit";
import { ApiError } from "@/lib/errors";
import type { Media } from "@/lib/db";

/** Lo que ve el navegador: sin rutas de disco ni ids internos. */
function toClient(m: Media) {
  return {
    id: m.id,
    status: m.status,
    originalName: m.original_name,
    durationS: m.duration_s,
    transcript: m.transcript,
    ai: m.ai ? JSON.parse(m.ai) : null,
    error: m.error,
  };
}

export const GET = withSession(async (_req, s, ctx: RouteContext<"/api/media/[id]">) => {
  const media = getMedia(s.workspaceId, (await ctx.params).id);
  if (!media) throw notFound("El vídeo");
  return Response.json(toClient(media));
});

/** Vuelve a generar el texto (y transcribe otra vez si la transcripción había fallado). */
export const POST = withSession(async (_req, s, ctx: RouteContext<"/api/media/[id]">) => {
  const rl = rateLimit(`regen:${s.workspaceId}`, 20, 60 * 60_000);
  if (!rl.ok) throw new ApiError(429, "rate_limited", "Has regenerado muchas veces seguidas. Espera un poco.");
  const media = requestRegenerate(s.workspaceId, (await ctx.params).id);
  if (!media) throw notFound("El vídeo");
  return Response.json(toClient(media));
});
