import { z } from "zod";
import { ApiError, intParam, parseJson, withSession } from "@/lib/api";
import { deletePost, postAccountIds, publishNow, reschedulePost, retryFailed } from "@/lib/posts";
import { requestSync } from "@/lib/sync";
import { rateLimit } from "@/lib/rate-limit";

const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("retry") }),
  z.object({ action: z.literal("stats") }),
  z.object({ action: z.literal("publish-now") }),
  z.object({ action: z.literal("reschedule"), scheduledAt: z.number().int() }),
]);

export const POST = withSession(async (req, s, ctx: RouteContext<"/api/posts/[id]">) => {
  const id = intParam((await ctx.params).id);
  const body = await parseJson(req, Body);
  switch (body.action) {
    case "retry":
      retryFailed(s.workspaceId, id);
      break;
    case "publish-now":
      publishNow(s.workspaceId, id);
      break;
    case "reschedule":
      reschedulePost(s.workspaceId, id, body.scheduledAt);
      break;
    case "stats": {
      // Cada consulta gasta cuota de las APIs de las redes
      const rl = rateLimit(`stats-post:${s.workspaceId}`, 30, 60 * 60_000);
      if (!rl.ok) throw new ApiError(429, "rate_limited", "Espera un poco antes de volver a actualizar las métricas");
      // Se encola la sincronización de las cuentas de esta publicación (no se bloquea la petición)
      requestSync(s.workspaceId, postAccountIds(s.workspaceId, id));
      break;
    }
  }
  return Response.json({ ok: true });
});

/** Borra la publicación de la app (no la borra de las redes donde ya salió). */
export const DELETE = withSession(async (_req, s, ctx: RouteContext<"/api/posts/[id]">) => {
  deletePost(s.workspaceId, intParam((await ctx.params).id));
  return Response.json({ ok: true });
});
