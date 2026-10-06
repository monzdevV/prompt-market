import { z } from "zod";
import { ApiError, parseJson, withSession } from "@/lib/api";
import { audit } from "@/lib/audit";
import { rateLimit } from "@/lib/rate-limit";
import { inviteToTeam } from "@/lib/team";

const Body = z.object({ email: z.email("El email no es válido").max(254) });

/** La persona dueña invita a alguien a su espacio de trabajo. */
export const POST = withSession(async (req, s) => {
  if (!rateLimit(`team-invite:${s.workspaceId}`, 20, 24 * 3600_000).ok) throw new ApiError(429, "rate_limited", "Has enviado muchas invitaciones hoy.");
  const { email } = await parseJson(req, Body);
  await inviteToTeam(s.workspaceId, s.userId, email);
  audit({ workspaceId: s.workspaceId, actorUserId: s.userId, action: "team.invite", targetType: "email", targetId: email.toLowerCase() });
  return Response.json({ ok: true });
});
