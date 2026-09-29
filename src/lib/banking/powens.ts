import type { BankAccess, BankRead, Institution } from "./types";
import type { NormalizedTransaction } from "../types";
import { makeTx } from "../parsers/common";

/**
 * Powens (ex-Budget Insight, {domain}.biapi.pro/2.0), a French licensed PSD2 account information
 * provider. Each connection gets its own Powens user (a permanent token); the user signs in to
 * their bank in the Powens webview, which sends them back with the new connection. The token
 * travels encrypted in the pending cookie, and the user is deleted once read.
 */
type Fetch = typeof fetch;

export class PowensError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function powensConfigured(): boolean {
  return !!(process.env.POWENS_DOMAIN && process.env.POWENS_CLIENT_ID && process.env.POWENS_CLIENT_SECRET);
}

/** A Powens transaction. `value` is signed: negative is money out; `coming` is not booked yet. */
export interface PowensTransaction {
  id: number;
  id_account: number;
  date?: string;
  rdate?: string;
  vdate?: string | null;
  value: number | null;
  original_wording?: string | null;
  wording?: string | null;
  simplified_wording?: string | null;
  coming?: boolean;
  deleted?: string | null;
}

/** The raw bank label comes first: the detection reads "PRLV SEPA NETFLIX" better than a cleaned one. */
export function toTransaction(t: PowensTransaction, currency = "EUR"): NormalizedTransaction | null {
  const date = t.date ?? t.rdate ?? t.vdate ?? undefined;
  const value = Number(t.value);
  if (!date || !Number.isFinite(value) || value === 0 || t.coming || t.deleted) return null;
  const label = (t.original_wording ?? "").trim() || (t.wording ?? "").trim() || (t.simplified_wording ?? "").trim();
  if (!label) return null;
  return makeTx({ date: date.slice(0, 10), amount: -value, currency, rawLabel: label, source: "bank" });
}

export class Powens {
  id = "powens";
  private host: string;
  constructor(
    domain = process.env.POWENS_DOMAIN ?? "",
    private clientId = process.env.POWENS_CLIENT_ID!,
    private secret = process.env.POWENS_CLIENT_SECRET!,
    private f: Fetch = fetch,
    private wait = (ms: number) => new Promise((r) => setTimeout(r, ms)),
  ) {
    // "mydomain-sandbox" or "mydomain-sandbox.biapi.pro" both work.
    this.host = domain.replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/\.biapi\.pro$/, "") + ".biapi.pro";
  }

  private async call<T>(path: string, init: RequestInit & { token?: string } = {}): Promise<T> {
    const headers: Record<string, string> = { accept: "application/json" };
    if (init.body) headers["Content-Type"] = "application/json";
    if (init.token) headers.Authorization = `Bearer ${init.token}`;
    const res = await this.f(`https://${this.host}/2.0${path}`, { ...init, headers });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new PowensError(res.status, `Powens ${init.method ?? "GET"} ${path.split("?")[0]}: ${res.status} ${detail.slice(0, 300)}`);
    }
    return (res.status === 204 ? {} : await res.json()) as T;
  }

  /** The banks (connectors with the "bank" capability) Powens offers. */
  async connectors(): Promise<{ uuid: string; name: string; country?: string; capabilities?: string[] }[]> {
    return (await this.call<{ connectors?: { uuid: string; name: string; country?: string; capabilities?: string[] }[] }>("/connectors")).connectors ?? [];
  }

  async listInstitutions(country: string): Promise<Institution[]> {
    return (await this.connectors())
      .filter((c) => !c.capabilities || c.capabilities.includes("bank"))
      .filter((c) => !c.country || c.country.toUpperCase() === country)
      .map((c) => ({ name: c.name, country }));
  }

  async start({ institution, redirectUrl, state, lang = "fr", keepDays = 0 }: { institution: Institution; redirectUrl: string; state: string; lang?: string; keepDays?: number }) {
    const { auth_token: token } = await this.call<{ auth_token: string }>("/auth/init", { method: "POST", body: JSON.stringify({ client_id: this.clientId, client_secret: this.secret }) });
    const { code } = await this.call<{ code: string }>("/auth/token/code", { token });
    const connector = (await this.connectors().catch(() => [])).find((c) => c.name === institution.name);
    const q = new URLSearchParams({ domain: this.host, client_id: this.clientId, redirect_uri: redirectUrl, code, state, ...(connector ? { connector_uuids: connector.uuid } : {}) });
    return { url: `https://webview.powens.com/${lang}/connect?${q}`, days: keepDays, ctx: token };
  }

  /** Every transaction from `since`, page by page, in each account's currency. */
  private async readAll(token: string, since: string, accountIds?: string[]): Promise<{ transactions: NormalizedTransaction[]; accounts: string[]; raw: number; skipped: number; pending: number }> {
    const { accounts = [] } = await this.call<{ accounts?: { id: number; currency?: { id?: string } }[] }>("/users/me/accounts", { token });
    const wanted = accounts.filter((a) => !accountIds || accountIds.includes(String(a.id)));
    const currency = new Map(wanted.map((a) => [a.id, a.currency?.id ?? "EUR"]));
    const transactions: NormalizedTransaction[] = [];
    let raw = 0, skipped = 0, pending = 0;
    for (let offset = 0, pages = 0; pages < 200; pages++) {
      const page = await this.call<{ transactions?: PowensTransaction[] }>(`/users/me/transactions?min_date=${since}&limit=1000&offset=${offset}`, { token });
      const lines = page.transactions ?? [];
      for (const t of lines) {
        if (!currency.has(t.id_account)) continue;
        raw++;
        const tx = toTransaction(t, currency.get(t.id_account));
        if (tx) transactions.push(tx);
        else if (t.coming) pending++;
        else skipped++;
      }
      if (lines.length < 1000) break;
      offset += lines.length;
    }
    return { transactions, accounts: wanted.map((a) => String(a.id)), raw, skipped, pending };
  }

  /**
   * `ctx` is the Powens user token from start(). The webview may send the user back while the bank
   * is still being read: wait a little for the first accounts.
   */
  async finish({ ctx, since, keep = false }: { ctx?: string; since: string[]; keep?: boolean }): Promise<BankRead> {
    if (!ctx) throw new PowensError(400, "Powens: the connection token is missing");
    let kept = false;
    try {
      let read = await this.readAll(ctx, since[0]);
      for (let i = 0; i < 7 && read.accounts.length === 0; i++) {
        await this.wait(3000);
        read = await this.readAll(ctx, since[0]);
      }
      kept = keep && read.transactions.length > 0;
      return {
        accounts: read.accounts.length,
        transactions: read.transactions,
        access: kept ? { session: ctx, accounts: read.accounts } : undefined,
        stats: { raw: read.raw, pending: read.pending, skipped: read.skipped, fields: [] },
      };
    } finally {
      if (!kept) await this.close(ctx);
    }
  }

  /** A nightly read of a kept connection (Powens refreshes the bank on its side). */
  async read(access: BankAccess, since: string): Promise<NormalizedTransaction[]> {
    return (await this.readAll(access.session, since, access.accounts)).transactions;
  }

  /** Deletes the Powens user: its connections and data go with it. */
  async close(token: string): Promise<void> {
    await this.call("/users/me", { method: "DELETE", token }).catch(() => undefined);
  }
}
