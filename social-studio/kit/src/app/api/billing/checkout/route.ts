import { z } from "zod";
import { parseJson, withSession } from "@/lib/api";
import { billingEnabled, createCheckout } from "@/lib/billing";
import { ApiError } from "@/lib/errors";
import { rateLimit } from "@/lib/rate-limit";
import { isPlaceholderEmail } from "@/lib/social-auth";
import { assertOwner } from "@/lib/team";

const Body = z.object({ plan: z.enum(["pro", "business"]) });

/** Empieza la suscripción: devuelve la URL de la página de pago de Stripe. Solo la persona dueña del espacio. */
export const POST = withSession(async (req, s) => {
  if (!billingEnabled()) throw new ApiError(503, "billing_disabled", "Los pagos aún no están activados");
  assertOwner(s.workspaceId, s.userId);
  if (!rateLimit(`checkout:${s.workspaceId}`, 10, 60 * 60_000).ok) throw new ApiError(429, "rate_limited", "Demasiados intentos. Prueba más tarde.");
  const { plan } = await parseJson(req, Body);
  const url = await createCheckout(s.workspaceId, isPlaceholderEmail(s.email) ? null : s.email, plan);
  return Response.json({ url });
});
