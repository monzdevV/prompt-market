import { ApiError, withSession } from "@/lib/api";
import { isEmailVerified, sendVerificationEmail } from "@/lib/email-tokens";
import { rateLimit } from "@/lib/rate-limit";

/** Reenvía el email de verificación al usuario de la sesión. */
export const POST = withSession(async (_req, s) => {
  if (isEmailVerified(s.userId)) return Response.json({ ok: true, alreadyVerified: true });
  if (!rateLimit(`verify-resend:${s.userId}`, 3, 60 * 60_000).ok) throw new ApiError(429, "rate_limited", "Ya te lo enviamos hace poco. Revisa tu bandeja de entrada y el spam.");
  await sendVerificationEmail(s.userId, s.email);
  return Response.json({ ok: true });
});
