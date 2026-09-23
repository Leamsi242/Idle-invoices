import { simpleParser } from "mailparser";
import type { NormalizedTransaction } from "./types";
import { looksLikeReceipt, parseEml } from "./parsers/email";

/**
 * One-time, read-only Gmail scan (SPEC.md lists inbox connection for later; this is the
 * prototype version). The access token lives only for the duration of the scan: it is never
 * stored, and it is revoked as soon as the scan ends. Only the fields of receipts we recognise
 * are kept, exactly as for uploaded .eml files.
 */
export const GMAIL_SCOPE = "https://www.googleapis.com/auth/gmail.readonly";

// Subjects of receipts, invoices and billing emails, in English and French, over the last year.
export const GMAIL_QUERY =
  "newer_than:1y -in:spam -in:trash subject:(receipt OR invoice OR facture OR reçu OR payment OR paiement OR subscription OR abonnement OR renewal OR renouvellement OR trial OR essai OR membership OR billing OR facturation)";

export const MAX_MESSAGES = 300;

export function gmailConfigured(): boolean {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

type Fetch = typeof fetch;
const API = "https://gmail.googleapis.com/gmail/v1/users/me";

async function getJson<T>(url: string, token: string, f: Fetch): Promise<T> {
  const res = await f(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Gmail API error ${res.status}`);
  return (await res.json()) as T;
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

export interface ScanResult { scanned: number; receipts: NormalizedTransaction[] }

/** Downloads each candidate email, keeps the ones that read as receipts, and discards the rest. */
export async function scanGmail(token: string, f: Fetch = fetch): Promise<ScanResult> {
  const ids = await listMessageIds(token, f);
  const receipts: NormalizedTransaction[] = [];
  for (let i = 0; i < ids.length; i += 10) {
    const batch = await Promise.all(
      ids.slice(i, i + 10).map(async (id) => {
        const msg = await getJson<{ raw: string }>(`${API}/messages/${id}?format=raw`, token, f);
        const raw = Buffer.from(msg.raw, "base64url");
        try {
          const mail = await simpleParser(raw);
          const body = mail.text ?? (typeof mail.html === "string" ? mail.html.replace(/<[^>]+>/g, " ") : "");
          if (!looksLikeReceipt(mail.subject ?? "", body)) return null;
          return await parseEml(raw);
        } finally {
          raw.fill(0);
        }
      }),
    );
    receipts.push(...batch.filter((t): t is NormalizedTransaction => !!t));
  }
  return { scanned: ids.length, receipts };
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
