import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { timingSafeEqual } from "node:crypto";
import { exchangeOutlookCode, outlookConfigured, scanOutlook } from "@/lib/outlook";
import { getSessionId } from "@/lib/session";
import { recompute, saveUpload } from "@/lib/store";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;

const OUTLOOK_COOKIE = "sd_outlook_oauth";
const same = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

export async function GET(req: Request) {
  const url = new URL(req.url);
  const back = (query: string) => {
    const res = NextResponse.redirect(`${url.origin}/?${query}`);
    res.cookies.delete({ name: OUTLOOK_COOKIE, path: "/api/outlook" });
    return res;
  };
  if (!outlookConfigured()) return back("mail=unavailable");
  const stored = (await cookies()).get(OUTLOOK_COOKIE)?.value ?? "";
  const [state, verifier] = stored.split(".");
  const code = url.searchParams.get("code");
  const sessionId = await getSessionId();
  if (!code || !state || !verifier || !sessionId || !same(state, url.searchParams.get("state") ?? "")) return back("mail=denied");
  if (!rateLimit(`outlook:${sessionId}`, 3, 60 * 60 * 1000).ok) return back("mail=limit");
  try {
    // The token only lives in this function: no refresh token was asked for, nothing is stored.
    const token = await exchangeOutlookCode(code, verifier, `${url.origin}/api/outlook/callback`);
    const { scanned, receipts } = await scanOutlook(token);
    await saveUpload(sessionId, `Outlook scan (${scanned} emails checked)`, "email", receipts);
    await recompute(sessionId);
    return back(`mail=ok&receipts=${receipts.length}&scanned=${scanned}`);
  } catch {
    return back("mail=error");
  }
}
