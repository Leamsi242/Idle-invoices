import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { timingSafeEqual } from "node:crypto";
import { exchangeCode, gmailConfigured, revokeToken, scanGmail } from "@/lib/gmail";
import { getSessionId } from "@/lib/session";
import { recompute, saveUpload } from "@/lib/store";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;

const GMAIL_COOKIE = "sd_gmail_oauth";
const same = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

export async function GET(req: Request) {
  const url = new URL(req.url);
  const back = (query: string) => {
    const res = NextResponse.redirect(`${url.origin}/?${query}`);
    res.cookies.delete({ name: GMAIL_COOKIE, path: "/api/gmail" });
    return res;
  };
  if (!gmailConfigured()) return back("gmail=unavailable");
  const stored = (await cookies()).get(GMAIL_COOKIE)?.value ?? "";
  const [state, verifier] = stored.split(".");
  const code = url.searchParams.get("code");
  const sessionId = await getSessionId();
  if (!code || !state || !verifier || !sessionId || !same(state, url.searchParams.get("state") ?? "")) return back("gmail=denied");
  if (!rateLimit(`gmail:${sessionId}`, 3, 60 * 60 * 1000).ok) return back("gmail=limit");

  let token: string | null = null;
  try {
    token = await exchangeCode(code, verifier, `${url.origin}/api/gmail/callback`);
    const { scanned, receipts } = await scanGmail(token);
    await saveUpload(sessionId, `Gmail scan (${scanned} emails checked)`, "email", receipts);
    await recompute(sessionId);
    return back(`gmail=ok&receipts=${receipts.length}&scanned=${scanned}`);
  } catch {
    return back("gmail=error");
  } finally {
    if (token) await revokeToken(token);
  }
}
