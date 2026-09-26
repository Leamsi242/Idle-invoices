import { createSign } from "node:crypto";
import type { BankProvider, BankRead, Institution, PsuContext } from "./types";
import type { NormalizedTransaction } from "../types";
import { makeTx } from "../parsers/common";

/**
 * Enable Banking (api.enablebanking.com), a licensed PSD2 account information provider with
 * self-serve sign-up. Requests are authenticated with a short JWT signed (RS256) by the
 * application's private key; the application id is the key id.
 */
const API = "https://api.enablebanking.com";
type Fetch = typeof fetch;

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
}

/** Card lines keep the merchant in the remittance text ("CB NETFLIX.COM 12/07"); transfers name the creditor. */
export function toTransaction(t: EbTransaction): NormalizedTransaction | null {
  const date = t.booking_date ?? t.value_date ?? t.transaction_date;
  const amount = Math.abs(Number(t.transaction_amount?.amount));
  if (!date || !Number.isFinite(amount) || amount === 0 || t.status === "PDNG") return null;
  const debit = t.credit_debit_indicator === "DBIT";
  const counterpart = (debit ? t.creditor?.name : t.debtor?.name) ?? "";
  const text = (t.remittance_information ?? []).join(" ").trim();
  const label = text && counterpart && !text.toUpperCase().includes(counterpart.toUpperCase()) ? `${counterpart} ${text}` : text || counterpart;
  if (!label) return null;
  return makeTx({ date: date.slice(0, 10), amount: debit ? amount : -amount, currency: t.transaction_amount.currency || "EUR", rawLabel: label, source: "bank" });
}

export class EnableBanking implements BankProvider {
  id = "enable-banking";
  constructor(private appId = process.env.ENABLE_BANKING_APP_ID!, private key = (process.env.ENABLE_BANKING_PRIVATE_KEY ?? "").replace(/\\n/g, "\n"), private f: Fetch = fetch) {}

  private headers(psu?: PsuContext): Record<string, string> {
    const h: Record<string, string> = { Authorization: `Bearer ${jwt(this.appId, this.key)}`, "Content-Type": "application/json" };
    if (psu?.ip) h["psu-ip-address"] = psu.ip;
    if (psu?.userAgent) h["psu-user-agent"] = psu.userAgent;
    return h;
  }

  private async call<T>(path: string, init: RequestInit & { psu?: PsuContext } = {}): Promise<T> {
    const res = await this.f(`${API}${path}`, { ...init, headers: this.headers(init.psu) });
    if (!res.ok) throw new Error(`Enable Banking ${init.method ?? "GET"} ${path.split("?")[0]}: ${res.status}`);
    return (res.status === 204 ? {} : await res.json()) as T;
  }

  async listInstitutions(country: string): Promise<Institution[]> {
    const { aspsps } = await this.call<{ aspsps: { name: string; country: string; psu_types?: string[] }[] }>(`/aspsps?country=${encodeURIComponent(country)}&psu_type=personal`);
    return aspsps.filter((a) => !a.psu_types || a.psu_types.includes("personal")).map((a) => ({ name: a.name, country: a.country }));
  }

  async start({ institution, redirectUrl, state, psu }: { institution: Institution; redirectUrl: string; state: string; psu?: PsuContext }) {
    // One read, right after the user signs in: the access only needs to last a day.
    const validUntil = new Date(Date.now() + 86_400_000).toISOString();
    const { url } = await this.call<{ url: string }>("/auth", {
      method: "POST",
      psu,
      body: JSON.stringify({ access: { valid_until: validUntil }, aspsp: { name: institution.name, country: institution.country }, state, redirect_url: redirectUrl, psu_type: "personal" }),
    });
    return { url };
  }

  async finish({ code, since, psu }: { code: string; since: string; psu?: PsuContext }): Promise<BankRead> {
    const session = await this.call<{ session_id: string; accounts: { uid: string }[] }>("/sessions", { method: "POST", psu, body: JSON.stringify({ code }) });
    try {
      const transactions: NormalizedTransaction[] = [];
      for (const { uid } of session.accounts) {
        let continuation: string | undefined;
        let pages = 0;
        do {
          const q = new URLSearchParams({ date_from: since, ...(continuation ? { continuation_key: continuation } : {}) });
          const page = await this.call<{ transactions: EbTransaction[]; continuation_key?: string | null }>(`/accounts/${uid}/transactions?${q}`, { psu });
          for (const t of page.transactions ?? []) {
            const tx = toTransaction(t);
            if (tx) transactions.push(tx);
          }
          continuation = page.continuation_key ?? undefined;
        } while (continuation && ++pages < 200);
      }
      return { accounts: session.accounts.length, transactions };
    } finally {
      // Close the access as soon as it has been read.
      await this.call(`/sessions/${session.session_id}`, { method: "DELETE" }).catch(() => undefined);
    }
  }
}
