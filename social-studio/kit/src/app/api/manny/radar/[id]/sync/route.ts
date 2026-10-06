import { ApiError, withSession } from "@/lib/api";
import { withManny } from "@/lib/manny/errors";
import { syncTracked } from "@/lib/manny/radar";
import { rateLimit } from "@/lib/rate-limit";

export const maxDuration = 180;

/** Lee la cuenta en TikTok o YouTube y guarda sus últimos vídeos con métricas. */
export const POST = withSession(async (_req, s, ctx: RouteContext<"/api/manny/radar/[id]/sync">) => {
  const rl = rateLimit(`manny-sync:${s.workspaceId}`, 120, 60 * 60_000);
  if (!rl.ok) throw new ApiError(429, "rate_limited", "Has actualizado muchas cuentas esta hora. Espera un poco.");
  return Response.json(await withManny(async () => syncTracked(s.workspaceId, (await ctx.params).id)));
});
