import { z } from "zod";
import { intParam, parseJson, withSession } from "@/lib/api";
import { resolveReview } from "@/lib/posts";

const Body = z.object({
  outcome: z.enum(["published", "not_published"]),
  url: z
    .url("El enlace no es válido")
    .max(500)
    .refine((u) => u.startsWith("https://"), "El enlace debe empezar por https://")
    .optional(),
});

/** El usuario confirma si un destino dudoso llegó a publicarse. */
export const POST = withSession(async (req, s, ctx: RouteContext<"/api/targets/[id]/review">) => {
  const body = await parseJson(req, Body);
  resolveReview(s.workspaceId, intParam((await ctx.params).id), body.outcome, body.url);
  return Response.json({ ok: true });
});
