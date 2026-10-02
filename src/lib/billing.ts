import { createHmac, timingSafeEqual } from "node:crypto";
import { prisma } from "./db";

/**
 * Premium payments through Stripe, without its SDK: Checkout (Stripe's own payment page, so no
 * card number ever reaches this app), the customer portal (change card, cancel, invoices) and a
 * webhook that sets the account's plan. The plan only ever changes from a signed Stripe event.
 *
 * Live keys are refused unless BILLING_LIVE=1: a test deployment cannot take real money by mistake.
 */
export type Period = "monthly" | "yearly";

const PRICE_ENV: Record<Period, string> = { monthly: "STRIPE_PRICE_MONTHLY", yearly: "STRIPE_PRICE_YEARLY" };

export const billingMode = (): "test" | "live" | null => {
  const key = process.env.STRIPE_SECRET_KEY ?? "";
  if (key.startsWith("sk_test_") || key.startsWith("rk_test_")) return "test";
  if ((key.startsWith("sk_live_") || key.startsWith("rk_live_")) && process.env.BILLING_LIVE === "1") return "live";
  return null;
};

export const billingConfigured = () => !!(billingMode() && process.env.STRIPE_WEBHOOK_SECRET && process.env.STRIPE_PRICE_MONTHLY);

export const priceId = (period: Period) => process.env[PRICE_ENV[period]] || null;

/** Stripe's form encoding, nested keys included: {line_items: [{price: "p"}]} -> line_items[0][price]=p. */
export function formEncode(value: Record<string, unknown>): string {
  const out: string[] = [];
  const walk = (v: unknown, key: string) => {
    if (v === undefined || v === null) return;
    if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${key}[${i}]`));
    else if (typeof v === "object") for (const [k, x] of Object.entries(v)) walk(x, key ? `${key}[${k}]` : k);
    else out.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(v))}`);
  };
  walk(value, "");
  return out.join("&");
}

export async function stripeApi<T = Record<string, unknown>>(method: "GET" | "POST" | "DELETE", path: string, params: Record<string, unknown> = {}, f: typeof fetch = fetch): Promise<T> {
  const body = formEncode(params);
  const url = `https://api.stripe.com/v1/${path}${method === "GET" && body ? `?${body}` : ""}`;
  const res = await f(url, {
    method,
    headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`, "Content-Type": "application/x-www-form-urlencoded" },
    ...(method === "GET" ? {} : { body }),
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: { message?: string } };
  if (!res.ok) throw new Error(`Stripe ${method} ${path}: ${res.status} ${data.error?.message ?? ""}`.trim());
  return data;
}

interface Payer { id: string; email: string; stripeCustomerId: string | null }

/** A Checkout page for the chosen period; the account id travels with it so the webhook finds it. */
export async function checkoutUrl(account: Payer, period: Period, appUrl: string, locale: string, f: typeof fetch = fetch): Promise<string> {
  const price = priceId(period);
  if (!price) throw new Error(`No price set for ${period}`);
  const session = await stripeApi<{ url: string }>("POST", "checkout/sessions", {
    mode: "subscription",
    line_items: [{ price, quantity: 1 }],
    client_reference_id: account.id,
    ...(account.stripeCustomerId ? { customer: account.stripeCustomerId } : { customer_email: account.email }),
    subscription_data: { metadata: { account_id: account.id } },
    metadata: { account_id: account.id },
    locale: locale === "fr" ? "fr" : "en",
    allow_promotion_codes: true,
    success_url: `${appUrl}/account?billing=success`,
    cancel_url: `${appUrl}/account?billing=cancel`,
  }, f);
  return session.url;
}

/** Stripe's portal: change card, see invoices, cancel. */
export async function portalUrl(customer: string, appUrl: string, f: typeof fetch = fetch): Promise<string> {
  const s = await stripeApi<{ url: string }>("POST", "billing_portal/sessions", { customer, return_url: `${appUrl}/account` }, f);
  return s.url;
}

/** The amount and currency of a price, kept for an hour, so the page shows what Stripe will charge. */
const priceCache = new Map<string, { at: number; amount: number; currency: string }>();
export async function priceAmount(period: Period, f: typeof fetch = fetch): Promise<{ amount: number; currency: string } | null> {
  const id = priceId(period);
  if (!id || !billingMode()) return null;
  const hit = priceCache.get(id);
  if (hit && Date.now() - hit.at < 3_600_000) return hit;
  try {
    const p = await stripeApi<{ unit_amount: number; currency: string }>("GET", `prices/${id}`, {}, f);
    const v = { at: Date.now(), amount: p.unit_amount / 100, currency: p.currency.toUpperCase() };
    priceCache.set(id, v);
    return v;
  } catch {
    return null;
  }
}

/**
 * Checks the Stripe-Signature header ("t=...,v1=...") against the raw body, and refuses events
 * older than 5 minutes (a replayed request).
 */
export function verifySignature(payload: string, header: string | null, secret: string, now = Date.now()): boolean {
  if (!header) return false;
  const parts = header.split(",").map((p) => p.split("="));
  const t = Number(parts.find(([k]) => k === "t")?.[1]);
  if (!Number.isFinite(t) || Math.abs(now / 1000 - t) > 300) return false;
  const expected = createHmac("sha256", secret).update(`${t}.${payload}`).digest();
  return parts.filter(([k]) => k === "v1").some(([, v]) => {
    const got = Buffer.from(v ?? "", "hex");
    return got.length === expected.length && timingSafeEqual(got, expected);
  });
}

/** Statuses that keep Premium: paid, in trial, or a failed payment Stripe is still retrying. */
const PREMIUM = new Set(["active", "trialing", "past_due"]);

interface StripeEvent { id: string; type: string; created: number; data: { object: Record<string, unknown> } }

/** Applies one webhook event. Returns what it did, for the logs and the tests. */
export async function handleEvent(event: StripeEvent): Promise<string> {
  const o = event.data.object as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  if (event.type === "checkout.session.completed") {
    const accountId = o.client_reference_id ?? o.metadata?.account_id;
    if (!accountId || typeof o.customer !== "string") return "ignored";
    const { count } = await prisma.account.updateMany({ where: { id: accountId }, data: { stripeCustomerId: o.customer } });
    return count ? "customer-linked" : "no-account";
  }
  if (event.type.startsWith("customer.subscription.")) {
    const account =
      (typeof o.customer === "string" ? await prisma.account.findUnique({ where: { stripeCustomerId: o.customer } }) : null) ??
      (o.metadata?.account_id ? await prisma.account.findUnique({ where: { id: o.metadata.account_id } }) : null);
    if (!account) return "no-account";
    if (account.billingEventAt && account.billingEventAt > event.created) return "stale";
    const status = event.type === "customer.subscription.deleted" ? "canceled" : String(o.status);
    // The period end moved from the subscription to its items in recent API versions.
    const end = o.current_period_end ?? o.items?.data?.[0]?.current_period_end;
    await prisma.account.update({
      where: { id: account.id },
      data: {
        plan: PREMIUM.has(status) ? "premium" : "free",
        subscriptionStatus: status,
        premiumUntil: typeof end === "number" ? new Date(end * 1000) : null,
        billingEventAt: event.created,
        ...(typeof o.customer === "string" && !account.stripeCustomerId ? { stripeCustomerId: o.customer } : {}),
      },
    });
    return `plan-${PREMIUM.has(status) ? "premium" : "free"}`;
  }
  return "ignored";
}

/**
 * Stops every subscription of a customer, at once: used when the account is deleted, so nobody
 * keeps paying for an account that no longer exists. Throws if Stripe cannot be reached.
 */
export async function cancelAllSubscriptions(customer: string, f: typeof fetch = fetch): Promise<number> {
  const list = await stripeApi<{ data: { id: string; status: string }[] }>("GET", "subscriptions", { customer, status: "all", limit: 100 }, f);
  const live = list.data.filter((s) => !["canceled", "incomplete_expired"].includes(s.status));
  for (const s of live) await stripeApi("DELETE", `subscriptions/${s.id}`, {}, f);
  return live.length;
}
