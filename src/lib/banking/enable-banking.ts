import { createSign } from "node:crypto";
import type { BankAccess, BankProvider, BankRead, Institution, PsuContext } from "./types";
import type { NormalizedTransaction } from "../types";
import { makeTx } from "../parsers/common";
import { NOT_A_PAYMENT, PERSONAL_MAILBOX, paypalPayment } from "../parsers/paypal-csv";

/**
 * Enable Banking (api.enablebanking.com), a licensed PSD2 account information provider with
 * self-serve sign-up. Requests are authenticated with a short JWT signed (RS256) by the
 * application's private key; the application id is the key id.
 */
const API = "https://api.enablebanking.com";

export class EnableBankingError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}
type Fetch = typeof fetch;
interface ReadStats { raw: number; pending: number; skipped: number; fields: Set<string> }

function mergeStats(into: ReadStats, from: ReadStats) {
  into.raw += from.raw;
  into.pending += from.pending;
  into.skipped += from.skipped;
  for (const f of from.fields) into.fields.add(f);
}

export function enableBankingConfigured(): boolean {
  return !!(process.env.ENABLE_BANKING_APP_ID && process.env.ENABLE_BANKING_PRIVATE_KEY);
}

const b64url = (data: string | Buffer) => Buffer.from(data).toString("base64url");

export function jwt(appId: string, privateKeyPem: string, now = Math.floor(Date.now() / 1000)): string {
  const header = b64url(JSON.stringify({ typ: "JWT", alg: "RS256", kid: appId }));
  const body = b64url(JSON.stringify({ iss: "enablebanking.com", aud: "api.enablebanking.com", iat: now, exp: now + 3600 }));
  const signature = createSign("RSA-SHA256").update(`${header}.${body}`).sign(privateKeyPem).toString("base64url");
  return `${header}.${body}.${signature}`;
}

/** An Enable Banking transaction (Berlin Group style fields). */
export interface EbTransaction {
  entry_reference?: string;
  transaction_amount: { amount: string; currency: string };
  credit_debit_indicator: "DBIT" | "CRDT";
  status?: string; // BOOK or PDNG
  booking_date?: string;
  value_date?: string;
  transaction_date?: string;
  creditor?: { name?: string | null; contact_details?: { email_address?: string | null } | null } | null;
  debtor?: { name?: string | null } | null;
  remittance_information?: string[] | null;
  note?: string | null;
  bank_transaction_code?: { description?: string | null; code?: string | null; sub_code?: string | null } | null;
}

/** What a connection reads: an ordinary account, or a PayPal account (payments named after the payee). */
export type AccountKind = "bank" | "paypal";

/** Card lines keep the merchant in the remittance text ("CB NETFLIX.COM 12/07"); transfers name the creditor. */
export function toTransaction(t: EbTransaction): NormalizedTransaction | null {
  const date = t.booking_date ?? t.value_date ?? t.transaction_date;
  const amount = Math.abs(Number(t.transaction_amount?.amount));
  if (!date || !Number.isFinite(amount) || amount === 0 || t.status === "PDNG") return null;
  const debit = t.credit_debit_indicator === "DBIT";
  const counterpart = (debit ? t.creditor?.name : t.debtor?.name) ?? "";
  // Card issuers (American Express) may leave the remittance empty and name the merchant elsewhere.
  const text = (t.remittance_information ?? []).join(" ").trim() || t.note?.trim() || t.bank_transaction_code?.description?.trim() || "";
  const label = text && counterpart && !text.toUpperCase().includes(counterpart.toUpperCase()) ? `${counterpart} ${text}` : text || counterpart;
  if (!label) return null;
  return makeTx({ date: date.slice(0, 10), amount: debit ? amount : -amount, currency: t.transaction_amount.currency || "EUR", rawLabel: label, source: "bank" });
}

/**
 * A PayPal account read through PSD2: each payment names the real payee (creditor), with the date
 * in transaction_date only. The same rules as the PayPal Activity download apply, and the row is
 * built the same way, so that a connection and a CSV give identical rows.
 */
export function toPaypalTransaction(t: EbTransaction): NormalizedTransaction | null {
  const date = t.transaction_date ?? t.booking_date ?? t.value_date;
  const amount = Math.abs(Number(t.transaction_amount?.amount));
  const name = t.creditor?.name?.trim();
  // Money in (refunds, top-ups) and lines without a payee (a payout to the user's own bank) are not payments.
  if (!date || !Number.isFinite(amount) || amount === 0 || t.credit_debit_indicator !== "DBIT" || !name) return null;
  if (t.status && t.status !== "BOOK") return null;
  // The type only, never the payee: "WeTransfer" is a merchant, not a transfer.
  const type = [t.bank_transaction_code?.description, t.bank_transaction_code?.code, t.bank_transaction_code?.sub_code].filter(Boolean).join(" ");
  if (NOT_A_PAYMENT.test(type)) return null;
  const currency = t.transaction_amount.currency && t.transaction_amount.currency !== "XXX" ? t.transaction_amount.currency : "EUR";
  const toPerson = PERSONAL_MAILBOX.test(t.creditor?.contact_details?.email_address ?? "");
  const title = (t.remittance_information ?? []).join(" ").trim() || t.note?.trim() || undefined;
  return paypalPayment({ date: date.slice(0, 10), name, amount, currency, toPerson, title });
}

const MAPPERS: Record<AccountKind, (t: EbTransaction) => NormalizedTransaction | null> = { bank: toTransaction, paypal: toPaypalTransaction };

/** Field paths that carry a value ("creditor.name"), never the values: how an unfamiliar account shapes its lines. */
function fieldPaths(t: object, into: Set<string>, prefix = "") {
  for (const [k, v] of Object.entries(t)) {
    if (v == null || (Array.isArray(v) && v.length === 0)) continue;
    if (typeof v === "object" && !Array.isArray(v) && !prefix) fieldPaths(v, into, `${k}.`);
    else into.add(prefix + k);
  }
}

/** An ASPSP as listed by Enable Banking. */
export interface Aspsp { name: string; country: string; psu_types?: string[]; maximum_consent_validity?: number; sandbox?: boolean; beta?: boolean }

/** PayPal is kept even when listed for business accounts only: the sign-in is the same, and start() picks the PSU type. */
export const shownToUsers = (a: Aspsp) => !a.psu_types || a.psu_types.includes("personal") || /^paypal\b/i.test(a.name);

export class EnableBanking implements BankProvider {
  id = "enable-banking";
  constructor(private appId = process.env.ENABLE_BANKING_APP_ID!, private key = (process.env.ENABLE_BANKING_PRIVATE_KEY ?? "").replace(/\\n/g, "\n"), private f: Fetch = fetch) {}

  private headers(psu?: PsuContext): Record<string, string> {
    return { ...psu, Authorization: `Bearer ${jwt(this.appId, this.key)}`, "Content-Type": "application/json" };
  }

  private async call<T>(path: string, init: RequestInit & { psu?: PsuContext } = {}): Promise<T> {
    const res = await this.f(`${API}${path}`, { ...init, headers: this.headers(init.psu) });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new EnableBankingError(res.status, `Enable Banking ${init.method ?? "GET"} ${path.split("?")[0]}: ${res.status} ${detail.slice(0, 300)}`);
    }
    return (res.status === 204 ? {} : await res.json()) as T;
  }

  /** Every transaction of one account from `dateFrom`, page by page. */
  private async readAccount(uid: string, dateFrom: string, kind: AccountKind, psu?: PsuContext): Promise<{ transactions: NormalizedTransaction[]; stats: ReadStats }> {
    const transactions: NormalizedTransaction[] = [];
    const stats: ReadStats = { raw: 0, pending: 0, skipped: 0, fields: new Set() };
    let continuation: string | undefined;
    let pages = 0;
    do {
      const q = new URLSearchParams({ date_from: dateFrom, ...(continuation ? { continuation_key: continuation } : {}) });
      const page = await this.call<{ transactions: EbTransaction[]; continuation_key?: string | null }>(`/accounts/${uid}/transactions?${q}`, { psu });
      for (const t of page.transactions ?? []) {
        stats.raw++;
        const tx = MAPPERS[kind](t);
        if (tx) transactions.push(tx);
        else if (t.status === "PDNG") stats.pending++;
        else stats.skipped++;
        // PayPal's shape is little documented: learn it from every line. Banks: from the lines left out.
        if (!tx || kind === "paypal") fieldPaths(t, stats.fields);
      }
      continuation = page.continuation_key ?? undefined;
    } while (continuation && ++pages < 200);
    return { transactions, stats };
  }

  /** The banks as Enable Banking lists them for this application (the owner's bank check reads it too). */
  async aspsps(country: string): Promise<Aspsp[]> {
    return (await this.call<{ aspsps?: Aspsp[] }>(`/aspsps?country=${encodeURIComponent(country)}`)).aspsps ?? [];
  }

  async listInstitutions(country: string): Promise<Institution[]> {
    return (await this.aspsps(country)).filter(shownToUsers).map((a) => ({ name: a.name, country: a.country }));
  }

  async start({ institution, redirectUrl, state, psu, keepDays = 0 }: { institution: Institution; redirectUrl: string; state: string; psu?: PsuContext; keepDays?: number }) {
    // The bank's own limits: how long an access may last, and which kind of customer it serves.
    const aspsp = (await this.aspsps(institution.country).catch(() => [] as Aspsp[])).find((a) => a.name === institution.name);
    const maxDays = aspsp?.maximum_consent_validity ? Math.floor(aspsp.maximum_consent_validity / 86_400) : Infinity;
    const psuType = !aspsp?.psu_types || aspsp.psu_types.includes("personal") ? "personal" : aspsp.psu_types[0];
    // One read right after sign-in needs a day; watching keeps the access for `keepDays`, within the bank's limit.
    const days = Math.max(1, Math.min(keepDays, maxDays));
    const validUntil = new Date(Date.now() + days * 86_400_000).toISOString();
    const { url } = await this.call<{ url: string }>("/auth", {
      method: "POST",
      psu,
      body: JSON.stringify({ access: { valid_until: validUntil }, aspsp: { name: institution.name, country: institution.country }, state, redirect_url: redirectUrl, psu_type: psuType }),
    });
    return { url, days };
  }

  /**
   * Every account from the first date the bank accepts (oldest first in `since`). A bank that shares
   * less refuses an older date, or (PayPal) answers it with an empty list: both move on to the next.
   */
  private async readAccounts(uids: string[], since: string[], kind: AccountKind, psu?: PsuContext, stats?: ReadStats): Promise<NormalizedTransaction[]> {
    const transactions: NormalizedTransaction[] = [];
    for (const uid of uids) {
      for (const [i, dateFrom] of since.entries()) {
        const last = i === since.length - 1;
        try {
          const read = await this.readAccount(uid, dateFrom, kind, psu);
          if (read.stats.raw === 0 && !last) continue;
          transactions.push(...read.transactions);
          if (stats) mergeStats(stats, read.stats);
          break;
        } catch (e) {
          const tooOld = e instanceof EnableBankingError && (e.status === 400 || e.status === 422);
          if (!tooOld || last) throw e;
        }
      }
    }
    return transactions;
  }

  async finish({ code, since, psu, keep = false, kind = "bank" }: { code: string; since: string[]; psu?: PsuContext; keep?: boolean; kind?: AccountKind }): Promise<BankRead> {
    const session = await this.call<{ session_id: string; accounts: { uid: string }[] }>("/sessions", { method: "POST", psu, body: JSON.stringify({ code }) });
    const uids = session.accounts.map((a) => a.uid);
    let kept = false;
    try {
      const stats: ReadStats = { raw: 0, pending: 0, skipped: 0, fields: new Set() };
      const transactions = await this.readAccounts(uids, since, kind, psu, stats);
      // Nothing to watch on a connection that shared nothing.
      kept = keep && transactions.length > 0;
      return {
        accounts: uids.length,
        transactions,
        access: kept ? { session: session.session_id, accounts: uids } : undefined,
        stats: { raw: stats.raw, pending: stats.pending, skipped: stats.skipped, fields: [...stats.fields].sort() },
      };
    } finally {
      // Close the access as soon as it has been read, unless the user asked to be watched.
      if (!kept) await this.close(session.session_id);
    }
  }

  /** A nightly read of a kept access, without the user (banks allow a few such reads a day). */
  async read(access: BankAccess, since: string, kind: AccountKind = "bank"): Promise<NormalizedTransaction[]> {
    return this.readAccounts(access.accounts, [since], kind);
  }

  async close(session: string): Promise<void> {
    await this.call(`/sessions/${session}`, { method: "DELETE" }).catch(() => undefined);
  }
}
