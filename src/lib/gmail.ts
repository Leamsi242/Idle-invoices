import { simpleParser } from "mailparser";
import type { NormalizedTransaction } from "./types";
import { looksLikeReceipt, parseEml } from "./parsers/email";

/**
 * One-time, read-only Gmail scan (SPEC.md lists inbox connection for later; this is the
 * prototype version). It covers the whole mailbox, newest first, up to MAX_MESSAGES emails.
 * The access token lives only for the duration of the scan: it is never
 * stored, and it is revoked as soon as the scan ends. Only the fields of receipts we recognise
 * are kept, exactly as for uploaded .eml files.
 */
export const GMAIL_SCOPE = "https://www.googleapis.com/auth/gmail.readonly";

// Subjects of receipts, invoices, billing, trial and cancellation emails, in English and French,
// over the whole mailbox (Gmail returns the newest first).
export const GMAIL_QUERY =
  "-in:spam -in:trash subject:(receipt OR invoice OR facture OR reçu OR payment OR paiement OR subscription OR abonnement OR renewal OR renouvellement OR trial OR essai OR membership OR billing OR facturation OR commande OR annulé OR cancelled OR canceled OR résiliation)";

export const MAX_MESSAGES = 500;

export function gmailConfigured(): boolean {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

type Fetch = typeof fetch;
const API = "https://gmail.googleapis.com/gmail/v1/users/me";

class RateLimited extends Error {}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * One Gmail API call. Gmail limits reads per user and per minute: a "rate limit" answer is retried
 * after a pause (1, 2, then 4 times `backoffMs`) as long as the pause ends before `deadline`.
 */
async function getJson<T>(url: string, token: string, f: Fetch, retry: { backoffMs: number; deadline: number } = { backoffMs: 1_000, deadline: Infinity }): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    const res = await f(url, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) return (await res.json()) as T;
    const limited = res.status === 429 || (res.status === 403 && /rate ?limit/i.test(await res.text().catch(() => "")));
    const wait = retry.backoffMs * 2 ** attempt;
    if (limited && attempt < 3 && Date.now() + wait < retry.deadline) {
      await sleep(wait);
      continue;
    }
    throw limited ? new RateLimited(`Gmail API rate limit ${res.status}`) : new Error(`Gmail API error ${res.status}`);
  }
}

export async function listMessageIds(token: string, f: Fetch = fetch, max = MAX_MESSAGES): Promise<string[]> {
  const ids: string[] = [];
  let pageToken: string | undefined;
  do {
    const url = `${API}/messages?maxResults=100&q=${encodeURIComponent(GMAIL_QUERY)}${pageToken ? `&pageToken=${pageToken}` : ""}`;
    const page = await getJson<{ messages?: { id: string }[]; nextPageToken?: string }>(url, token, f);
    ids.push(...(page.messages ?? []).map((m) => m.id));
    pageToken = page.nextPageToken;
  } while (pageToken && ids.length < max);
  return ids.slice(0, max);
}

/**
 * `next` and `nextId`: where a scan cut short resumes (position, and id of that email, since the
 * list can shift between parts); `total`: candidate emails in all.
 */
export interface ScanResult { scanned: number; receipts: NormalizedTransaction[]; next?: number; nextId?: string; total: number }

export interface ScanOptions {
  /** The first candidate to read (0, or the `next` of a previous part)... */
  from?: number;
  /** ...found by its id when it is still listed: an email moved to the bin shifts the positions. */
  fromId?: string;
  /** No new download starts after this time: a server function has about a minute. */
  deadline?: number;
  /** The shortest time per batch of 10 downloads, to stay within Gmail's per-minute quota. */
  batchMs?: number;
  backoffMs?: number;
}

const BATCH = 10;
// Since May 2026 a message read costs 20 of the 6,000 quota units a user gets per minute: about
// 300 reads a minute at most. Ten every 2.4 seconds is 250.
const BATCH_MS = 2_400;

/**
 * Keeps an email only if it reads as a receipt or a cancellation notice (amount 0, evidence that
 * a subscription stopped), with the same fields as an uploaded .eml. The raw email is wiped.
 */
export async function receiptFromRaw(raw: Buffer): Promise<NormalizedTransaction | null> {
  try {
    const mail = await simpleParser(raw);
    const body = mail.text ?? (typeof mail.html === "string" ? mail.html.replace(/<[^>]+>/g, " ") : "");
    if (!looksLikeReceipt(mail.subject ?? "", body)) return null;
    return await parseEml(raw);
  } finally {
    raw.fill(0);
  }
}

/**
 * Downloads each candidate email, keeps the ones that read as receipts, and discards the rest. The
 * newest come first. A mailbox with many candidates is read in parts: the scan stops at `deadline`
 * (or when Gmail keeps refusing for its quota) and returns `next`, where the following part starts.
 */
export async function scanGmail(token: string, f: Fetch = fetch, opts: ScanOptions = {}): Promise<ScanResult> {
  const { deadline = Date.now() + 45_000, batchMs = BATCH_MS, backoffMs = 1_000 } = opts;
  const ids = await listMessageIds(token, f);
  const receipts: NormalizedTransaction[] = [];
  const byId = opts.fromId ? ids.indexOf(opts.fromId) : -1;
  const from = byId >= 0 ? byId : Math.min(opts.from ?? 0, ids.length);
  let i = from;
  while (i < ids.length && Date.now() < deadline) {
    const started = Date.now();
    const chunk = ids.slice(i, i + BATCH);
    const batch = await Promise.all(
      chunk.map(async (id) => {
        try {
          const msg = await getJson<{ raw: string }>(`${API}/messages/${id}?format=raw`, token, f, { backoffMs, deadline });
          return receiptFromRaw(Buffer.from(msg.raw, "base64url"));
        } catch (e) {
          if (e instanceof RateLimited) return "limited" as const;
          throw e;
        }
      }),
    );
    // Still refused after the pauses: the whole batch is read again in the next part.
    if (batch.includes("limited")) break;
    receipts.push(...batch.filter((t): t is NormalizedTransaction => !!t && t !== "limited"));
    i += chunk.length;
    const wait = batchMs - (Date.now() - started);
    if (wait > 0 && i < ids.length) {
      if (Date.now() + wait >= deadline) break;
      await sleep(wait);
    }
  }
  return { scanned: i - from, receipts, next: i < ids.length ? i : undefined, nextId: ids[i], total: ids.length };
}

export function authUrl(opts: { clientId: string; redirectUri: string; state: string; codeChallenge: string }): string {
  const p = new URLSearchParams({
    client_id: opts.clientId,
    redirect_uri: opts.redirectUri,
    response_type: "code",
    scope: GMAIL_SCOPE,
    access_type: "online", // no refresh token: access ends with the scan
    include_granted_scopes: "false",
    state: opts.state,
    code_challenge: opts.codeChallenge,
    code_challenge_method: "S256",
    prompt: "consent",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${p}`;
}

export async function exchangeCode(code: string, verifier: string, redirectUri: string, f: Fetch = fetch): Promise<string> {
  const res = await f("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      code_verifier: verifier,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) throw new Error(`Google token error ${res.status}`);
  const json = (await res.json()) as { access_token: string; scope?: string };
  if (json.scope && !json.scope.split(" ").includes(GMAIL_SCOPE)) throw new Error("Gmail read access was not granted");
  return json.access_token;
}

export async function revokeToken(token: string, f: Fetch = fetch): Promise<void> {
  await f(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`, { method: "POST" }).catch(() => undefined);
}
