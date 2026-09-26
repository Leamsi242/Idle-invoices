import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { bankingConfigured, psuHeaders, startConnection } from "@/lib/banking";
import { BANK_COOKIE, encodePending } from "@/lib/banking/cookie";
import { getOrCreateSessionId } from "@/lib/session";
import { rateLimit } from "@/lib/rate-limit";

/** Starts a read-only bank connection: returns the bank's sign-in page. Body: { name, country }. */
export async function POST(req: Request) {
  if (!bankingConfigured()) return NextResponse.json({ error: "Bank connection is not configured." }, { status: 404 });
  const body = await req.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 120) : "";
  const country = typeof body.country === "string" ? body.country.toUpperCase() : "";
  if (!name || !/^[A-Z]{2}$/.test(country)) return NextResponse.json({ error: "Choose a bank." }, { status: 400 });
  const sessionId = await getOrCreateSessionId();
  if (!rateLimit(`bank:${sessionId}`, 10, 60 * 60 * 1000).ok) return NextResponse.json({ error: "Too many connections this hour. Please try again later." }, { status: 429 });
  const origin = new URL(req.url).origin;
  const state = randomBytes(16).toString("base64url");
  const psu = psuHeaders(req);
  try {
    const url = await startConnection({ name, country }, `${origin}/api/bank/callback`, state, psu);
    const res = NextResponse.json({ url });
    res.cookies.set(BANK_COOKIE, encodePending(state, { name, country }), { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/api/bank", maxAge: 900 });
    return res;
  } catch {
    return NextResponse.json({ error: "This bank cannot be reached right now. Please try again." }, { status: 502 });
  }
}
