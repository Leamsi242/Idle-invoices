import { decrypt, encrypt } from "./crypto";

/**
 * A Gmail scan too long for one request goes on in parts. Between parts, the short-lived Gmail
 * access (about an hour at most, read-only) stays encrypted in an httpOnly cookie of the user's
 * own browser for at most 10 minutes. It is revoked when the last part ends.
 */
export const GMAIL_SCAN_COOKIE = "sd_gmail_scan";
export const GMAIL_SCAN_MAX_AGE = 600;

export interface ScanProgress {
  token: string;
  session: string;
  next: number;
  total: number;
  scanned: number;
  receipts: number;
  /** Parts in a row that read nothing (Gmail refusing for its quota): the scan ends after 3. */
  stalls: number;
}

export const encodeProgress = (p: ScanProgress) => encrypt(JSON.stringify(p));

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
