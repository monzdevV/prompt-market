import { z } from "zod";
import { ApiError, errorResponse, parseJson } from "@/lib/api";
import { audit } from "@/lib/audit";
import { resetPassword } from "@/lib/email-tokens";
import { clientIp, rateLimit } from "@/lib/rate-limit";

const Body = z.object({
  token: z.string().min(10).max(200),
  password: z.string().min(10, "La contraseña debe tener al menos 10 caracteres").max(200, "La contraseña es demasiado larga"),
});

export async function POST(req: Request) {
  try {
    if (!rateLimit(`reset:${clientIp(req)}`, 10, 60 * 60_000).ok) throw new ApiError(429, "rate_limited", "Demasiados intentos.");
    const { token, password } = await parseJson(req, Body);
    const userId = await resetPassword(token, password);
    audit({ workspaceId: null, actorUserId: userId, action: "auth.password_reset" });
    return Response.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
