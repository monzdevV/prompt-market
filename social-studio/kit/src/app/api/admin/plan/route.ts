import { z } from "zod";
import { ApiError, notFound, parseJson, withSession } from "@/lib/api";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";

const Body = z.object({ workspaceId: z.string().min(1).max(100), plan: z.enum(["free", "pro", "business"]) });

/** Cambio manual de plan por el administrador (hasta activar Stripe, o para cortesías). */
export const POST = withSession(async (req, s) => {
  if (!s.isAdmin) throw new ApiError(403, "forbidden", "Solo para administradores");
  const { workspaceId, plan } = await parseJson(req, Body);
  const r = db.prepare("UPDATE workspaces SET plan = ?, plan_source = 'manual' WHERE id = ?").run(plan, workspaceId);
  if (r.changes !== 1) throw notFound("El espacio de trabajo");
  audit({ workspaceId, actorUserId: s.userId, action: "plan.change_manual", meta: { plan } });
  return Response.json({ ok: true });
});
