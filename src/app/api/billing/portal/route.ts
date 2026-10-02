import { NextResponse } from "next/server";
import { getAccount } from "@/lib/accounts";
import { billingMode, portalUrl } from "@/lib/billing";
import { getSessionId } from "@/lib/session";
import { appUrlFor } from "@/lib/app-url";

/** Opens Stripe's customer portal: card, invoices, cancellation. */
export async function POST(req: Request) {
  const account = await getAccount(await getSessionId());
  const appUrl = appUrlFor(req);
  if (!billingMode() || !account?.stripeCustomerId || !appUrl) return NextResponse.json({ error: "unavailable" }, { status: 503 });
  try {
    return NextResponse.json({ url: await portalUrl(account.stripeCustomerId, appUrl) });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "stripe" }, { status: 502 });
  }
}
