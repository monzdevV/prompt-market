import { randomUUID } from "node:crypto";
import { AuthError, createOwnedWorkspace, signupMode, userCount } from "./auth";
import { pkcePair, randomToken, sha256 } from "./crypto";
import { db, tx } from "./db";
import type { SocialIdentity } from "./platforms/common";

/**
 * «Entrar con Google (YouTube)» y «Entrar con TikTok».
 *
 * La misma autorización que conecta la cuenta sirve para identificar a la persona: Google da un ID
 * token (sub + email verificado) y TikTok su open_id (sin email). Así un único clic crea la cuenta
 * de Manny, inicia sesión y deja conectada la red.
 *
 * Seguridad:
 *  - `state` en el servidor, de un solo uso y con caducidad (login_states), ligado a la red.
 *  - La identidad solo se enlaza a una cuenta existente por email si Google dice que está verificado.
 *  - Las cuentas creadas así no tienen contraseña: no se puede entrar con email + contraseña hasta
 *    que la persona se la ponga desde «¿Olvidaste tu contraseña?» (solo si tiene email real).
 */

const STATE_TTL_MS = 10 * 60_000;
/**
 * Cookie que ata el inicio de sesión al navegador que lo empezó. Sin ella, alguien podría empezar un
 * login con SU cuenta de TikTok/Google y enviarte el enlace de vuelta: entrarías en su cuenta sin darte
 * cuenta (CSRF de login). Guarda el mismo `state`; la vuelta solo se acepta si coinciden.
 */
export const LOGIN_COOKIE = "ep_login";
export const loginCookieOptions = (secure: boolean) => ({
  httpOnly: true,
  secure,
  sameSite: "lax" as const,
  path: "/api/oauth",
  maxAge: STATE_TTL_MS / 1000,
});
/** Marca de «sin contraseña»: nunca coincide con un hash scrypt, así que el login con contraseña falla */
export const NO_PASSWORD = "!social";
export const SOCIAL_PROVIDERS = { google: "youtube", tiktok: "tiktok" } as const;
export type SocialProvider = keyof typeof SOCIAL_PROVIDERS;

export function isSocialProvider(v: string): v is SocialProvider {
  return v === "google" || v === "tiktok";
}

/** Solo rutas internas como destino tras entrar (evita redirecciones abiertas). */
export function safeNextPath(next: string | null | undefined) {
  if (!next || !next.startsWith("/") || next.startsWith("//") || /[\\\s]/.test(next)) return "/panel";
  return next.slice(0, 200);
}

export function createLoginState(connector: string, pkce: boolean, next: string | null) {
  const state = randomToken(24);
  const pair = pkce ? pkcePair() : null;
  db.prepare("INSERT INTO login_states (state_hash, connector, code_verifier, next, expires_at) VALUES (?, ?, ?, ?, ?)").run(
    sha256(state),
    connector,
    pair?.verifier ?? null,
    safeNextPath(next),
    Date.now() + STATE_TTL_MS,
  );
  return { state, codeChallenge: pair?.challenge };
}

/** Consume el estado de un inicio de sesión (una sola vez). null si no es de login, caducó o es de otra red. */
export function consumeLoginState(state: string, connector: string) {
  return tx(() => {
    const row = db.prepare("SELECT * FROM login_states WHERE state_hash = ?").get(sha256(state)) as
      | { connector: string; code_verifier: string | null; next: string | null; expires_at: number }
      | undefined;
    if (!row) return null;
    db.prepare("DELETE FROM login_states WHERE state_hash = ?").run(sha256(state));
    if (row.expires_at < Date.now() || row.connector !== connector) return null;
    return { codeVerifier: row.code_verifier ?? undefined, next: safeNextPath(row.next) };
  });
}

export function purgeLoginStates() {
  db.prepare("DELETE FROM login_states WHERE expires_at < ?").run(Date.now());
}

/** Email de relleno para quien entra con TikTok (TikTok no da email). Dominio .invalid: nunca se envía nada. */
export function placeholderEmail(identity: Pick<SocialIdentity, "provider" | "subject">) {
  return `${identity.provider}-${sha256(identity.subject).slice(0, 20)}@sin-email.invalid`;
}

export const isPlaceholderEmail = (email: string) => email.endsWith("@sin-email.invalid");

/**
 * Encuentra o crea al usuario de esta identidad. Devuelve su id y si se acaba de crear.
 * Respeta SIGNUP_MODE: con registro por invitación, una identidad nueva no crea cuenta.
 */
export function signInWithIdentity(identity: SocialIdentity, termsVersion: string) {
  return tx(() => {
    const linked = db
      .prepare("SELECT user_id FROM user_identities WHERE provider = ? AND subject = ?")
      .get(identity.provider, identity.subject) as { user_id: string } | undefined;
    if (linked) return { userId: linked.user_id, created: false };

    const now = Date.now();
    const link = (userId: string) =>
      db.prepare("INSERT INTO user_identities (provider, subject, user_id, created_at) VALUES (?, ?, ?, ?)").run(
        identity.provider,
        identity.subject,
        userId,
        now,
      );

    // Misma persona que ya tenía cuenta con ese email: solo si Google garantiza que el email es suyo
    const verifiedEmail = identity.email && identity.emailVerified ? identity.email.trim().toLowerCase() : null;
    if (verifiedEmail) {
      const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(verifiedEmail) as { id: string } | undefined;
      if (existing) {
        link(existing.id);
        db.prepare("UPDATE users SET email_verified_at = COALESCE(email_verified_at, ?) WHERE id = ?").run(now, existing.id);
        return { userId: existing.id, created: false };
      }
    }

    const first = userCount() === 0;
    const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    if (!first && signupMode() === "invite") {
      throw new AuthError("invite_required", "De momento el registro es solo con invitación. Pide acceso y vuelve a entrar.");
    }
    if (first && adminEmail && verifiedEmail !== adminEmail) {
      throw new AuthError("invite_required", "De momento el registro es solo con invitación.");
    }

    const userId = randomUUID();
    const email = verifiedEmail ?? placeholderEmail(identity);
    const name = identity.name.trim().slice(0, 100) || "Mi marca";
    db.prepare(
      `INSERT INTO users (id, email, name, password_hash, is_admin, created_at, email_verified_at, terms_accepted_at, terms_version)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(userId, email, name, NO_PASSWORD, first ? 1 : 0, now, verifiedEmail ? now : null, now, termsVersion);
    link(userId);
    createOwnedWorkspace(userId, name);
    return { userId, created: true };
  });
}
