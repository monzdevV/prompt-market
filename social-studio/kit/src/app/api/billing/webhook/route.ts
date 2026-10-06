import { handleStripeEvent, verifyStripeEvent } from "@/lib/billing";
import { log } from "@/lib/log";

/**
 * Webhook de Stripe. Público (sin sesión ni Origin): se autentica con la firma Stripe-Signature.
 * Eventos que usa: checkout.session.completed y customer.subscription.created/updated/deleted.
 */
export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return new Response("Pagos no configurados", { status: 503 });
  const raw = await req.text();
  if (raw.length > 1024 * 1024) return new Response("Demasiado grande", { status: 413 });
  const event = verifyStripeEvent(raw, req.headers.get("stripe-signature"), secret);
  if (!event) return new Response("Firma no válida", { status: 400 });
  try {
    const result = await handleStripeEvent(event);
    log.info("billing.webhook", { type: event.type, result });
    return Response.json({ received: true });
  } catch (e) {
    // 500: Stripe reintenta más tarde
    log.error("billing.webhook_failed", { type: event.type, err: e });
    return new Response("Error", { status: 500 });
  }
}
