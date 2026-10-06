import { z } from "zod";
import { ApiError, badRequest, withSession } from "@/lib/api";
import { withManny } from "@/lib/manny/errors";
import { searchYoutube } from "@/lib/manny/social";
import { rateLimit } from "@/lib/rate-limit";

export const maxDuration = 120;

const Query = z.object({
  q: z.string().trim().min(2, "Escribe al menos 2 letras").max(120, "La búsqueda es demasiado larga"),
  short: z.enum(["0", "1"]).default("1"),
});

/** Busca vídeos en YouTube para sacar ideas. TikTok no deja buscar desde fuera. */
export const GET = withSession(async (req, s) => {
  const url = new URL(req.url);
  const q = Query.safeParse({ q: url.searchParams.get("q") ?? "", short: url.searchParams.get("short") ?? undefined });
  if (!q.success) throw badRequest(q.error.issues[0]?.message ?? "Búsqueda no válida");
  const rl = rateLimit(`manny-search:${s.workspaceId}`, 40, 60 * 60_000);
  if (!rl.ok) throw new ApiError(429, "rate_limited", "Has hecho muchas búsquedas esta hora. Espera un poco.");
  const videos = await withManny(() => searchYoutube(q.data.q, { onlyShort: q.data.short === "1" }));
  return Response.json({ videos });
});
