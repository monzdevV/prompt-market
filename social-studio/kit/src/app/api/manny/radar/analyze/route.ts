import { ApiError, withSession } from "@/lib/api";
import { analyzeRadar } from "@/lib/manny/analyze";
import { withManny } from "@/lib/manny/errors";
import { rateLimit } from "@/lib/rate-limit";

export const maxDuration = 300;

/** Manny lee el radar y escribe qué funciona. */
export const POST = withSession(async (_req, s) => {
  const rl = rateLimit(`manny-analyze:${s.workspaceId}`, 10, 60 * 60_000);
  if (!rl.ok) throw new ApiError(429, "rate_limited", "Has pedido muchos análisis esta hora. Espera un poco.");
  return Response.json(await withManny(() => analyzeRadar(s.workspaceId)));
});
