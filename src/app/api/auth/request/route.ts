import { NextResponse } from "next/server";
import { normalizeEmail, requestLogin } from "@/lib/accounts";
import { lookupHash } from "@/lib/crypto";
import { rateLimit } from "@/lib/rate-limit";
import { emailConfigured } from "@/lib/notify";
import { getLocale } from "@/lib/locale";
import { appUrlFor } from "@/lib/app-url";

/**
 * Sends a sign-in link. The answer is the same whether the address has an account or not, so the
 * form cannot be used to find out who uses the app.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { email?: unknown } | null;
  const email = normalizeEmail(body?.email);
  if (!email) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "local";
  const byIp = rateLimit(`login-ip:${ip}`, 10, 15 * 60_000);
  const byEmail = rateLimit(`login-mail:${lookupHash(email)}`, 3, 15 * 60_000);
  if (!byIp.ok || !byEmail.ok) return NextResponse.json({ error: "too-many" }, { status: 429, headers: { "Retry-After": String(Math.max(byIp.retryAfter, byEmail.retryAfter)) } });
  const appUrl = appUrlFor(req);
  if (!appUrl || (process.env.NODE_ENV === "production" && !emailConfigured())) return NextResponse.json({ error: "unavailable" }, { status: 503 });
  const { devLink } = await requestLogin({ email, appUrl, locale: await getLocale() });
  return NextResponse.json({ ok: true, ...(devLink ? { devLink } : {}) });
}
