import type { NormalizedTransaction } from "./types";
import { MAX_MESSAGES, receiptFromRaw, type ScanResult } from "./gmail";

/**
 * One-time, read-only scan of an Outlook.com / Hotmail / Microsoft 365 mailbox through
 * Microsoft Graph, the same way as Gmail: receipts only, emails never stored. We ask for
 * Mail.Read without offline_access, so there is no refresh token and the access token (about
 * an hour) is never stored; Microsoft offers no endpoint to revoke a single access token.
 */
export const OUTLOOK_SCOPE = "https://graph.microsoft.com/Mail.Read";
const AUTHORITY = "https://login.microsoftonline.com/common/oauth2/v2.0";
const GRAPH = "https://graph.microsoft.com/v1.0/me";

// Same subjects as the Gmail query, in Graph's search syntax (KQL).
export const OUTLOOK_SEARCH = [
  "receipt", "invoice", "facture", "reçu", "payment", "paiement", "subscription", "abonnement", "renewal", "renouvellement",
  "trial", "essai", "membership", "billing", "facturation", "commande", "annulé", "cancelled", "canceled", "résiliation",
].map((w) => `subject:${w}`).join(" OR ");

type Fetch = typeof fetch;

export function outlookConfigured(): boolean {
  return !!(process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET);
}

export function outlookAuthUrl(opts: { clientId: string; redirectUri: string; state: string; codeChallenge: string }): string {
  const p = new URLSearchParams({
    client_id: opts.clientId,
    response_type: "code",
    redirect_uri: opts.redirectUri,
    response_mode: "query",
    scope: OUTLOOK_SCOPE,
    state: opts.state,
    code_challenge: opts.codeChallenge,
    code_challenge_method: "S256",
    prompt: "select_account",
  });
  return `${AUTHORITY}/authorize?${p}`;
}

export async function exchangeOutlookCode(code: string, verifier: string, redirectUri: string, f: Fetch = fetch): Promise<string> {
  const res = await f(`${AUTHORITY}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.MICROSOFT_CLIENT_ID!,
      client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
      code,
      code_verifier: verifier,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
      scope: OUTLOOK_SCOPE,
    }),
  });
  if (!res.ok) throw new Error(`Microsoft token error ${res.status}`);
  return ((await res.json()) as { access_token: string }).access_token;
}

async function get(url: string, token: string, f: Fetch): Promise<Response> {
  const res = await f(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Microsoft Graph error ${res.status}`);
  return res;
}

export async function listOutlookIds(token: string, f: Fetch = fetch, max = MAX_MESSAGES): Promise<string[]> {
  const ids: string[] = [];
  let next: string | undefined = `${GRAPH}/messages?$search=${encodeURIComponent(`"${OUTLOOK_SEARCH}"`)}&$select=id&$top=100`;
  while (next && ids.length < max) {
    const page = (await (await get(next, token, f)).json()) as { value: { id: string }[]; "@odata.nextLink"?: string };
    ids.push(...page.value.map((m) => m.id));
    next = page["@odata.nextLink"];
  }
  return ids.slice(0, max);
}

/** Downloads each candidate as MIME (the same format as a .eml file) and keeps the receipts. */
export async function scanOutlook(token: string, f: Fetch = fetch): Promise<ScanResult> {
  const ids = await listOutlookIds(token, f);
  const receipts: NormalizedTransaction[] = [];
  for (let i = 0; i < ids.length; i += 10) {
    const batch = await Promise.all(
      ids.slice(i, i + 10).map(async (id) => receiptFromRaw(Buffer.from(await (await get(`${GRAPH}/messages/${id}/$value`, token, f)).arrayBuffer()))),
    );
    receipts.push(...batch.filter((t): t is NormalizedTransaction => !!t));
  }
  return { scanned: ids.length, receipts };
}
