import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createHmac, randomUUID } from "node:crypto";
import { prisma } from "@/lib/db";
import { encrypt } from "@/lib/crypto";
import { billingConfigured, billingMode, checkoutUrl, formEncode, handleEvent, verifySignature } from "@/lib/billing";
import { deleteAccount, getAccount, purgeAccounts } from "@/lib/accounts";

const SECRET = "whsec_test";
const sign = (payload: string, t = Math.floor(Date.now() / 1000), secret = SECRET) => `t=${t},v1=${createHmac("sha256", secret).update(`${t}.${payload}`).digest("hex")}`;

async function account(extra: Record<string, unknown> = {}) {
  return prisma.account.create({ data: { emailHash: randomUUID(), email: encrypt("me@example.com"), sessionId: randomUUID(), ...extra } });
}

/** A fake Stripe: records each call and answers from a table. */
function fakeStripe(answers: Record<string, unknown> = {}, ok = true) {
  const calls: { method: string; url: string; body?: string }[] = [];
  const f = (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ method: init!.method!, url: String(url), body: init!.body as string | undefined });
    const key = Object.keys(answers).find((k) => String(url).includes(k));
    return new Response(JSON.stringify(key ? answers[key] : {}), { status: ok ? 200 : 500 });
  }) as typeof fetch;
  return { f, calls };
}

describe("Stripe billing", () => {
  beforeEach(() => {
    process.env.STRIPE_SECRET_KEY = "sk_test_123";
    process.env.STRIPE_WEBHOOK_SECRET = SECRET;
    process.env.STRIPE_PRICE_MONTHLY = "price_m";
    process.env.STRIPE_PRICE_YEARLY = "price_y";
  });
  afterEach(() => {
    for (const k of ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "STRIPE_PRICE_MONTHLY", "STRIPE_PRICE_YEARLY", "BILLING_LIVE"]) delete process.env[k];
  });

  it("works in test mode, and refuses live keys unless BILLING_LIVE=1", () => {
    expect([billingMode(), billingConfigured()]).toEqual(["test", true]);
    process.env.STRIPE_SECRET_KEY = "sk_live_123";
    expect([billingMode(), billingConfigured()]).toEqual([null, false]);
    process.env.BILLING_LIVE = "1";
    expect(billingMode()).toBe("live");
  });

  it("encodes nested parameters the way Stripe reads them", () => {
    expect(decodeURIComponent(formEncode({ line_items: [{ price: "p", quantity: 1 }], metadata: { a: "b" }, skip: undefined }))).toBe("line_items[0][price]=p&line_items[0][quantity]=1&metadata[a]=b");
  });

  it("accepts only a fresh event signed with the webhook secret", () => {
    const body = JSON.stringify({ id: "evt_1" });
    expect(verifySignature(body, sign(body), SECRET)).toBe(true);
    expect(verifySignature(body + " ", sign(body), SECRET)).toBe(false);
    expect(verifySignature(body, sign(body, undefined, "whsec_other"), SECRET)).toBe(false);
    expect(verifySignature(body, sign(body, Math.floor(Date.now() / 1000) - 600), SECRET)).toBe(false);
    expect(verifySignature(body, null, SECRET)).toBe(false);
  });

  it("opens Checkout for the account, with its id and the chosen price", async () => {
    const { f, calls } = fakeStripe({ "checkout/sessions": { url: "https://checkout.stripe.com/c/pay/x" } });
    const url = await checkoutUrl({ id: "acc_1", email: "me@example.com", stripeCustomerId: null }, "yearly", "https://app.example", "fr", f);
    expect(url).toBe("https://checkout.stripe.com/c/pay/x");
    const body = decodeURIComponent(calls[0].body!);
    for (const part of ["mode=subscription", "line_items[0][price]=price_y", "client_reference_id=acc_1", "customer_email=me@example.com", "subscription_data[metadata][account_id]=acc_1", "success_url=https://app.example/account?billing=success"]) expect(body).toContain(part);
  });

  it("turns Premium on and off from subscription events, ignoring late older ones", async () => {
    const a = await account();
    const customer = `cus_${randomUUID()}`;
    expect(await handleEvent({ id: "e1", type: "checkout.session.completed", created: 100, data: { object: { client_reference_id: a.id, customer } } })).toBe("customer-linked");
    const sub = (status: string, created: number, type = "customer.subscription.updated") =>
      handleEvent({ id: `e${created}`, type, created, data: { object: { customer, status, items: { data: [{ current_period_end: 1_800_000_000 }] } } } });
    expect(await sub("active", 200)).toBe("plan-premium");
    let row = await prisma.account.findUniqueOrThrow({ where: { id: a.id } });
    expect([row.plan, row.premiumUntil?.toISOString().slice(0, 10)]).toEqual(["premium", "2027-01-15"]);
    expect(await sub("incomplete", 150)).toBe("stale");
    expect(await sub("past_due", 300)).toBe("plan-premium");
    expect(await sub("canceled", 400, "customer.subscription.deleted")).toBe("plan-free");
    row = await prisma.account.findUniqueOrThrow({ where: { id: a.id } });
    expect([row.plan, row.subscriptionStatus]).toEqual(["free", "canceled"]);
  });

  it("stops the subscription at Stripe before deleting a paying account, and keeps everything if Stripe fails", async () => {
    const a = await account({ stripeCustomerId: `cus_${randomUUID()}`, plan: "premium" });
    const failing = fakeStripe({}, false);
    await expect(deleteAccount(a.sessionId, failing.f)).rejects.toThrow();
    expect(await getAccount(a.sessionId)).not.toBeNull();
    const { f, calls } = fakeStripe({ subscriptions: { data: [{ id: "sub_1", status: "active" }, { id: "sub_0", status: "canceled" }] } });
    await deleteAccount(a.sessionId, f);
    expect(calls.map((c) => `${c.method} ${c.url.split("?")[0]}`)).toEqual(["GET https://api.stripe.com/v1/subscriptions", "DELETE https://api.stripe.com/v1/subscriptions/sub_1"]);
    expect(await getAccount(a.sessionId)).toBeNull();
  });

  it("never purges an account that is still paying", async () => {
    const old = new Date(Date.now() - 400 * 86_400_000);
    const paying = await account({ plan: "premium", lastLoginAt: old });
    await purgeAccounts();
    expect(await getAccount(paying.sessionId)).not.toBeNull();
    await prisma.account.delete({ where: { id: paying.id } });
  });
});
