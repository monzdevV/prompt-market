import { withSession } from "@/lib/api";
import { audit } from "@/lib/audit";
import { removeMember } from "@/lib/team";

export const DELETE = withSession(async (_req, s, ctx: RouteContext<"/api/team/members/[id]">) => {
  const memberId = (await ctx.params).id;
  removeMember(s.workspaceId, s.userId, memberId);
  audit({ workspaceId: s.workspaceId, actorUserId: s.userId, action: "team.remove", targetType: "user", targetId: memberId });
  return Response.json({ ok: true });
});
