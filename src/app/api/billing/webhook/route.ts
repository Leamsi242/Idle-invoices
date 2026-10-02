import { NextResponse } from "next/server";
import { handleEvent, verifySignature } from "@/lib/billing";

export const runtime = "nodejs";

/**
 * Stripe's events (address to give in Stripe: /api/billing/webhook). The signature is checked on
 * the raw body before anything is read; the plan of an account only changes here.
 */
export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "unavailable" }, { status: 503 });
  const payload = await req.text();
  if (!verifySignature(payload, req.headers.get("stripe-signature"), secret)) return NextResponse.json({ error: "signature" }, { status: 400 });
  const event = JSON.parse(payload);
  const result = await handleEvent(event);
  return NextResponse.json({ received: true, result });
}
