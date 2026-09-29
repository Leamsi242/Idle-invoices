import type { BankAccess, BankRead, Institution } from "./types";
import type { NormalizedTransaction } from "../types";
import { makeTx } from "../parsers/common";

/**
 * Bridge (api.bridgeapi.io, v3 "2025-01-15"), a French licensed PSD2 account information provider
 * backed by Groupe BPCE. The user picks their bank and signs in inside Bridge Connect; Bridge then
 * sends them back with the item (the bank connection) it created. Application requests carry the
 * client id and secret; user requests also carry a short-lived user token (2 hours).
 */
const API = "https://api.bridgeapi.io";
const VERSION = "2025-01-15";

type Fetch = typeof fetch;

export class BridgeError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function bridgeConfigured(): boolean {
  return !!(process.env.BRIDGE_CLIENT_ID && process.env.BRIDGE_CLIENT_SECRET);
}

/** A Bridge transaction (v3). Amounts are signed: negative is money out. */
export interface BridgeTransaction {
  id: number | string;
  amount: number;
  currency_code?: string;
  date?: string;
  booking_date?: string;
  transaction_date?: string;
  value_date?: string;
  clean_description?: string | null;
  provider_description?: string | null;
  future?: boolean;
  is_future?: boolean;
  deleted?: boolean;
}

/** The raw label keeps what the detection needs ("PRLV SEPA NETFLIX"); the cleaned one is a fallback. */
export function toTransaction(t: BridgeTransaction): NormalizedTransaction | null {
  const date = t.booking_date ?? t.date ?? t.transaction_date ?? t.value_date;
  const amount = Number(t.amount);
  if (!date || !Number.isFinite(amount) || amount === 0 || t.future || t.is_future || t.deleted) return null;
  const label = (t.provider_description ?? "").trim() || (t.clean_description ?? "").trim();
  if (!label) return null;
  // Bridge signs money out negative; the app counts a charge as positive.
  return makeTx({ date: date.slice(0, 10), amount: -amount, currency: t.currency_code || "EUR", rawLabel: label, source: "bank" });
}

interface Page<T> { resources: T[]; pagination?: { next_uri?: string | null } }

export class Bridge {
  id = "bridge";
  constructor(
    private clientId = process.env.BRIDGE_CLIENT_ID!,
    private secret = process.env.BRIDGE_CLIENT_SECRET!,
    private f: Fetch = fetch,
    private wait = (ms: number) => new Promise((r) => setTimeout(r, ms)),
  ) {}

  private async call<T>(path: string, init: RequestInit & { token?: string } = {}): Promise<T> {
    const headers: Record<string, string> = { "Client-Id": this.clientId, "Client-Secret": this.secret, "Bridge-Version": VERSION, accept: "application/json" };
    if (init.body) headers["Content-Type"] = "application/json";
    if (init.token) headers.Authorization = `Bearer ${init.token}`;
    const res = await this.f(path.startsWith("http") ? path : `${API}${path}`, { ...init, headers });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new BridgeError(res.status, `Bridge ${init.method ?? "GET"} ${path.split("?")[0]}: ${res.status} ${detail.slice(0, 300)}`);
    }
    return (res.status === 204 ? {} : await res.json()) as T;
  }

  /** Every page of a list, following next_uri. */
  private async all<T>(path: string, token?: string): Promise<T[]> {
    const out: T[] = [];
    let next: string | null | undefined = path;
    for (let pages = 0; next && pages < 200; pages++) {
      const page: Page<T> = await this.call<Page<T>>(next, { token });
      out.push(...(page.resources ?? []));
      next = page.pagination?.next_uri;
    }
    return out;
  }

  /** The banks Bridge offers in a country, with their Bridge id (to open Connect on that bank). */
  async providers(country: string): Promise<{ id: number; name: string; country_code?: string }[]> {
    return this.all(`/v3/providers?country_code=${encodeURIComponent(country)}&limit=500`);
  }

  async listInstitutions(country: string): Promise<Institution[]> {
    return (await this.providers(country)).map((p) => ({ name: p.name, country: p.country_code ?? country }));
  }

  private async token(user: { uuid?: string; external?: string }): Promise<string> {
    const body = user.uuid ? { user_uuid: user.uuid } : { external_user_id: user.external };
    return (await this.call<{ access_token: string }>("/v3/aggregation/authorization/token", { method: "POST", body: JSON.stringify(body) })).access_token;
  }

  /**
   * One Bridge user per connection, named after the random state: the callback finds it again
   * from the state it checked, and deletes it (with all its data) once read.
   */
  async start({ institution, redirectUrl, state, keepDays = 0 }: { institution: Institution; redirectUrl: string; state: string; keepDays?: number }) {
    const user = await this.call<{ uuid: string }>("/v3/aggregation/users", { method: "POST", body: JSON.stringify({ external_user_id: state }) });
    const token = await this.token({ external: state });
    const provider = (await this.providers(institution.country).catch(() => [])).find((p) => p.name === institution.name);
    const email = process.env.BRIDGE_USER_EMAIL;
    const { url } = await this.call<{ url: string }>("/v3/aggregation/connect-sessions", {
      method: "POST",
      token,
      body: JSON.stringify({ callback_url: redirectUrl, context: state, country_code: institution.country, ...(provider ? { provider_id: provider.id } : {}), ...(email ? { user_email: email } : {}) }),
    });
    // The user's uuid comes back (encrypted) with the callback, to delete the user once read.
    return { url, days: keepDays, ctx: user.uuid };
  }

  /** Transactions of the given accounts from `since`, waiting for Bridge's first synchronization. */
  private async readAccounts(token: string, accounts: string[], since: string): Promise<{ transactions: NormalizedTransaction[]; raw: number; skipped: number }> {
    const transactions: NormalizedTransaction[] = [];
    let raw = 0, skipped = 0;
    for (const id of accounts) {
      const lines = await this.all<BridgeTransaction>(`/v3/aggregation/transactions?account_id=${encodeURIComponent(id)}&min_date=${since}&limit=500`, token);
      for (const t of lines) {
        raw++;
        const tx = toTransaction(t);
        if (tx) transactions.push(tx);
        else skipped++;
      }
    }
    return { transactions, raw, skipped };
  }

  /**
   * `code` is the item Bridge created, `state` names the user, `ctx` is the user's uuid. Bridge synchronizes in the
   * background after Connect: accounts can take a few seconds to appear, so the read waits for them.
   */
  async finish({ code, state, ctx, since, keep = false }: { code: string; state: string; ctx?: string; since: string[]; keep?: boolean }): Promise<BankRead> {
    const token = await this.token(ctx ? { uuid: ctx } : { external: state });
    const me = ctx ? { uuid: ctx } : null;
    let kept = false;
    try {
      let accounts: { id: number | string }[] = [];
      for (let i = 0; i < 8 && accounts.length === 0; i++) {
        if (i) await this.wait(3000);
        accounts = await this.all<{ id: number | string }>(`/v3/aggregation/accounts?item_id=${encodeURIComponent(code)}&limit=500`, token);
      }
      const ids = accounts.map((a) => String(a.id));
      // The oldest date asked for: Bridge returns what the bank shared.
      const read = await this.readAccounts(token, ids, since[0]);
      kept = keep && read.transactions.length > 0 && !!me;
      return {
        accounts: ids.length,
        transactions: read.transactions,
        access: kept && me ? { session: me.uuid, accounts: ids } : undefined,
        stats: { raw: read.raw, pending: 0, skipped: read.skipped, fields: [] },
      };
    } finally {
      if (!kept && me) await this.close(me.uuid);
    }
  }

  /** A nightly read of a kept connection (Bridge refreshes the bank on its side). */
  async read(access: BankAccess, since: string): Promise<NormalizedTransaction[]> {
    const token = await this.token({ uuid: access.session });
    return (await this.readAccounts(token, access.accounts, since)).transactions;
  }

  /** Deletes the Bridge user: its connections and data go with it. */
  async close(userUuid: string): Promise<void> {
    await this.call(`/v3/aggregation/users/${encodeURIComponent(userUuid)}`, { method: "DELETE" }).catch(() => undefined);
  }
}
