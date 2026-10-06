import { z } from "zod";
import { ApiError, parseJson, withSession } from "@/lib/api";
import { draftScript } from "@/lib/manny/chat";
import { withManny } from "@/lib/manny/errors";
import { rateLimit } from "@/lib/rate-limit";

const Body = z.object({ idea: z.string().trim().max(1000, "La idea es demasiado larga (máx. 1.000)").default("") });

/** Manny escribe un guion nuevo y lo guarda en «Guiones». */
export const POST = withSession(async (req, s) => {
  const { idea } = await parseJson(req, Body);
  const rl = rateLimit(`manny-script:${s.workspaceId}`, 20, 60 * 60_000);
  if (!rl.ok) throw new ApiError(429, "rate_limited", "Ya has pedido muchos guiones esta hora. Espera un poco.");
  const id = await withManny(() => draftScript(s.workspaceId, idea));
  return Response.json({ id });
});
