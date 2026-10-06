import { ApiError, withSession } from "@/lib/api";
import { rateLimit } from "@/lib/rate-limit";
import { requestSync } from "@/lib/sync";

/** Pide sincronizar ya las cuentas del espacio. Solo encola: la sincronización corre en segundo plano. */
export const POST = withSession(async (_req, s) => {
  const rl = rateLimit(`stats:${s.workspaceId}`, 6, 60 * 60_000);
  if (!rl.ok) throw new ApiError(429, "rate_limited", "Las métricas se actualizaron hace poco. Prueba más tarde.");
  return Response.json({ queued: requestSync(s.workspaceId) }, { status: 202 });
});
