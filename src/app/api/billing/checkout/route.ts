import { NextResponse } from "next/server";
import { getAccount } from "@/lib/accounts";
import { billingConfigured, checkoutUrl, priceId, type Period } from "@/lib/billing";
import { getSessionId } from "@/lib/session";
import { getLocale } from "@/lib/locale";
import { appUrlFor } from "@/lib/app-url";

/** Opens Stripe's payment page for Premium. Premium needs an account, so the payment has an owner. */
export async function POST(req: Request) {
  if (!billingConfigured()) return NextResponse.json({ error: "unavailable" }, { status: 503 });
  const account = await getAccount(await getSessionId());
  if (!account) return NextResponse.json({ error: "account" }, { status: 401 });
  if (account.plan === "premium") return NextResponse.json({ error: "already" }, { status: 409 });
  const body = (await req.json().catch(() => null)) as { period?: unknown } | null;
  const period: Period = body?.period === "yearly" ? "yearly" : "monthly";
  if (!priceId(period)) return NextResponse.json({ error: "unavailable" }, { status: 503 });
  const appUrl = appUrlFor(req);
  if (!appUrl) return NextResponse.json({ error: "unavailable" }, { status: 503 });
  try {
    return NextResponse.json({ url: await checkoutUrl(account, period, appUrl, await getLocale()) });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "stripe" }, { status: 502 });
  }
}
