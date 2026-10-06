import { withSession } from "@/lib/api";
import { removeTracked } from "@/lib/manny/radar";

export const DELETE = withSession(async (_req, s, ctx: RouteContext<"/api/manny/radar/[id]">) => {
  removeTracked(s.workspaceId, (await ctx.params).id);
  return Response.json({ ok: true });
});
