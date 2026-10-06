import { createHmac } from "node:crypto";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { handleStripeEvent, verifyStripeEvent } from "@/lib/billing";
import { db } from "@/lib/db";
import { planHasAi, workspacePlan } from "@/lib/plans";
import { makeUser } from "./helpers";

const env = { ...process.env };
beforeAll(() => {
  process.env.STRIPE_SECRET_KEY = "sk_test_x";
  process.env.STRIPE_PRICE_PRO = "price_pro";
  process.env.STRIPE_PRICE_BUSINESS = "price_biz";
});
afterAll(() => {
  for (const k of ["STRIPE_SECRET_KEY", "STRIPE_PRICE_PRO", "STRIPE_PRICE_BUSINESS"]) process.env[k] = env[k];
});
afterEach(() => vi.unstubAllGlobals());

const sign = (body: string, secret: string, t = Math.floor(Date.now() / 1000)) =>
  `t=${t},v1=${createHmac("sha256", secret).update(`${t}.${body}`).digest("hex")}`;

const sub = (status: string, price = "price_pro") => ({
  id: "sub_1",
  customer: "cus_1",
  status,
  cancel_at_period_end: false,
  items: { data: [{ price: { id: price }, current_period_end: 1_900_000_000 }] },
});

describe("firma del webhook de Stripe", () => {
  it("acepta la firma v1 correcta y rechaza la manipulada, la de otro secreto o una vieja (repetición)", () => {
    const body = JSON.stringify({ id: "evt_1", type: "x", data: { object: {} } });
    expect(verifyStripeEvent(body, sign(body, "whsec_a"), "whsec_a")).toMatchObject({ id: "evt_1" });
    expect(verifyStripeEvent(body + " ", sign(body, "whsec_a"), "whsec_a")).toBeNull();
    expect(verifyStripeEvent(body, sign(body, "whsec_b"), "whsec_a")).toBeNull();
    expect(verifyStripeEvent(body, sign(body, "whsec_a", Math.floor(Date.now() / 1000) - 3600), "whsec_a")).toBeNull();
    expect(verifyStripeEvent(body, null, "whsec_a")).toBeNull();
    // Esquemas distintos de v1 se ignoran (ataque de degradación)
    const t = Math.floor(Date.now() / 1000);
    expect(verifyStripeEvent(body, `t=${t},v0=${createHmac("sha256", "whsec_a").update(`${t}.${body}`).digest("hex")}`, "whsec_a")).toBeNull();
  });
});

describe("suscripciones", () => {
  it("al pagar pasa a Pro (con IA); si se cancela, vuelve a Free; cada evento se aplica una sola vez", async () => {
    const u = await makeUser(undefined, "free");
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(sub("active")), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const completed = {
      id: "evt_checkout",
      type: "checkout.session.completed",
      data: { object: { customer: "cus_1", subscription: "sub_1", client_reference_id: u.workspaceId } },
    };
    await expect(handleStripeEvent(completed)).resolves.toBe("applied");
    expect(workspacePlan(u.workspaceId)).toBe("pro");
    expect(planHasAi(u.workspaceId)).toBe(true);
    expect(await handleStripeEvent(completed)).toBe("duplicate");
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Cambio a Business desde el portal
    await handleStripeEvent({ id: "evt_up", type: "customer.subscription.updated", data: { object: sub("active", "price_biz") } });
    expect(workspacePlan(u.workspaceId)).toBe("business");

    // Impago prolongado / cancelación: vuelve a Free
    await handleStripeEvent({ id: "evt_del", type: "customer.subscription.deleted", data: { object: sub("canceled", "price_biz") } });
    expect(workspacePlan(u.workspaceId)).toBe("free");
    expect(db.prepare("SELECT status, plan_source FROM subscriptions s JOIN workspaces w ON w.id = s.workspace_id WHERE s.workspace_id = ?").get(u.workspaceId)).toMatchObject({
      status: "canceled",
      plan_source: "stripe",
    });
  });

  it("un precio que no es nuestro no da ningún plan de pago", async () => {
    const u = await makeUser(undefined, "free");
    const s = { ...sub("active", "price_desconocido"), customer: "cus_2", id: "sub_2", metadata: { workspace_id: u.workspaceId } };
    await handleStripeEvent({ id: "evt_x", type: "customer.subscription.created", data: { object: s } });
    expect(workspacePlan(u.workspaceId)).toBe("free");
  });

  it("si falla al aplicar, el evento no queda marcado y Stripe puede reintentarlo", async () => {
    const u = await makeUser(undefined, "free");
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 500 })));
    const ev = { id: "evt_fail", type: "checkout.session.completed", data: { object: { customer: "cus_3", subscription: "sub_3", client_reference_id: u.workspaceId } } };
    await expect(handleStripeEvent(ev)).rejects.toThrow();
    expect(db.prepare("SELECT 1 FROM billing_events WHERE event_id = 'evt_fail'").get()).toBeUndefined();
  });
});
