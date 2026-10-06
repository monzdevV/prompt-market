import { z } from "zod";
import { parseJson, withSession } from "@/lib/api";
import { deleteIdea, IDEA_STATUSES, setIdeaStatus } from "@/lib/manny/ideas";

const Body = z.object({ status: z.enum(IDEA_STATUSES, "Estado no válido") });

export const POST = withSession(async (req, s, ctx: RouteContext<"/api/manny/ideas/[id]">) => {
  const { status } = await parseJson(req, Body);
  setIdeaStatus(s.workspaceId, (await ctx.params).id, status);
  return Response.json({ ok: true });
});

export const DELETE = withSession(async (_req, s, ctx: RouteContext<"/api/manny/ideas/[id]">) => {
  deleteIdea(s.workspaceId, (await ctx.params).id);
  return Response.json({ ok: true });
});
