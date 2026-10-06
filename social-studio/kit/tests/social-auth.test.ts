import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { verifyCredentials } from "@/lib/auth";
import { db } from "@/lib/db";
import { googleIdentity } from "@/lib/platforms/youtube";
import { consumeLoginState, createLoginState, isPlaceholderEmail, safeNextPath, signInWithIdentity } from "@/lib/social-auth";
import { makeUser } from "./helpers";

const mode = process.env.SIGNUP_MODE;
beforeAll(async () => {
  await makeUser(); // ya hay usuarios: los nuevos no son admin
});
afterEach(() => {
  process.env.SIGNUP_MODE = mode;
});

const tiktokId = (subject: string) => ({ provider: "tiktok" as const, subject, email: null, emailVerified: false, name: "Creadora" });
const googleId = (subject: string, email: string, emailVerified = true) => ({ provider: "google" as const, subject, email, emailVerified, name: "Canal" });

describe("Entrar con Google / TikTok", () => {
  it("TikTok crea la cuenta (sin email real ni contraseña) y la siguiente vez entra en la misma", async () => {
    process.env.SIGNUP_MODE = "open";
    const first = signInWithIdentity(tiktokId("open-1"), "v1");
    expect(first.created).toBe(true);
    const user = db.prepare("SELECT email, password_hash, is_admin, terms_version FROM users WHERE id = ?").get(first.userId) as {
      email: string;
      password_hash: string;
      is_admin: number;
      terms_version: string;
    };
    expect(isPlaceholderEmail(user.email)).toBe(true);
    expect(user).toMatchObject({ is_admin: 0, terms_version: "v1" });
    expect(db.prepare("SELECT COUNT(*) AS n FROM workspace_members WHERE user_id = ? AND role = 'owner'").get(first.userId)).toMatchObject({ n: 1 });
    // No se puede entrar con «contraseña» usando el marcador
    await expect(verifyCredentials(user.email, user.password_hash)).rejects.toThrow();

    expect(signInWithIdentity(tiktokId("open-1"), "v1")).toEqual({ userId: first.userId, created: false });
  });

  it("Google con email verificado se enlaza a la cuenta que ya existía con ese email", async () => {
    process.env.SIGNUP_MODE = "open";
    const email = `ya-existo-${Date.now()}@test.dev`;
    const existing = await makeUser(email);
    expect(signInWithIdentity(googleId("g-1", email), "v1")).toEqual({ userId: existing.userId, created: false });
  });

  it("un email NO verificado por Google no da acceso a la cuenta de otra persona", async () => {
    process.env.SIGNUP_MODE = "open";
    const email = `victima-${Date.now()}@test.dev`;
    const victim = await makeUser(email);
    const r = signInWithIdentity(googleId("g-atacante", email, false), "v1");
    expect(r.created).toBe(true);
    expect(r.userId).not.toBe(victim.userId);
  });

  it("con registro por invitación, una identidad nueva no crea cuenta (las ya enlazadas sí entran)", () => {
    process.env.SIGNUP_MODE = "open";
    const known = signInWithIdentity(tiktokId("open-known"), "v1");
    process.env.SIGNUP_MODE = "invite";
    expect(() => signInWithIdentity(tiktokId("open-nueva"), "v1")).toThrow(/invitación/);
    expect(signInWithIdentity(tiktokId("open-known"), "v1").userId).toBe(known.userId);
  });

  it("el state de login es de un solo uso, caduca y va ligado a la red", () => {
    const a = createLoginState("tiktok", false, "/nuevo");
    expect(consumeLoginState(a.state, "youtube")).toBeNull();
    const b = createLoginState("tiktok", false, "/nuevo");
    expect(consumeLoginState(b.state, "tiktok")).toEqual({ codeVerifier: undefined, next: "/nuevo" });
    expect(consumeLoginState(b.state, "tiktok")).toBeNull();
    const c = createLoginState("youtube", true, null);
    expect(c.codeChallenge).toBeTruthy();
    expect(consumeLoginState(c.state, "youtube")?.codeVerifier).toBeTruthy();
  });

  it("solo redirige a rutas internas tras entrar", () => {
    expect(safeNextPath("/nuevo")).toBe("/nuevo");
    expect(safeNextPath("//evil.example")).toBe("/panel");
    expect(safeNextPath("https://evil.example")).toBe("/panel");
    expect(safeNextPath(null)).toBe("/panel");
  });
});

describe("identidad de Google (ID token del endpoint de tokens)", () => {
  const token = (claims: Record<string, unknown>) => `x.${Buffer.from(JSON.stringify(claims)).toString("base64url")}.y`;
  const base = { sub: "123", iss: "https://accounts.google.com", exp: Math.floor(Date.now() / 1000) + 600, email: "A@Gmail.com", email_verified: true };

  it("acepta el de nuestra app y normaliza el email", () => {
    process.env.GOOGLE_CLIENT_ID = "mi-app.apps.googleusercontent.com";
    expect(googleIdentity(token({ ...base, aud: "mi-app.apps.googleusercontent.com" }))).toEqual({
      provider: "google",
      subject: "123",
      email: "a@gmail.com",
      emailVerified: true,
    });
  });

  it("rechaza otro destinatario, otro emisor o uno caducado", () => {
    process.env.GOOGLE_CLIENT_ID = "mi-app.apps.googleusercontent.com";
    expect(googleIdentity(token({ ...base, aud: "otra-app" }))).toBeNull();
    expect(googleIdentity(token({ ...base, aud: "mi-app.apps.googleusercontent.com", iss: "https://evil.example" }))).toBeNull();
    expect(googleIdentity(token({ ...base, aud: "mi-app.apps.googleusercontent.com", exp: 1 }))).toBeNull();
    expect(googleIdentity("basura")).toBeNull();
  });
});
