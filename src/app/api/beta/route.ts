import { NextResponse } from "next/server";
import { BETA_COOKIE, OWNER_COOKIE, betaRules, codeToken } from "@/lib/beta";
import { rateLimit } from "@/lib/rate-limit";

const cookie = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/", maxAge: 180 * 86_400 };

function matches(given: unknown): boolean {
  const { code } = betaRules();
  return !!code && typeof given === "string" && given.trim().toLowerCase() === code.toLowerCase();
}

/** The owner's own code: lifts every beta limit in this browser. Case-sensitive, never in a link. */
function isOwnerCode(given: unknown): boolean {
  const owner = process.env.BETA_OWNER_CODE?.trim();
  return !!owner && typeof given === "string" && given.trim() === owner;
}

/** The invitation code typed on the Sources page. A few tries per address, so it cannot be guessed. */
export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!rateLimit(`beta:${ip}`, 10, 15 * 60_000).ok) return NextResponse.json({ ok: false }, { status: 429 });
  const { code } = await req.json().catch(() => ({}));
  if (isOwnerCode(code)) {
    const res = NextResponse.json({ ok: true });
    res.cookies.set(OWNER_COOKIE, codeToken(`owner:${process.env.BETA_OWNER_CODE!.trim()}`), cookie);
    return res;
  }
  if (!matches(code)) return NextResponse.json({ ok: false }, { status: 403 });
  const res = NextResponse.json({ ok: true });
  res.cookies.set(BETA_COOKIE, codeToken(betaRules().code), cookie);
  return res;
}

/** An invitation link, /api/beta?code=…, opens the app with the code already given. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const res = NextResponse.redirect(new URL(matches(url.searchParams.get("code")) ? "/" : "/?beta=code", url));
  if (matches(url.searchParams.get("code"))) res.cookies.set(BETA_COOKIE, codeToken(betaRules().code), cookie);
  return res;
}
