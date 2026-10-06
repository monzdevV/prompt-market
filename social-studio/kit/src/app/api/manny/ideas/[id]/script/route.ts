import { ApiError, withSession } from "@/lib/api";
import { withManny } from "@/lib/manny/errors";
import { ideaToScript } from "@/lib/manny/ideas";
import { rateLimit } from "@/lib/rate-limit";

export const maxDuration = 240;

/** Convierte una idea en un guion completo. */
export const POST = withSession(async (_req, s, ctx: RouteContext<"/api/manny/ideas/[id]/script">) => {
  const rl = rateLimit(`manny-script:${s.workspaceId}`, 20, 60 * 60_000);
  if (!rl.ok) throw new ApiError(429, "rate_limited", "Ya has pedido muchos guiones esta hora. Espera un poco.");
  const id = await withManny(async () => ideaToScript(s.workspaceId, (await ctx.params).id));
  return Response.json({ id });
});
