import { z } from "zod";
import { ApiError, parseJson, withSession } from "@/lib/api";
import { clearMessages, sendMessage } from "@/lib/manny/chat";
import { withManny } from "@/lib/manny/errors";
import { rateLimit } from "@/lib/rate-limit";

const Body = z.object({ message: z.string().trim().min(1, "Escribe algo para Manny").max(4000, "El mensaje es demasiado largo (máx. 4.000)") });

export const POST = withSession(async (req, s) => {
  const { message } = await parseJson(req, Body);
  // Cada mensaje gasta del límite de tu plan de Claude
  const rl = rateLimit(`manny:${s.workspaceId}`, 40, 60 * 60_000);
  if (!rl.ok) throw new ApiError(429, "rate_limited", "Has hablado mucho con Manny esta hora. Espera un poco.");
  return Response.json(await withManny(() => sendMessage(s.workspaceId, message)));
});

export const DELETE = withSession(async (_req, s) => {
  clearMessages(s.workspaceId);
  return Response.json({ ok: true });
});
