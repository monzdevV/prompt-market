import { createHmac, timingSafeEqual } from "node:crypto";
import { audit } from "./audit";
import { db, tx } from "./db";
import { ApiError, badRequest } from "./errors";
import { log } from "./log";
import { APP_URL } from "./platforms/common";
import { isPlanKey, type PlanKey } from "./plans";

/*
 * Pagos con Stripe (API REST directa, sin SDK), consultado el 23/09/2026:
 *  - Checkout (suscripción):  POST /v1/checkout/sessions  mode=subscription  → `url`
 *    docs.stripe.com/api/checkout/sessions/create
 *  - Portal del cliente:       POST /v1/billing_portal/sessions  customer, return_url → `url`
 *    docs.stripe.com/api/customer_portal/sessions/create
 *  - Webhooks: cabecera Stripe-Signature «t=…,v1=…»; firma = HMAC-SHA256(secreto, `${t}.${cuerpo}`)
 *    docs.stripe.com/webhooks (verificación manual)
 *
 * Los PRECIOS no están en el código: se crean en Stripe y aquí solo se configuran sus ids
 * (STRIPE_PRICE_PRO, STRIPE_PRICE_BUSINESS). El importe que se enseña se lee de Stripe.
 */

const API = "https://api.stripe.com/v1";
const SIGNATURE_TOLERANCE_S = 5 * 60;

export const PAID_PLANS = ["pro", "business"] as const;
export type PaidPlan = (typeof PAID_PLANS)[number];

function priceIds(): Record<PaidPlan, string | undefined> {
  return { pro: process.env.STRIPE_PRICE_PRO, business: process.env.STRIPE_PRICE_BUSINESS };
}

/** ¿Están los pagos configurados? (clave secreta y al menos un precio) */
export function billingEnabled() {
  const p = priceIds();
  return !!process.env.STRIPE_SECRET_KEY && !!(p.pro || p.business);
}

export function planForPrice(priceId: string | null | undefined): PlanKey | null {
  if (!priceId) return null;
  const p = priceIds();
  if (priceId === p.pro) return "pro";
  if (priceId === p.business) return "business";
  return null;
}

/** Codifica objetos anidados como espera la API de Stripe (a[b][0][c]=…). */
function encode(params: Record<string, unknown>, prefix = "", out = new URLSearchParams()) {
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    const key = prefix ? `${prefix}[${k}]` : k;
    if (typeof v === "object") encode(v as Record<string, unknown>, key, out);
    else out.append(key, String(v));
  }
  return out;
}

async function stripe<T = unknown>(path: string, params?: Record<string, unknown>): Promise<T> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new ApiError(503, "billing_disabled", "Los pagos aún no están activados");
  const res = await fetch(`${API}${path}`, {
    method: params ? "POST" : "GET",
    headers: { Authorization: `Bearer ${key}`, ...(params ? { "Content-Type": "application/x-www-form-urlencoded" } : {}) },
    body: params ? encode(params) : undefined,
    signal: AbortSignal.timeout(20_000),
  });
  const body = (await res.json().catch(() => ({}))) as { error?: { message?: string } } & T;
  if (!res.ok) {
    log.warn("billing.stripe_error", { path, status: res.status, message: body.error?.message });
    throw new ApiError(502, "billing_error", "No se pudo conectar con la pasarela de pago. Prueba en unos minutos.");
  }
  return body;
}

function subscriptionRow(workspaceId: string) {
  return db.prepare("SELECT * FROM subscriptions WHERE workspace_id = ?").get(workspaceId) as
    | { customer_id: string; subscription_id: string | null; plan: string; status: string; current_period_end: number | null; cancel_at_period_end: number }
    | undefined;
}

/** Suscripción del espacio para enseñarla en Ajustes (sin datos de pago). */
export function billingSummary(workspaceId: string) {
  const s = subscriptionRow(workspaceId);
  return s
    ? { hasCustomer: true, plan: s.plan, status: s.status, renewsAt: s.current_period_end, cancelAtPeriodEnd: !!s.cancel_at_period_end }
    : { hasCustomer: false, plan: null, status: null, renewsAt: null, cancelAtPeriodEnd: false };
}

/** Página de pago de Stripe para suscribirse a un plan. Devuelve la URL a la que llevar al usuario. */
export async function createCheckout(workspaceId: string, email: string | null, plan: PaidPlan) {
  const price = priceIds()[plan];
  if (!price) throw badRequest("Ese plan aún no está disponible");
  const existing = subscriptionRow(workspaceId);
  const session = await stripe<{ url: string }>("/checkout/sessions", {
    mode: "subscription",
    line_items: { 0: { price, quantity: 1 } },
    success_url: `${APP_URL()}/ajustes?pago=ok`,
    cancel_url: `${APP_URL()}/precios?pago=cancelado`,
    client_reference_id: workspaceId,
    ...(existing ? { customer: existing.customer_id } : email ? { customer_email: email } : {}),
    metadata: { workspace_id: workspaceId, plan },
    subscription_data: { metadata: { workspace_id: workspaceId } },
    allow_promotion_codes: "true",
    locale: "es",
  });
  return session.url;
}

/** Portal de Stripe para cambiar de plan, la tarjeta o cancelar. */
export async function createPortal(workspaceId: string) {
  const existing = subscriptionRow(workspaceId);
  if (!existing) throw badRequest("Aún no tienes una suscripción");
  const session = await stripe<{ url: string }>("/billing_portal/sessions", {
    customer: existing.customer_id,
    return_url: `${APP_URL()}/ajustes`,
  });
  return session.url;
}

/** Importe del precio leído de Stripe (para no escribir precios a mano). Se guarda 1 hora. */
const priceCache = new Map<string, { at: number; label: string | null }>();
export async function priceLabel(plan: PaidPlan): Promise<string | null> {
  const id = priceIds()[plan];
  if (!id || !process.env.STRIPE_SECRET_KEY) return null;
  const hit = priceCache.get(id);
  if (hit && Date.now() - hit.at < 3600_000) return hit.label;
  try {
    const p = await stripe<{ unit_amount: number | null; currency: string; recurring?: { interval: string } }>(`/prices/${encodeURIComponent(id)}`);
    const amount =
      p.unit_amount === null ? null : new Intl.NumberFormat("es-ES", { style: "currency", currency: p.currency.toUpperCase() }).format(p.unit_amount / 100);
    const label = amount ? `${amount}${p.recurring?.interval === "year" ? " / año" : " / mes"}` : null;
    priceCache.set(id, { at: Date.now(), label });
    return label;
  } catch {
    return null;
  }
}

/** Verifica la firma del webhook (cabecera Stripe-Signature). Devuelve el evento o null. */
export function verifyStripeEvent(rawBody: string, header: string | null, secret: string, now = Date.now()) {
  if (!header) return null;
  let t: string | null = null;
  const v1: string[] = [];
  for (const part of header.split(",")) {
    const [k, v] = part.split("=", 2);
    if (k === "t") t = v;
    else if (k === "v1" && v) v1.push(v);
  }
  if (!t || !v1.length || !/^\d+$/.test(t)) return null;
  if (Math.abs(now / 1000 - Number(t)) > SIGNATURE_TOLERANCE_S) return null;
  const expected = createHmac("sha256", secret).update(`${t}.${rawBody}`).digest();
  const valid = v1.some((sig) => {
    const given = Buffer.from(sig, "hex");
    return given.length === expected.length && timingSafeEqual(given, expected);
  });
  if (!valid) return null;
  try {
    return JSON.parse(rawBody) as { id: string; type: string; data: { object: StripeObject } };
  } catch {
    return null;
  }
}

/** Estados en los que la suscripción da acceso al plan. past_due: se mantiene mientras Stripe reintenta el cobro. */
const ACTIVE = new Set(["active", "trialing", "past_due"]);

/** Lo que usamos de una suscripción de Stripe */
type StripeSubscription = {
  id?: string;
  status?: string;
  customer?: string;
  cancel_at_period_end?: boolean;
  current_period_end?: number;
  trial_end?: number | null;
  metadata?: Record<string, string>;
  items?: { data?: { price?: { id?: string }; current_period_end?: number }[] };
};
type StripeObject = StripeSubscription & { subscription?: string; client_reference_id?: string };

function applySubscription(workspaceId: string, customerId: string, sub: StripeSubscription) {
  const item = sub.items?.data?.[0];
  const priceId: string | null = item?.price?.id ?? null;
  const plan = planForPrice(priceId);
  // current_period_end está en la suscripción (API antiguas) o en cada elemento (versiones recientes)
  const periodEnd = (item?.current_period_end ?? sub.current_period_end ?? null) as number | null;
  db.prepare(
    `INSERT INTO subscriptions (workspace_id, provider, customer_id, subscription_id, price_id, plan, status, current_period_end, cancel_at_period_end, trial_end, updated_at)
     VALUES (?, 'stripe', ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (workspace_id) DO UPDATE SET
       customer_id = excluded.customer_id, subscription_id = excluded.subscription_id, price_id = excluded.price_id,
       plan = excluded.plan, status = excluded.status, current_period_end = excluded.current_period_end,
       cancel_at_period_end = excluded.cancel_at_period_end, trial_end = excluded.trial_end, updated_at = excluded.updated_at`,
  ).run(
    workspaceId,
    customerId,
    sub.id ?? null,
    priceId,
    plan ?? "free",
    String(sub.status ?? "unknown"),
    periodEnd ? periodEnd * 1000 : null,
    sub.cancel_at_period_end ? 1 : 0,
    sub.trial_end ? sub.trial_end * 1000 : null,
    Date.now(),
  );
  const effective: PlanKey = plan && ACTIVE.has(String(sub.status)) ? plan : "free";
  const before = (db.prepare("SELECT plan FROM workspaces WHERE id = ?").get(workspaceId) as { plan: string } | undefined)?.plan;
  db.prepare("UPDATE workspaces SET plan = ?, plan_source = 'stripe' WHERE id = ?").run(effective, workspaceId);
  if (before !== effective) {
    audit({ workspaceId, actorUserId: null, action: "billing.plan_changed", targetType: "workspace", targetId: workspaceId, meta: { from: before, to: effective, status: sub.status } });
  }
}

function workspaceFor(customerId: string | null | undefined, metadataWs: unknown): string | null {
  if (typeof metadataWs === "string" && db.prepare("SELECT 1 FROM workspaces WHERE id = ?").get(metadataWs)) return metadataWs;
  if (!customerId) return null;
  const row = db.prepare("SELECT workspace_id FROM subscriptions WHERE customer_id = ?").get(customerId) as { workspace_id: string } | undefined;
  return row?.workspace_id ?? null;
}

/**
 * Procesa un evento ya verificado. Idempotente: cada event.id se aplica una sola vez.
 * checkout.session.completed trae la suscripción como id: se pide a Stripe para tener su estado y precio.
 */
export async function handleStripeEvent(event: { id: string; type: string; data: { object: StripeObject } }) {
  const fresh = db.prepare("INSERT OR IGNORE INTO billing_events (event_id, type, received_at) VALUES (?, ?, ?)").run(event.id, event.type, Date.now());
  if (fresh.changes === 0) return "duplicate";
  const obj = event.data.object;
  try {
    if (event.type === "checkout.session.completed") {
      const ws = workspaceFor(obj.customer, obj.client_reference_id ?? obj.metadata?.workspace_id);
      const customer = obj.customer;
      if (!ws || !obj.subscription || !customer) return "ignored";
      const sub = await stripe<StripeSubscription>(`/subscriptions/${encodeURIComponent(obj.subscription)}`);
      tx(() => applySubscription(ws, customer, sub));
      return "applied";
    }
    if (event.type === "customer.subscription.created" || event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
      const ws = workspaceFor(obj.customer, obj.metadata?.workspace_id);
      const customer = obj.customer;
      if (!ws || !customer) return "ignored";
      tx(() => applySubscription(ws, customer, obj));
      return "applied";
    }
    return "ignored";
  } catch (e) {
    // Se deja reintentar a Stripe: se borra la marca de «procesado»
    db.prepare("DELETE FROM billing_events WHERE event_id = ?").run(event.id);
    throw e;
  }
}

export function isPaidPlan(v: unknown): v is PaidPlan {
  return isPlanKey(v) && v !== "free";
}
