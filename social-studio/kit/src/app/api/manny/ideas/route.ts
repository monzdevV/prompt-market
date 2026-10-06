import { z } from "zod";
import { ApiError, parseJson, withSession } from "@/lib/api";
import { withManny } from "@/lib/manny/errors";
import { generateIdeas } from "@/lib/manny/ideas";
import { rateLimit } from "@/lib/rate-limit";

export const maxDuration = 240;

const Body = z.object({
  tema: z.string().trim().max(300, "El tema es demasiado largo (máx. 300)").default(""),
  cuantas: z.number().int().min(1).max(10).default(6),
  desdeRadar: z.boolean().default(false),
});

/** Manny escribe ideas nuevas y las guarda en el banco. */
export const POST = withSession(async (req, s) => {
  const body = await parseJson(req, Body);
  const rl = rateLimit(`manny-ideas:${s.workspaceId}`, 20, 60 * 60_000);
  if (!rl.ok) throw new ApiError(429, "rate_limited", "Has pedido muchas ideas esta hora. Espera un poco.");
  return Response.json({ ids: await withManny(() => generateIdeas(s.workspaceId, body)) });
});
