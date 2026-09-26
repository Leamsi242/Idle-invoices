import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { timingSafeEqual } from "node:crypto";
import { exchangeCode, gmailConfigured, revokeToken, scanGmail } from "@/lib/gmail";
import { getSessionId } from "@/lib/session";
import { recompute, saveUpload } from "@/lib/store";
import { rateLimit } from "@/lib/rate-limit";
import { revokeScanInProgress, setProgress } from "@/lib/gmail-scan-cookie";

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
  let keepToken = false;
  try {
    // A scan still running in this browser (started again from another tab): its access ends now.
    await revokeScanInProgress();
    token = await exchangeCode(code, verifier, `${url.origin}/api/gmail/callback`);
    const { scanned, receipts, next, nextId, total } = await scanGmail(token);
    await saveUpload(sessionId, `Gmail scan (${scanned} emails checked)`, "email", receipts);
    await recompute(sessionId);
    if (next === undefined) return back(`gmail=ok&receipts=${receipts.length}&scanned=${scanned}`);
    // A large mailbox: the home page carries on reading in parts, then the access is revoked.
    keepToken = true;
    const res = back(`gmail=partial&scanned=${scanned}&total=${total}`);
    setProgress(res, { token, session: sessionId, next, nextId, total, scanned, receipts: receipts.length, stalls: scanned === 0 ? 1 : 0 });
    return res;
  } catch (e) {
    // Status codes only ("Gmail API error 403"): no email content is ever in these messages.
    console.error("Gmail scan failed:", e instanceof Error ? e.message : "unknown");
    return back("gmail=error");
  } finally {
    if (token && !keepToken) await revokeToken(token);
  }
}
