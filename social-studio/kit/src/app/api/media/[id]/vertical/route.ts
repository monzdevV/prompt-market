import { withSession } from "@/lib/api";
import { requestVertical } from "@/lib/convert";
import { ApiError } from "@/lib/errors";
import { rateLimit } from "@/lib/rate-limit";

/** Crea (o devuelve si ya existe) la versión vertical 9:16 del vídeo. La conversión va en la cola. */
export const POST = withSession(async (_req, s, ctx: RouteContext<"/api/media/[id]/vertical">) => {
  const rl = rateLimit(`vertical:${s.workspaceId}`, 20, 60 * 60_000);
  if (!rl.ok) throw new ApiError(429, "rate_limited", "Has pedido muchas conversiones seguidas. Espera un poco.");
  const media = requestVertical(s.workspaceId, (await ctx.params).id);
  return Response.json({ id: media.id, status: media.status }, { status: 202 });
});
