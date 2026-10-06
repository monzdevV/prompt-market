import { NextResponse } from "next/server";
import { z } from "zod";
import { AuthError, createSession, primaryWorkspace, verifyCredentials } from "@/lib/auth";
import { ApiError, errorResponse, parseJson } from "@/lib/api";
import { clientIp, peekRateLimit, rateLimit } from "@/lib/rate-limit";
import { sessionCookieName, sessionCookieOptions } from "@/lib/session";

const Body = z.object({
  email: z.string().trim().min(1, "Escribe tu email").max(254),
  password: z.string().min(1, "Escribe tu contraseña").max(200),
});

export async function POST(req: Request) {
  try {
    const b = await parseJson(req, Body);
    // Cada intento se cuenta ANTES de comprobar la contraseña: una ráfaga de peticiones en paralelo
    // no puede colarse mientras se calcula el hash. Por IP y por email+IP (atacar una cuenta concreta);
    // y por email global solo los fallos, con un tope alto (ataque distribuido sin bloquear al dueño).
    const ip = clientIp(req);
    const email = b.email.trim().toLowerCase();
    for (const key of [`login-ip:${ip}`, `login-email:${email}:${ip}`]) {
      const rl = rateLimit(key, 10, 15 * 60_000);
      if (!rl.ok) throw new ApiError(429, "rate_limited", `Demasiados intentos. Prueba en ${Math.ceil(rl.retryAfterS / 60)} min.`);
    }
    const global = peekRateLimit(`login-email:${email}`, 50, 60 * 60_000);
    if (!global.ok) throw new ApiError(429, "rate_limited", "Demasiados intentos fallidos en esta cuenta. Prueba más tarde o restablece tu contraseña.");
    let user;
    try {
      user = await verifyCredentials(b.email, b.password);
    } catch (e) {
      rateLimit(`login-email:${email}`, 50, 60 * 60_000);
      throw e;
    }
    const { token, expiresAt } = createSession(user.id, primaryWorkspace(user.id));
    const res = NextResponse.json({ ok: true });
    res.cookies.set(sessionCookieName(), token, sessionCookieOptions(expiresAt));
    return res;
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message, code: e.code }, { status: 401 });
    return errorResponse(e);
  }
}
