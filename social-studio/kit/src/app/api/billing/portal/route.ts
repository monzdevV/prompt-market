import { withSession } from "@/lib/api";
import { billingEnabled, createPortal } from "@/lib/billing";
import { ApiError } from "@/lib/errors";
import { assertOwner } from "@/lib/team";

/** Portal de Stripe (cambiar de plan, tarjeta, facturas o cancelar). Solo la persona dueña del espacio. */
export const POST = withSession(async (_req, s) => {
  if (!billingEnabled()) throw new ApiError(503, "billing_disabled", "Los pagos aún no están activados");
  assertOwner(s.workspaceId, s.userId);
  return Response.json({ url: await createPortal(s.workspaceId) });
});
