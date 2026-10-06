import { NextResponse } from "next/server";
import { z } from "zod";
import { AuthError, createSession, createUser } from "@/lib/auth";
import { errorResponse, parseJson, ApiError } from "@/lib/api";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { legalInfo } from "@/lib/legal";
import { sendVerificationEmail } from "@/lib/email-tokens";
import { log } from "@/lib/log";
import { sessionCookieName, sessionCookieOptions } from "@/lib/session";

const Body = z.object({
  name: z.string().trim().min(1, "Escribe tu nombre o el de tu marca").max(100, "El nombre es demasiado largo"),
  email: z.email("El email no es válido").max(254),
  password: z.string().min(10, "La contraseña debe tener al menos 10 caracteres").max(200, "La contraseña es demasiado larga"),
  inviteCode: z.string().trim().max(100).optional(),
  teamCode: z.string().trim().max(100).optional(),
  acceptTerms: z.literal(true, "Tienes que aceptar los términos y la política de privacidad"),
});

export async function POST(req: Request) {
  try {
    const rl = rateLimit(`register:${clientIp(req)}`, 5, 15 * 60_000);
    if (!rl.ok) throw new ApiError(429, "rate_limited", `Demasiados intentos. Prueba en ${Math.ceil(rl.retryAfterS / 60)} min.`);
    const b = await parseJson(req, Body);
    // Queda registrado qué versión de los términos aceptó y cuándo
    const { userId, workspaceId } = await createUser({ ...b, termsVersion: legalInfo().updated });
    const { token, expiresAt } = createSession(userId, workspaceId);
    // El email de verificación no bloquea el registro si el correo falla
    sendVerificationEmail(userId, b.email.trim().toLowerCase()).catch((e) => log.error("auth.verify_mail_failed", { err: e }));
    const res = NextResponse.json({ ok: true });
    res.cookies.set(sessionCookieName(), token, sessionCookieOptions(expiresAt));
    return res;
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message, code: e.code }, { status: e.code === "email_taken" ? 409 : 403 });
    }
    return errorResponse(e);
  }
}
