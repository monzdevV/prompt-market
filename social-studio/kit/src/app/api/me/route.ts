import { NextResponse } from "next/server";
import { z } from "zod";
import { deleteUserAccount } from "@/lib/account-deletion";
import { verifyCredentials } from "@/lib/auth";
import { ApiError, parseJson, withSession } from "@/lib/api";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { sessionCookieName } from "@/lib/session";
import { NO_PASSWORD } from "@/lib/social-auth";

const Body = z.object({
  password: z.string().max(200).optional(),
  /** Cuentas sin contraseña (entraron con Google o TikTok): se confirma escribiendo BORRAR */
  confirm: z.string().max(20).optional(),
});

/** Borra la cuenta del usuario y todos sus datos (vídeos, publicaciones, tokens). */
export const DELETE = withSession(async (req, s) => {
  const { password, confirm } = await parseJson(req, Body);
  const rl = rateLimit(`delete-account:${s.userId}`, 5, 15 * 60_000);
  if (!rl.ok) throw new ApiError(429, "rate_limited", "Demasiados intentos. Prueba más tarde.");
  const hash = (db.prepare("SELECT password_hash FROM users WHERE id = ?").get(s.userId) as { password_hash: string } | undefined)?.password_hash;
  if (hash === NO_PASSWORD) {
    // Sin contraseña: la sesión ya prueba quién es; se pide una confirmación explícita para evitar clics por error
    if (confirm !== "BORRAR") throw new ApiError(400, "bad_request", "Escribe BORRAR para confirmar");
  } else {
    if (!password) throw new ApiError(400, "bad_request", "Escribe tu contraseña para confirmar");
    try {
      await verifyCredentials(s.email, password);
    } catch {
      throw new ApiError(403, "forbidden", "La contraseña no es correcta");
    }
  }
  await deleteUserAccount(s.userId);
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(sessionCookieName());
  return res;
});
