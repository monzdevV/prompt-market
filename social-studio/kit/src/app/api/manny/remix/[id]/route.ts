import { withSession } from "@/lib/api";
import { deleteRemix } from "@/lib/manny/remix";

export const DELETE = withSession(async (_req, s, ctx: RouteContext<"/api/manny/remix/[id]">) => {
  deleteRemix(s.workspaceId, (await ctx.params).id);
  return Response.json({ ok: true });
});
