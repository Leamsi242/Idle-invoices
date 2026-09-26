import { createSign } from "node:crypto";
import type { BankAccess, BankProvider, BankRead, Institution, PsuContext } from "./types";
import type { NormalizedTransaction } from "../types";
import { makeTx } from "../parsers/common";

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
  creditor?: { name?: string } | null;
  debtor?: { name?: string } | null;
  remittance_information?: string[] | null;
  note?: string | null;
  bank_transaction_code?: { description?: string | null } | null;
}

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
  private async readAccount(uid: string, dateFrom: string, psu?: PsuContext, stats?: ReadStats): Promise<NormalizedTransaction[]> {
    const out: NormalizedTransaction[] = [];
    let continuation: string | undefined;
    let pages = 0;
    do {
      const q = new URLSearchParams({ date_from: dateFrom, ...(continuation ? { continuation_key: continuation } : {}) });
      const page = await this.call<{ transactions: EbTransaction[]; continuation_key?: string | null }>(`/accounts/${uid}/transactions?${q}`, { psu });
      for (const t of page.transactions ?? []) {
        const tx = toTransaction(t);
        if (tx) out.push(tx);
        else if (stats) {
          if (t.status === "PDNG") stats.pending++;
          else stats.skipped++;
          // Field names only, never values: enough to see how an unfamiliar bank shapes its lines.
          for (const k of Object.keys(t)) if (t[k as keyof EbTransaction] != null) stats.fields.add(k);
        }
      }
      if (stats) stats.raw += page.transactions?.length ?? 0;
      continuation = page.continuation_key ?? undefined;
    } while (continuation && ++pages < 200);
    return out;
  }

  async listInstitutions(country: string): Promise<Institution[]> {
    const { aspsps } = await this.call<{ aspsps: { name: string; country: string; psu_types?: string[] }[] }>(`/aspsps?country=${encodeURIComponent(country)}`);
    return aspsps.filter((a) => !a.psu_types || a.psu_types.includes("personal")).map((a) => ({ name: a.name, country: a.country }));
  }

  async start({ institution, redirectUrl, state, psu, keepDays = 0 }: { institution: Institution; redirectUrl: string; state: string; psu?: PsuContext; keepDays?: number }) {
    // One read right after sign-in needs a day; watching keeps the access for `keepDays`.
    const validUntil = new Date(Date.now() + Math.max(1, keepDays) * 86_400_000).toISOString();
    const { url } = await this.call<{ url: string }>("/auth", {
      method: "POST",
      psu,
      body: JSON.stringify({ access: { valid_until: validUntil }, aspsp: { name: institution.name, country: institution.country }, state, redirect_url: redirectUrl, psu_type: "personal" }),
    });
    return { url };
  }

  /** Every account from the first date the bank accepts (oldest first in `since`). */
  private async readAccounts(uids: string[], since: string[], psu?: PsuContext, stats?: ReadStats): Promise<NormalizedTransaction[]> {
    const transactions: NormalizedTransaction[] = [];
    for (const uid of uids) {
      // Ask for the longest history first; a bank that shares less (90 days) refuses the date.
      for (const [i, dateFrom] of since.entries()) {
        try {
          transactions.push(...(await this.readAccount(uid, dateFrom, psu, stats)));
          break;
        } catch (e) {
          const tooOld = e instanceof EnableBankingError && (e.status === 400 || e.status === 422);
          if (!tooOld || i === since.length - 1) throw e;
        }
      }
    }
    return transactions;
  }

  async finish({ code, since, psu, keep = false }: { code: string; since: string[]; psu?: PsuContext; keep?: boolean }): Promise<BankRead> {
    const session = await this.call<{ session_id: string; accounts: { uid: string }[] }>("/sessions", { method: "POST", psu, body: JSON.stringify({ code }) });
    const uids = session.accounts.map((a) => a.uid);
    let kept = false;
    try {
      const stats: ReadStats = { raw: 0, pending: 0, skipped: 0, fields: new Set() };
      const transactions = await this.readAccounts(uids, since, psu, stats);
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
  async read(access: BankAccess, since: string): Promise<NormalizedTransaction[]> {
    return this.readAccounts(access.accounts, [since]);
  }

  async close(session: string): Promise<void> {
    await this.call(`/sessions/${session}`, { method: "DELETE" }).catch(() => undefined);
  }
}
