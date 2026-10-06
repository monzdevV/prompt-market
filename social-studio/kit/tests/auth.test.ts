import { describe, expect, it } from "vitest";
import {
  AuthError,
  createInvite,
  createSession,
  createUser,
  deleteSession,
  sessionFromToken,
  verifyCredentials,
} from "@/lib/auth";
import { decryptSecret, encryptSecret, hashPassword, verifyPassword } from "@/lib/crypto";
import { db } from "@/lib/db";

describe("contraseñas y cifrado", () => {
  it("verifica el hash scrypt y rechaza otra contraseña", async () => {
    const h = await hashPassword("una contraseña larga");
    expect(h).not.toContain("una contraseña larga");
    expect(await verifyPassword("una contraseña larga", h)).toBe(true);
    expect(await verifyPassword("otra", h)).toBe(false);
  });

  it("cifra tokens con IV aleatorio y detecta manipulaciones", () => {
    const a = encryptSecret("token-secreto");
    const b = encryptSecret("token-secreto");
    expect(a).not.toBe(b);
    expect(a).not.toContain("token-secreto");
    expect(decryptSecret(a)).toBe("token-secreto");
    const [v, iv, tag, data] = a.split(".");
    // Se cambia un byte real de los datos (no letras del base64: las últimas pueden llevar bits de relleno que no cuentan)
    const bytes = Buffer.from(data, "base64url");
    bytes[0] ^= 0xff;
    const tampered = [v, iv, tag, bytes.toString("base64url")].join(".");
    expect(tampered).not.toBe(a);
    expect(() => decryptSecret(tampered)).toThrow();
    // Y lo mismo con la etiqueta de autenticación
    const badTag = Buffer.from(tag, "base64url");
    badTag[0] ^= 0x01;
    expect(() => decryptSecret([v, iv, badTag.toString("base64url"), data].join("."))).toThrow();
  });
});

describe("registro, invitaciones y sesiones", () => {
  it("el primer usuario es admin y no necesita invitación; el resto sí", async () => {
    const admin = await createUser({ email: "Admin@Test.dev", password: "contraseña-segura-1", name: "Admin" });
    expect((db.prepare("SELECT is_admin FROM users WHERE id = ?").get(admin.userId) as { is_admin: number }).is_admin).toBe(1);

    await expect(createUser({ email: "b@test.dev", password: "contraseña-segura-1", name: "B" })).rejects.toMatchObject({
      code: "invite_required",
    });
    await expect(
      createUser({ email: "b@test.dev", password: "contraseña-segura-1", name: "B", inviteCode: "inventado" }),
    ).rejects.toMatchObject({ code: "invite_invalid" });

    const code = createInvite(admin.userId);
    await createUser({ email: "b@test.dev", password: "contraseña-segura-1", name: "B", inviteCode: code });
    // La invitación es de un solo uso
    await expect(
      createUser({ email: "c@test.dev", password: "contraseña-segura-1", name: "C", inviteCode: code }),
    ).rejects.toMatchObject({ code: "invite_invalid" });
  });

  it("no permite dos cuentas con el mismo email (sin distinguir mayúsculas)", async () => {
    await expect(createUser({ email: "admin@test.dev", password: "x".repeat(12), name: "X" })).rejects.toBeInstanceOf(AuthError);
  });

  it("login: mismo error para email inexistente y contraseña mala", async () => {
    await expect(verifyCredentials("nadie@test.dev", "loquesea")).rejects.toMatchObject({ code: "invalid_credentials" });
    await expect(verifyCredentials("admin@test.dev", "mala")).rejects.toMatchObject({ code: "invalid_credentials" });
    expect((await verifyCredentials(" ADMIN@test.dev ", "contraseña-segura-1")).email).toBe("admin@test.dev");
  });

  it("la sesión solo guarda el hash, caduca y se puede cerrar", async () => {
    const user = await verifyCredentials("admin@test.dev", "contraseña-segura-1");
    const ws = (db.prepare("SELECT workspace_id FROM workspace_members WHERE user_id = ?").get(user.id) as { workspace_id: string })
      .workspace_id;
    const { token } = createSession(user.id, ws);
    expect(db.prepare("SELECT 1 FROM sessions WHERE token_hash = ?").get(token)).toBeUndefined();
    expect(sessionFromToken(token)).toMatchObject({ userId: user.id, workspaceId: ws, isAdmin: true });
    expect(sessionFromToken("inventado")).toBeNull();

    db.prepare("UPDATE sessions SET expires_at = 0").run();
    expect(sessionFromToken(token)).toBeNull();

    const second = createSession(user.id, ws);
    deleteSession(second.token);
    expect(sessionFromToken(second.token)).toBeNull();
  });
});
