import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { revokeToken, scanGmail } from "@/lib/gmail";
import { getSessionId } from "@/lib/session";
import { recompute, saveUpload } from "@/lib/store";
import { rateLimit } from "@/lib/rate-limit";
import { decodeProgress, encodeProgress, GMAIL_SCAN_COOKIE, GMAIL_SCAN_MAX_AGE } from "@/lib/gmail-scan-cookie";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_STALLS = 3;

/** The next part of a long Gmail scan. Returns the progress; the last part revokes the access. */
export async function POST() {
  const jar = await cookies();
  const progress = decodeProgress(jar.get(GMAIL_SCAN_COOKIE)?.value);
  const sessionId = await getSessionId();
  if (!progress || !sessionId || progress.session !== sessionId) return NextResponse.json({ error: "No scan in progress." }, { status: 404 });
  if (!rateLimit(`gmail-part:${sessionId}`, 30, 60 * 60 * 1000).ok) return NextResponse.json({ error: "Too many requests." }, { status: 429 });

  const end = async (body: Record<string, unknown>, status = 200) => {
    await revokeToken(progress.token);
    const res = NextResponse.json(body, { status });
    res.cookies.delete({ name: GMAIL_SCAN_COOKIE, path: "/api/gmail" });
    return res;
  };
  try {
    const part = await scanGmail(progress.token, fetch, { from: progress.next });
    await saveUpload(sessionId, `Gmail scan (${part.scanned} emails checked)`, "email", part.receipts);
    await recompute(sessionId);
    const done = {
      ...progress,
      scanned: progress.scanned + part.scanned,
      receipts: progress.receipts + part.receipts.length,
      total: part.total,
      stalls: part.scanned === 0 ? progress.stalls + 1 : 0,
    };
    // Finished, or Gmail keeps refusing: what was read is kept, and the access is revoked.
    if (part.next === undefined || done.stalls >= MAX_STALLS) return end({ done: true, scanned: done.scanned, receipts: done.receipts, total: done.total });
    const res = NextResponse.json({ done: false, scanned: done.scanned, total: done.total });
    res.cookies.set(GMAIL_SCAN_COOKIE, encodeProgress({ ...done, next: part.next }), { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/api/gmail", maxAge: GMAIL_SCAN_MAX_AGE });
    return res;
  } catch (e) {
    console.error("Gmail scan part failed:", e instanceof Error ? e.message : "unknown");
    return end({ error: "The Gmail scan failed." }, 502);
  }
}
