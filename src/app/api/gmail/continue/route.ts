import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { revokeToken, scanGmail } from "@/lib/gmail";
import { getSessionId } from "@/lib/session";
import { recompute, saveUpload, sessionHasData } from "@/lib/store";
import { rateLimit } from "@/lib/rate-limit";
import { clearProgress, decodeProgress, GMAIL_SCAN_COOKIE, setProgress } from "@/lib/gmail-scan-cookie";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_STALLS = 3;

/**
 * The next part of a long Gmail scan. Answers { done: false, scanned, total } while there is more,
 * or { done: true, scanned, receipts } at the end. Every way out but "more to read" revokes the
 * access and clears the cookie; `cut: true` means it stopped early, with what was read kept.
 */
export async function POST() {
  const progress = decodeProgress((await cookies()).get(GMAIL_SCAN_COOKIE)?.value);
  if (!progress) return NextResponse.json({ error: "No scan in progress." }, { status: 404 });
  const end = async (body: Record<string, unknown>) => {
    await revokeToken(progress.token);
    const res = NextResponse.json({ done: true, ...body });
    clearProgress(res);
    return res;
  };
  const sessionId = await getSessionId();
  // Deleted meanwhile ("Delete everything"), or another browser session: nothing is read or kept.
  if (!sessionId || progress.session !== sessionId) return end({ gone: true });
  const totals = { scanned: progress.scanned, receipts: progress.receipts };
  if (!rateLimit(`gmail-part:${sessionId}`, 30, 60 * 60 * 1000).ok) return end({ ...totals, cut: true });

  try {
    const part = await scanGmail(progress.token, fetch, { from: progress.next, fromId: progress.nextId });
    // "Delete everything" may have run while this part was reading: keep nothing then.
    if (!(await sessionHasData(sessionId))) return end({ gone: true });
    await saveUpload(sessionId, `Gmail scan (${part.scanned} emails checked)`, "email", part.receipts);
    await recompute(sessionId);
    const now = {
      ...progress,
      scanned: progress.scanned + part.scanned,
      receipts: progress.receipts + part.receipts.length,
      total: part.total,
      stalls: part.scanned === 0 ? progress.stalls + 1 : 0,
    };
    if (part.next === undefined) return end({ scanned: now.scanned, receipts: now.receipts });
    // Gmail keeps refusing for its quota: what was read is kept.
    if (now.stalls >= MAX_STALLS) return end({ scanned: now.scanned, receipts: now.receipts, cut: true });
    const res = NextResponse.json({ done: false, scanned: now.scanned, total: now.total });
    setProgress(res, { ...now, next: part.next, nextId: part.nextId });
    return res;
  } catch (e) {
    // Status codes only. A 401 means the access was revoked meanwhile (the user left or started again).
    console.error("Gmail scan part failed:", e instanceof Error ? e.message : "unknown");
    return end({ ...totals, cut: true });
  }
}
