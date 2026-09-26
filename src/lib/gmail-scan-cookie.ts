import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import { decrypt, encrypt } from "./crypto";
import { revokeToken } from "./gmail";

/**
 * A Gmail scan too long for one request goes on in parts. Between parts, the short-lived Gmail
 * access (read-only, one hour at most) stays encrypted in an httpOnly cookie of the user's own
 * browser for at most 10 minutes. It is revoked when the last part ends, when the user leaves the
 * page, starts again or deletes everything; otherwise Google ends it within the hour.
 * The cookie is scoped to /api so that "Delete everything" (DELETE /api/data) can revoke it too.
 */
export const GMAIL_SCAN_COOKIE = "sd_gmail_scan";
const MAX_AGE = 600;
const PATH = "/api";

export interface ScanProgress {
  token: string;
  session: string;
  /** Where the next part starts: the id of the next email (the list may shift between parts), and its position. */
  next: number;
  nextId?: string;
  total: number;
  scanned: number;
  receipts: number;
  /** Parts in a row that read nothing (Gmail refusing for its quota): the scan ends after 3. */
  stalls: number;
}

export function decodeProgress(value: string | undefined): ScanProgress | null {
  if (!value) return null;
  try {
    const p = JSON.parse(decrypt(value));
    if (typeof p.token !== "string" || typeof p.session !== "string" || !Number.isInteger(p.next)) return null;
    return p as ScanProgress;
  } catch {
    return null;
  }
}

export function setProgress(res: NextResponse, p: ScanProgress) {
  res.cookies.set(GMAIL_SCAN_COOKIE, encrypt(JSON.stringify(p)), { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: PATH, maxAge: MAX_AGE });
}

export function clearProgress(res: NextResponse) {
  res.cookies.delete({ name: GMAIL_SCAN_COOKIE, path: PATH });
}

/** Revokes the access of a scan still in progress in this browser, if any. */
export async function revokeScanInProgress(): Promise<boolean> {
  const progress = decodeProgress((await cookies()).get(GMAIL_SCAN_COOKIE)?.value);
  if (progress) await revokeToken(progress.token);
  return !!progress;
}
