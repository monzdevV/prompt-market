import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { sessionFromToken, type SessionInfo } from "./auth";

export const cookieSecure = () => (process.env.APP_URL ?? "").startsWith("https://");

/**
 * Con HTTPS la cookie usa el prefijo __Host-: el navegador solo la acepta si es Secure, sin Domain y con Path=/,
 * así otro subdominio (p. ej. en un dominio compartido del túnel) no puede plantar una sesión.
 */
export const sessionCookieName = () => (cookieSecure() ? "__Host-ss_session" : "ss_session");

export function sessionCookieOptions(expiresAt: number) {
  return {
    httpOnly: true,
    secure: cookieSecure(),
    sameSite: "lax" as const,
    path: "/",
    expires: new Date(expiresAt),
  };
}

/** Sesión de la petición actual (memoizada por render). */
export const getSession = cache(async (): Promise<SessionInfo | null> => {
  return sessionFromToken((await cookies()).get(sessionCookieName())?.value);
});

/** Para páginas: sin sesión, a /entrar. */
export async function requireSession() {
  const s = await getSession();
  if (!s) redirect("/entrar");
  return s;
}

export async function requireAdmin() {
  const s = await requireSession();
  if (!s.isAdmin) redirect("/panel");
  return s;
}
