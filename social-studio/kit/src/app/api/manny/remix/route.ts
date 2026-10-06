import { z } from "zod";
import { ApiError, parseJson, withSession } from "@/lib/api";
import { withManny } from "@/lib/manny/errors";
import { createRemix } from "@/lib/manny/remix";
import { rateLimit } from "@/lib/rate-limit";

export const maxDuration = 300;

const Body = z.object({
  url: z.string().trim().max(500, "El enlace es demasiado largo").default(""),
  text: z.string().trim().max(4000, "El texto es demasiado largo (máx. 4.000)").default(""),
  note: z.string().trim().max(500, "La nota es demasiado larga (máx. 500)").default(""),
  transcribe: z.boolean().default(true),
});

/** Pega un TikTok o un Short: se lee, se transcribe y Manny escribe tres versiones. */
export const POST = withSession(async (req, s) => {
  const body = await parseJson(req, Body);
  const rl = rateLimit(`manny-remix:${s.workspaceId}`, 30, 60 * 60_000);
  if (!rl.ok) throw new ApiError(429, "rate_limited", "Has analizado muchos vídeos esta hora. Espera un poco.");
  const id = await withManny(() => createRemix(s.workspaceId, body));
  return Response.json({ id });
});
