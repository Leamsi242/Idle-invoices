import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { bankingConfigured, psuHeaders, startConnection } from "@/lib/banking";
import { BANK_COOKIE, encodePending } from "@/lib/banking/cookie";
import { getOrCreateSessionId } from "@/lib/session";
import { rateLimit } from "@/lib/rate-limit";
import { betaCheck } from "@/lib/beta";
import { encrypt } from "@/lib/crypto";
import { getLocale } from "@/lib/locale";

/** Starts a read-only bank connection: returns the bank's sign-in page. Body: { name, country, watch? }. */
export async function POST(req: Request) {
  if (!bankingConfigured()) return NextResponse.json({ error: "Bank connection is not configured." }, { status: 404 });
  const body = await req.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 120) : "";
  const country = typeof body.country === "string" ? body.country.toUpperCase() : "";
  const watch = body.watch === true;
  if (!name || !/^[A-Z]{2}$/.test(country)) return NextResponse.json({ error: "Choose a bank." }, { status: 400 });
  const sessionId = await getOrCreateSessionId();
  if (!rateLimit(`bank:${sessionId}`, 10, 60 * 60 * 1000).ok) return NextResponse.json({ error: "Too many connections this hour. Please try again later." }, { status: 429 });
  // The made-up banks (local demo) use no provider: no beta rule applies to them.
  if (!name.includes("(test data)")) {
    const refusal = (await betaCheck("bank", sessionId)) ?? (watch ? await betaCheck("watch", sessionId) : null);
    if (refusal) return NextResponse.json({ error: "Beta limit", beta: refusal }, { status: 403 });
  }
  const origin = new URL(req.url).origin;
  // Hex: Bridge sends it back as its "context", which accepts letters, digits and hyphens only.
  const state = randomBytes(16).toString("hex");
  const psu = psuHeaders(req);
  try {
    const { url, days, ctx } = await startConnection({ name, country }, `${origin}/api/bank/callback`, state, psu, watch, await getLocale());
    const res = NextResponse.json({ url });
    res.cookies.set(BANK_COOKIE, encodePending(state, { name, country }, watch, days, ctx ? encrypt(ctx) : undefined), { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/api/bank", maxAge: 900 });
    return res;
  } catch {
    return NextResponse.json({ error: "This bank cannot be reached right now. Please try again." }, { status: 502 });
  }
}
