import { afterEach, describe, expect, it } from "vitest";
import { Bridge, toTransaction as bridgeTx } from "@/lib/banking/bridge";
import { Powens, toTransaction as powensTx } from "@/lib/banking/powens";
import { activeProvider } from "@/lib/banking";
import { decodePending, encodePending } from "@/lib/banking/cookie";

type Call = { url: string; method: string; headers: Record<string, string>; body?: unknown };
/** A fake provider: answers by "METHOD path" (query ignored unless the key has one), records calls. */
function fake(routes: Record<string, unknown | ((c: Call) => unknown)>) {
  const calls: Call[] = [];
  const f = (async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = String(input);
    const c: Call = { url, method: init.method ?? "GET", headers: (init.headers ?? {}) as Record<string, string>, body: init.body ? JSON.parse(String(init.body)) : undefined };
    calls.push(c);
    const u = new URL(url);
    const key = Object.keys(routes).find((k) => k === `${c.method} ${u.pathname}${u.search}`) ?? `${c.method} ${u.pathname}`;
    const r = routes[key];
    if (r === undefined) return new Response("not found", { status: 404 });
    const body = typeof r === "function" ? (r as (c: Call) => unknown)(c) : r;
    return new Response(JSON.stringify(body), { status: 200 });
  }) as typeof fetch;
  return { f, calls };
}
const noWait = async () => {};

describe("Bridge", () => {
  it("maps signed amounts, skips future and deleted lines, keeps the raw label", () => {
    expect(bridgeTx({ id: 1, amount: -13.49, currency_code: "EUR", booking_date: "2026-09-02", provider_description: "PRLV SEPA NETFLIX", clean_description: "Netflix" })).toMatchObject({ amount: 13.49, date: "2026-09-02", currency: "EUR" });
    expect(bridgeTx({ id: 2, amount: -5, date: "2026-09-02", clean_description: "Spotify", future: true })).toBeNull();
    expect(bridgeTx({ id: 3, amount: -5, date: "2026-09-02", clean_description: "Spotify", deleted: true })).toBeNull();
    expect(bridgeTx({ id: 4, amount: 20, date: "2026-09-02", clean_description: "Refund" })?.amount).toBe(-20);
  });

  it("opens Connect on the chosen bank with the state as context, then reads, pages and deletes the user", async () => {
    const { f, calls } = fake({
      "GET /v3/providers": { resources: [{ id: 408, name: "Crédit Mutuel", country_code: "FR" }], pagination: { next_uri: null } },
      "POST /v3/aggregation/users": { uuid: "u-1" },
      "POST /v3/aggregation/authorization/token": { access_token: "tok" },
      "POST /v3/aggregation/connect-sessions": { url: "https://connect.bridgeapi.io/session/x" },
      "GET /v3/aggregation/accounts": { resources: [{ id: 11 }], pagination: { next_uri: null } },
      "GET /v3/aggregation/transactions": (c: Call) =>
        c.url.includes("after=p2")
          ? { resources: [{ id: 2, amount: -9.99, booking_date: "2026-08-05", provider_description: "CB SPOTIFY" }], pagination: { next_uri: null } }
          : { resources: [{ id: 1, amount: -13.49, booking_date: "2026-09-05", provider_description: "PRLV NETFLIX" }], pagination: { next_uri: "https://api.bridgeapi.io/v3/aggregation/transactions?account_id=11&after=p2" } },
      "DELETE /v3/aggregation/users/u-1": {},
    });
    const b = new Bridge("id", "secret", f, noWait);
    const started = await b.start({ institution: { name: "Crédit Mutuel", country: "FR" }, redirectUrl: "https://app/api/bank/callback", state: "abc123" });
    expect(started).toMatchObject({ url: "https://connect.bridgeapi.io/session/x", ctx: "u-1" });
    const session = calls.find((c) => c.url.endsWith("/connect-sessions"))!;
    expect(session.headers).toMatchObject({ "Client-Id": "id", "Client-Secret": "secret", "Bridge-Version": "2025-01-15", Authorization: "Bearer tok" });
    expect(session.body).toMatchObject({ callback_url: "https://app/api/bank/callback", context: "abc123", provider_id: 408, country_code: "FR" });

    const read = await b.finish({ code: "77", state: "abc123", ctx: "u-1", since: ["2024-09-01"] });
    expect(read.accounts).toBe(1);
    expect(read.transactions.map((t) => t.amount)).toEqual([13.49, 9.99]);
    expect(read.access).toBeUndefined();
    expect(calls.some((c) => c.method === "DELETE" && c.url.endsWith("/users/u-1"))).toBe(true);
  });

  it("keeps the user for a watch, and waits for the first synchronization", async () => {
    let tries = 0;
    const { f, calls } = fake({
      "POST /v3/aggregation/authorization/token": { access_token: "tok" },
      "GET /v3/aggregation/accounts": () => ({ resources: ++tries < 3 ? [] : [{ id: 11 }] }),
      "GET /v3/aggregation/transactions": { resources: [{ id: 1, amount: -13.49, booking_date: "2026-09-05", provider_description: "PRLV NETFLIX" }] },
    });
    const read = await new Bridge("id", "secret", f, noWait).finish({ code: "77", state: "s", ctx: "u-1", since: ["2024-09-01"], keep: true });
    expect(tries).toBe(3);
    expect(read.access).toEqual({ session: "u-1", accounts: ["11"] });
    expect(calls.some((c) => c.method === "DELETE")).toBe(false);
  });
});

describe("Powens", () => {
  it("maps signed values, skips coming lines, prefers the raw label", () => {
    expect(powensTx({ id: 1, id_account: 3, date: "2026-09-02", value: -13.49, original_wording: "PRLV SEPA NETFLIX", wording: "Netflix" }, "EUR")).toMatchObject({ amount: 13.49, currency: "EUR" });
    expect(powensTx({ id: 2, id_account: 3, date: "2026-09-02", value: -5, wording: "Spotify", coming: true })).toBeNull();
  });

  it("builds the webview URL for the chosen bank, then reads in the account currency and deletes the user", async () => {
    const { f, calls } = fake({
      "POST /2.0/auth/init": { auth_token: "perm", id_user: 9 },
      "GET /2.0/auth/token/code": { code: "tmp" },
      "GET /2.0/connectors": { connectors: [{ uuid: "cm-uuid", name: "Crédit Mutuel", capabilities: ["bank"] }] },
      "GET /2.0/users/me/accounts": { accounts: [{ id: 3, currency: { id: "EUR" } }, { id: 4, currency: { id: "USD" } }] },
      "GET /2.0/users/me/transactions": { transactions: [
        { id: 1, id_account: 3, date: "2026-09-05", value: -13.49, original_wording: "PRLV NETFLIX" },
        { id: 2, id_account: 4, date: "2026-09-06", value: -10, original_wording: "GITHUB" },
        { id: 3, id_account: 3, date: "2026-09-07", value: -8, original_wording: "CB UBER", coming: true },
      ] },
      "DELETE /2.0/users/me": {},
    });
    const p = new Powens("mine-sandbox", "cid", "csecret", f, noWait);
    const started = await p.start({ institution: { name: "Crédit Mutuel", country: "FR" }, redirectUrl: "https://app/api/bank/callback", state: "abc" });
    const u = new URL(started.url);
    expect(u.origin + u.pathname).toBe("https://webview.powens.com/fr/connect");
    expect(Object.fromEntries(u.searchParams)).toMatchObject({ domain: "mine-sandbox.biapi.pro", client_id: "cid", code: "tmp", state: "abc", connector_uuids: "cm-uuid", redirect_uri: "https://app/api/bank/callback" });
    expect(started.ctx).toBe("perm");
    expect(calls[0].url).toBe("https://mine-sandbox.biapi.pro/2.0/auth/init");

    const read = await p.finish({ ctx: "perm", since: ["2024-09-01"] });
    expect(read.transactions.map((t) => [t.amount, t.currency])).toEqual([[13.49, "EUR"], [10, "USD"]]);
    expect(read.stats?.pending).toBe(1);
    const del = calls.find((c) => c.method === "DELETE")!;
    expect(del.headers.Authorization).toBe("Bearer perm");
  });
});

describe("provider choice and the pending cookie", () => {
  const saved = { ...process.env };
  afterEach(() => { process.env = { ...saved }; });

  it("uses BANK_PROVIDER when configured, else the first configured", () => {
    for (const k of ["ENABLE_BANKING_APP_ID", "ENABLE_BANKING_PRIVATE_KEY", "BRIDGE_CLIENT_ID", "BRIDGE_CLIENT_SECRET", "POWENS_DOMAIN", "POWENS_CLIENT_ID", "POWENS_CLIENT_SECRET", "BANK_PROVIDER"]) delete process.env[k];
    expect(activeProvider()).toBeNull();
    Object.assign(process.env, { BRIDGE_CLIENT_ID: "a", BRIDGE_CLIENT_SECRET: "b", POWENS_DOMAIN: "d", POWENS_CLIENT_ID: "c", POWENS_CLIENT_SECRET: "e" });
    expect(activeProvider()).toBe("bridge");
    process.env.BANK_PROVIDER = "powens";
    expect(activeProvider()).toBe("powens");
    process.env.BANK_PROVIDER = "enable-banking"; // not configured: falls back
    expect(activeProvider()).toBe("bridge");
  });

  it("carries the provider context through the cookie", () => {
    const v = decodePending(encodePending("s", { name: "Crédit Mutuel", country: "FR" }, false, undefined, "v1:secret"));
    expect(v?.ctx).toBe("v1:secret");
    expect(decodePending(encodePending("s", { name: "B", country: "FR" }))?.ctx).toBeUndefined();
  });
});
