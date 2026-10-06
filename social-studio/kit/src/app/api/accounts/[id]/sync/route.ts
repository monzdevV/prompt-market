import { ApiError, intParam, notFound, withSession } from "@/lib/api";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { requestSync } from "@/lib/sync";

/** Sincronizar ahora una cuenta del propio espacio (solo encola; limitado para no gastar la cuota compartida). */
export const POST = withSession(async (_req, s, ctx: RouteContext<"/api/accounts/[id]/sync">) => {
  const id = intParam((await ctx.params).id);
  // Primero que la cuenta sea suya: ids inventados no crean contadores en memoria
  if (!db.prepare("SELECT 1 FROM accounts WHERE id = ? AND workspace_id = ?").get(id, s.workspaceId)) throw notFound("La cuenta");
  const rl = rateLimit(`sync-account:${s.workspaceId}:${id}`, 4, 60 * 60_000);
  if (!rl.ok) throw new ApiError(429, "rate_limited", "Esta cuenta se sincronizó hace poco. Prueba más tarde.");
  if (requestSync(s.workspaceId, [id]) === 0) throw notFound("La cuenta");
  return Response.json({ queued: true }, { status: 202 });
});
