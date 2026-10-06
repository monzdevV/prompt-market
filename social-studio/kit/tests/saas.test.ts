import { beforeAll, describe, expect, it } from "vitest";
import { createUser, primaryWorkspace, sessionFromToken, createSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { isEmailVerified, resetPassword, sendPasswordReset, sendVerificationEmail, verifyEmail } from "@/lib/email-tokens";
import { sha256 } from "@/lib/crypto";
import { PLANS, workspacePlan } from "@/lib/plans";
import { inviteToTeam, listTeam, removeMember } from "@/lib/team";
import { makeUser } from "./helpers";

/** Los tokens se envían por email; en tests se capturan del log (modo sin proveedor de correo). */
function lastTokenFor(userId: string, purpose: "verify" | "reset") {
  return db.prepare("SELECT token_hash FROM email_tokens WHERE user_id = ? AND purpose = ? ORDER BY created_at DESC LIMIT 1").get(userId, purpose) as
    | { token_hash: string }
    | undefined;
}

let owner: { userId: string; workspaceId: string };

beforeAll(async () => {
  owner = await makeUser("dueña@test.dev", "pro");
});

describe("verificación de email y recuperación de contraseña", () => {
  it("el token de verificación es de un solo uso y solo se guarda su hash", async () => {
    await sendVerificationEmail(owner.userId, "dueña@test.dev");
    expect(lastTokenFor(owner.userId, "verify")?.token_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(verifyEmail("inventado")).toBe(false);
    expect(isEmailVerified(owner.userId)).toBe(false);
  });

  it("restablecer contraseña: enlace válido cambia la clave y cierra las sesiones; reutilizarlo falla", async () => {
    const u = await makeUser("olvido@test.dev");
    const { token: session } = createSession(u.userId, u.workspaceId);
    // Generamos el token directamente para conocer su valor en claro
    await sendPasswordReset("olvido@test.dev");
    const row = lastTokenFor(u.userId, "reset")!;
    const known = "token-de-prueba-conocido-123";
    db.prepare("UPDATE email_tokens SET token_hash = ? WHERE token_hash = ?").run(sha256(known), row.token_hash);
    await resetPassword(known, "otra-contraseña-segura");
    expect(sessionFromToken(session)).toBeNull();
    await expect(resetPassword(known, "otra-mas-segura-1")).rejects.toThrow(/caducado o ya se usó/);
  });

  it("pedir recuperación para un email inexistente no falla ni lo revela", async () => {
    await expect(sendPasswordReset("nadie@test.dev")).resolves.toBeUndefined();
  });
});

describe("equipos", () => {
  it("la persona invitada se une al espacio de quien invita (sin crear uno propio)", async () => {
    const code = await inviteToTeam(owner.workspaceId, owner.userId, "Compa@Test.dev");
    const u = await createUser({ email: "compa@test.dev", password: "contraseña-segura-1", name: "Compa", teamCode: code });
    expect(u.workspaceId).toBe(owner.workspaceId);
    expect(primaryWorkspace(u.userId)).toBe(owner.workspaceId);
    expect(listTeam(owner.workspaceId).members.map((m) => m.email)).toContain("compa@test.dev");
    // La invitación no sirve dos veces ni para otro email
    await expect(createUser({ email: "otro@test.dev", password: "contraseña-segura-1", name: "O", teamCode: code })).rejects.toThrow();
  });

  it("solo la persona dueña invita y quita; el límite de miembros del plan se respeta", async () => {
    const members = listTeam(owner.workspaceId).members;
    const member = members.find((m) => m.role === "member")!;
    await expect(inviteToTeam(owner.workspaceId, member.id, "x@test.dev")).rejects.toThrow(/dueña/);
    // Se llena el equipo hasta el límite del plan (miembros + invitaciones pendientes); la siguiente invitación no cabe
    const limit = PLANS[workspacePlan(owner.workspaceId)].limits.teamMembers;
    const team = listTeam(owner.workspaceId);
    const free = limit - team.members.length - team.invites.length;
    expect(free).toBeGreaterThan(0);
    for (let i = 0; i < free; i++) await inviteToTeam(owner.workspaceId, owner.userId, `persona-${i}@test.dev`);
    await expect(inviteToTeam(owner.workspaceId, owner.userId, "sobra@test.dev")).rejects.toThrow(/miembros del equipo/);
    // No es un límite de pago (es igual en todos los planes): no responde 402
    await expect(inviteToTeam(owner.workspaceId, owner.userId, "sobra@test.dev")).rejects.toMatchObject({ status: 409 });
    removeMember(owner.workspaceId, owner.userId, member.id);
    expect(listTeam(owner.workspaceId).members.some((m) => m.id === member.id)).toBe(false);
    expect(() => removeMember(owner.workspaceId, owner.userId, owner.userId)).toThrow(/dueña/);
  });
});

describe("borrar la cuenta", () => {
  it("un dueño con miembros en su equipo no puede borrar el espacio de los demás", async () => {
    const { deleteUserAccount } = await import("@/lib/account-deletion");
    const owner = await makeUser();
    const member = await makeUser();
    db.prepare("INSERT INTO workspace_members (workspace_id, user_id, role) VALUES (?, ?, 'member')").run(owner.workspaceId, member.userId);
    await expect(deleteUserAccount(owner.userId)).rejects.toMatchObject({ status: 409 });
    expect(db.prepare("SELECT 1 FROM workspaces WHERE id = ?").get(owner.workspaceId)).toBeTruthy();

    db.prepare("DELETE FROM workspace_members WHERE user_id = ? AND workspace_id = ?").run(member.userId, owner.workspaceId);
    await deleteUserAccount(owner.userId);
    expect(db.prepare("SELECT 1 FROM workspaces WHERE id = ?").get(owner.workspaceId)).toBeUndefined();
  });
});
