import { db, tx } from "./db";
import { randomToken, sha256 } from "./crypto";
import { badRequest, ApiError, notFound } from "./errors";
import { sendMail } from "./mailer";
import { APP_URL } from "./platforms/common";
import { limitsFor, planLimitError } from "./plans";

const INVITE_TTL = 7 * 24 * 3600_000;

export function memberRole(workspaceId: string, userId: string) {
  return (db.prepare("SELECT role FROM workspace_members WHERE workspace_id = ? AND user_id = ?").get(workspaceId, userId) as
    | { role: "owner" | "member" }
    | undefined)?.role ?? null;
}

export function assertOwner(workspaceId: string, userId: string) {
  if (memberRole(workspaceId, userId) !== "owner") throw new ApiError(403, "forbidden", "Solo la persona dueña del espacio puede hacer esto");
}

export function listTeam(workspaceId: string) {
  const members = db
    .prepare(
      `SELECT u.id, u.email, u.name, m.role FROM workspace_members m JOIN users u ON u.id = m.user_id
       WHERE m.workspace_id = ? ORDER BY m.role = 'owner' DESC, u.name`,
    )
    .all(workspaceId) as { id: string; email: string; name: string; role: "owner" | "member" }[];
  const invites = db
    .prepare("SELECT email, expires_at, created_at FROM workspace_invites WHERE workspace_id = ? AND used_at IS NULL AND expires_at > ? ORDER BY created_at DESC")
    .all(workspaceId, Date.now()) as { email: string; expires_at: number; created_at: number }[];
  return { members, invites };
}

/** Invita a alguien a TU espacio (se une a él al registrarse con el enlace). Cuenta para el límite de miembros del plan. */
export async function inviteToTeam(workspaceId: string, byUserId: string, rawEmail: string) {
  const email = rawEmail.trim().toLowerCase();
  const code = tx(() => {
    assertOwner(workspaceId, byUserId);
    const { members, invites } = listTeam(workspaceId);
    const limit = limitsFor(workspaceId).teamMembers;
    if (members.length + invites.length + 1 > limit) throw planLimitError("teamMembers", limit);
    if (members.some((m) => m.email === email)) throw badRequest("Esa persona ya está en tu equipo");
    if (db.prepare("SELECT 1 FROM users WHERE email = ?").get(email)) {
      // Unirse a un segundo espacio con una cuenta existente llegará con el selector de espacios
      throw badRequest("Ese email ya tiene una cuenta en Manny. De momento cada cuenta pertenece a un único espacio.");
    }
    db.prepare("DELETE FROM workspace_invites WHERE workspace_id = ? AND email = ? AND used_at IS NULL").run(workspaceId, email);
    const c = randomToken(12);
    db.prepare(
      "INSERT INTO workspace_invites (code_hash, workspace_id, email, created_by, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    ).run(sha256(c), workspaceId, email, byUserId, Date.now() + INVITE_TTL, Date.now());
    return c;
  });
  const ws = db.prepare("SELECT name FROM workspaces WHERE id = ?").get(workspaceId) as { name: string };
  await sendMail({
    to: email,
    subject: `Te han invitado a ${ws.name} en Manny`,
    text: `Hola:\n\nTe han invitado a colaborar en «${ws.name}» en Manny.\nCrea tu cuenta con este enlace (caduca en 7 días):\n${APP_URL()}/registro?equipo=${code}\n`,
  });
  return code;
}

/** Invitación de equipo válida para ese email, o null. (Dentro de la transacción de registro.) */
export function peekTeamInvite(code: string, email: string) {
  const row = db
    .prepare("SELECT code_hash, workspace_id, email FROM workspace_invites WHERE code_hash = ? AND used_at IS NULL AND expires_at > ?")
    .get(sha256(code.trim()), Date.now()) as { code_hash: string; workspace_id: string; email: string } | undefined;
  if (!row || row.email.toLowerCase() !== email) return null;
  return row;
}

/** Marca la invitación como usada y añade al usuario (ya creado) como miembro del espacio. */
export function acceptTeamInvite(invite: { code_hash: string; workspace_id: string }, userId: string) {
  db.prepare("UPDATE workspace_invites SET used_at = ? WHERE code_hash = ?").run(Date.now(), invite.code_hash);
  db.prepare("INSERT INTO workspace_members (workspace_id, user_id, role) VALUES (?, ?, 'member')").run(invite.workspace_id, userId);
}

export function removeMember(workspaceId: string, byUserId: string, memberId: string) {
  tx(() => {
    assertOwner(workspaceId, byUserId);
    const role = memberRole(workspaceId, memberId);
    if (!role) throw notFound("Ese miembro");
    if (role === "owner") throw badRequest("No puedes quitar a la persona dueña del espacio");
    db.prepare("DELETE FROM workspace_members WHERE workspace_id = ? AND user_id = ?").run(workspaceId, memberId);
    // Sin espacio, sus sesiones dejan de valer (sessionFromToken exige pertenencia)
    db.prepare("DELETE FROM sessions WHERE user_id = ? AND workspace_id = ?").run(memberId, workspaceId);
  });
}
