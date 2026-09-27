import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";
import { SESSION_COOKIE } from "@/lib/session";
import { deleteEverything, recompute, saveUpload } from "@/lib/store";
import { demoPaypalTransactions, demoTransactions } from "@/lib/banking/demo";
import { connectionFileName } from "@/lib/banking";
import { DEMO_COOKIE, REAL_COOKIE } from "@/lib/demo-mode";
import { rateLimit } from "@/lib/rate-limit";

// As long as the session itself: a demo left open for days must still find the way back.
const cookie = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/", maxAge: 30 * 86_400 };
const VALID = /^[0-9a-f-]{36}$/;

/**
 * Try the whole app without connecting anything: a fresh session filled with a made-up bank and
 * PayPal account. The user's own session, if any, is set aside and comes back when they leave.
 */
export async function POST(req: Request) {
  const jar = await cookies();
  if (jar.get(DEMO_COOKIE)) return NextResponse.json({ ok: true });
  // Each demo writes a whole made-up history: a few per address are plenty.
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const limit = rateLimit(`demo:${ip}`, 5, 10 * 60_000);
  if (!limit.ok) return NextResponse.json({ error: "Too many demos. Please wait a few minutes." }, { status: 429, headers: { "Retry-After": String(limit.retryAfter) } });
  const real = jar.get(SESSION_COOKIE)?.value;
  const demo = randomUUID();
  const today = new Date().toISOString().slice(0, 10);
  await saveUpload(demo, connectionFileName("Demo bank (test data)", 1), "bank", demoTransactions(today).transactions);
  await saveUpload(demo, connectionFileName("Demo PayPal (test data)", 1), "paypal", demoPaypalTransactions(today).transactions);
  await recompute(demo);
  const res = NextResponse.json({ ok: true });
  if (real && VALID.test(real)) res.cookies.set(REAL_COOKIE, real, cookie);
  res.cookies.set(SESSION_COOKIE, demo, cookie);
  res.cookies.set(DEMO_COOKIE, "1", cookie);
  return res;
}

/** Leave the demo: its made-up data is deleted and the user's own session comes back. */
export async function DELETE() {
  const jar = await cookies();
  if (!jar.get(DEMO_COOKIE)) return NextResponse.json({ ok: true });
  const demo = jar.get(SESSION_COOKIE)?.value;
  const real = jar.get(REAL_COOKIE)?.value;
  // Never delete the session that is about to come back.
  if (demo && demo !== real) await deleteEverything(demo);
  const res = NextResponse.json({ ok: true });
  if (real && VALID.test(real)) res.cookies.set(SESSION_COOKIE, real, cookie);
  else res.cookies.delete(SESSION_COOKIE);
  res.cookies.delete(REAL_COOKIE);
  res.cookies.delete(DEMO_COOKIE);
  return res;
}
