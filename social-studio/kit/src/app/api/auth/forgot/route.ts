import { z } from "zod";
import { ApiError, errorResponse, parseJson } from "@/lib/api";
import { sendPasswordReset } from "@/lib/email-tokens";
import { log } from "@/lib/log";
import { clientIp, rateLimit } from "@/lib/rate-limit";

const Body = z.object({ email: z.string().trim().min(3, "Escribe tu email").max(254) });

/** Pide un enlace para restablecer la contraseña. La respuesta es la misma exista o no el email. */
export async function POST(req: Request) {
  try {
    const { email } = await parseJson(req, Body);
    for (const key of [`forgot-ip:${clientIp(req)}`, `forgot-email:${email.toLowerCase()}`]) {
      if (!rateLimit(key, 5, 60 * 60_000).ok) throw new ApiError(429, "rate_limited", "Demasiadas solicitudes. Prueba dentro de un rato.");
    }
    // Sin await: la respuesta tarda lo mismo exista o no el email (no se puede averiguar por tiempos)
    void sendPasswordReset(email).catch((e) => log.error("auth.forgot_failed", { err: e }));
    return Response.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
