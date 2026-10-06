import { randomUUID } from "node:crypto";
import { db, tx, type User } from "./db";
import { createDefaultBrand } from "./brands";
import { acceptTeamInvite, peekTeamInvite } from "./team";
import { DUMMY_PASSWORD_HASH, hashPassword, randomToken, sha256, verifyPassword } from "./crypto";

/** Lógica de cuentas y sesiones sin dependencias de Next (testeable). Las cookies viven en session.ts. */

export const SESSION_TTL_MS = 30 * 24 * 3600 * 1000;
export const INVITE_TTL_MS = 14 * 24 * 3600 * 1000;

export class AuthError extends Error {
  constructor(
    public code: "email_taken" | "invite_required" | "invite_invalid" | "invalid_credentials",
    message: string,
  ) {
    super(message);
  }
}

export type SessionInfo = {
  userId: string;
  email: string;
  name: string;
  isAdmin: boolean;
  workspaceId: string;
};

export function signupMode(): "open" | "invite" {
  return process.env.SIGNUP_MODE === "open" ? "open" : "invite";
}

export function userCount() {
  return (db.prepare("SELECT COUNT(*) AS n FROM users").get() as { n: number }).n;
}

/** El primer usuario no necesita invitación y queda como administrador. */
export function inviteRequired() {
  return signupMode() === "invite" && userCount() > 0;
}

export async function createUser(input: {
  email: string;
  password: string;
  name: string;
  inviteCode?: string;
  /** Invitación de un equipo: la persona se une a ese espacio en vez de crear el suyo */
  teamCode?: string;
  termsVersion?: string;
}) {
  const passwordHash = await hashPassword(input.password);
  const email = input.email.trim().toLowerCase();
  // Todo lo que decide si se puede crear la cuenta va dentro de la transacción (sin carreras)
  return tx(() => {
    const first = userCount() === 0;
    // El primer usuario es el administrador. Si ADMIN_EMAIL está definido, solo ese email puede serlo
    // (evita que un desconocido se quede la instalación si la app se expone antes de registrarte).
    const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    if (first && adminEmail && email !== adminEmail) {
      throw new AuthError("invite_required", "Necesitas un código de invitación");
    }
    const userId = randomUUID();
    let invite: { code_hash: string } | undefined;
    const team = !first && input.teamCode ? peekTeamInvite(input.teamCode, email) : null;
    if (input.teamCode && !first && !team) throw new AuthError("invite_invalid", "La invitación al equipo no es válida, caducó o es para otro email");
    if (!first && !team && signupMode() === "invite") {
      if (!input.inviteCode) throw new AuthError("invite_required", "Necesitas un código de invitación");
      invite = db
        .prepare("SELECT code_hash FROM invites WHERE code_hash = ? AND used_at IS NULL AND expires_at > ?")
        .get(sha256(input.inviteCode.trim()), Date.now()) as { code_hash: string } | undefined;
      if (!invite) throw new AuthError("invite_invalid", "El código de invitación no es válido o ya se usó");
    }
    // Se comprueba después de la invitación: sin una válida no se puede averiguar qué emails existen
    if (db.prepare("SELECT 1 FROM users WHERE email = ?").get(email)) {
      throw new AuthError("email_taken", "Ya existe una cuenta con ese email");
    }
    const now = Date.now();
    db.prepare(
      "INSERT INTO users (id, email, name, password_hash, is_admin, created_at, terms_accepted_at, terms_version) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    ).run(userId, email, input.name.trim(), passwordHash, first ? 1 : 0, now, input.termsVersion ? now : null, input.termsVersion ?? null);
    if (team) {
      acceptTeamInvite(team, userId);
      return { userId, workspaceId: team.workspace_id };
    }
    const workspaceId = createOwnedWorkspace(userId, input.name.trim() || email);
    if (invite) {
      db.prepare("UPDATE invites SET used_by = ?, used_at = ? WHERE code_hash = ?").run(userId, now, invite.code_hash);
    }
    return { userId, workspaceId };
  });
}

/** Espacio de trabajo propio para un usuario nuevo (con su marca y ajustes por defecto). Llamar dentro de tx. */
export function createOwnedWorkspace(userId: string, name: string) {
  const workspaceId = randomUUID();
  const now = Date.now();
  db.prepare("INSERT INTO workspaces (id, name, owner_id, created_at) VALUES (?, ?, ?, ?)").run(workspaceId, name, userId, now);
  db.prepare("INSERT INTO workspace_members (workspace_id, user_id, role) VALUES (?, ?, 'owner')").run(workspaceId, userId);
  db.prepare("INSERT INTO settings (workspace_id, updated_at) VALUES (?, ?)").run(workspaceId, now);
  createDefaultBrand(workspaceId, name);
  return workspaceId;
}

export async function verifyCredentials(email: string, password: string) {
  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email.trim().toLowerCase()) as User | undefined;
  // Mismo coste con o sin usuario: no revela qué emails están registrados
  const ok = await verifyPassword(password, user?.password_hash ?? DUMMY_PASSWORD_HASH);
  if (!user || !ok) throw new AuthError("invalid_credentials", "Email o contraseña incorrectos");
  return user;
}

export function primaryWorkspace(userId: string) {
  const row = db
    .prepare("SELECT workspace_id FROM workspace_members WHERE user_id = ? ORDER BY role = 'owner' DESC LIMIT 1")
    .get(userId) as { workspace_id: string } | undefined;
  if (!row) throw new AuthError("invalid_credentials", "Tu cuenta ya no pertenece a ningún espacio de trabajo. Pide una nueva invitación.");
  return row.workspace_id;
}

/** Crea una sesión y devuelve el token en claro (solo va a la cookie; en la base queda el hash). */
export function createSession(userId: string, workspaceId: string) {
  const token = randomToken();
  const now = Date.now();
  db.prepare("INSERT INTO sessions (token_hash, user_id, workspace_id, expires_at, created_at) VALUES (?, ?, ?, ?, ?)").run(
    sha256(token),
    userId,
    workspaceId,
    now + SESSION_TTL_MS,
    now,
  );
  return { token, expiresAt: now + SESSION_TTL_MS };
}

export function sessionFromToken(token: string | undefined): SessionInfo | null {
  if (!token) return null;
  const row = db
    .prepare(
      `SELECT s.user_id, s.workspace_id, u.email, u.name, u.is_admin
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       JOIN workspace_members m ON m.workspace_id = s.workspace_id AND m.user_id = s.user_id
       WHERE s.token_hash = ? AND s.expires_at > ?`,
    )
    .get(sha256(token), Date.now()) as
    | { user_id: string; workspace_id: string; email: string; name: string; is_admin: number }
    | undefined;
  if (!row) return null;
  return { userId: row.user_id, workspaceId: row.workspace_id, email: row.email, name: row.name, isAdmin: !!row.is_admin };
}

export function deleteSession(token: string | undefined) {
  if (token) db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(sha256(token));
}

export function purgeExpiredSessions() {
  const now = Date.now();
  db.prepare("DELETE FROM sessions WHERE expires_at <= ?").run(now);
  db.prepare("DELETE FROM oauth_states WHERE expires_at <= ?").run(now);
}

export function createInvite(createdBy: string, note = "") {
  const code = randomToken(9);
  const now = Date.now();
  db.prepare("INSERT INTO invites (code_hash, created_by, note, expires_at, created_at) VALUES (?, ?, ?, ?, ?)").run(
    sha256(code),
    createdBy,
    note.slice(0, 200),
    now + INVITE_TTL_MS,
    now,
  );
  return code;
}
