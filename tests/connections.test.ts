import { describe, expect, it } from "vitest";
import { createVerify, generateKeyPairSync } from "node:crypto";
import { EnableBanking, jwt, toTransaction, type EbTransaction } from "@/lib/banking/enable-banking";
import { demoTransactions } from "@/lib/banking/demo";
import { decodePending, encodePending } from "@/lib/banking/cookie";
import { listOutlookIds, outlookAuthUrl, OUTLOOK_SCOPE, scanOutlook } from "@/lib/outlook";
import { analyze } from "@/lib/engine/pipeline";
import { collectFacts } from "@/lib/onboarding";
import { findDoubts } from "@/lib/doubts";
import { readSample } from "./helpers";

const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048, privateKeyEncoding: { type: "pkcs8", format: "pem" }, publicKeyEncoding: { type: "spki", format: "pem" } });
const json = (body: unknown, status = 200) => new Response(status === 204 ? null : JSON.stringify(body), { status });

const tx = (over: Partial<EbTransaction>): EbTransaction => ({
  transaction_amount: { amount: "15.99", currency: "EUR" },
  credit_debit_indicator: "DBIT",
  status: "BOOK",
  booking_date: "2026-09-03",
  remittance_information: ["CB NETFLIX.COM 02/09"],
  ...over,
});

describe("Enable Banking", () => {
  it("signs a short JWT with the application key", () => {
    const token = jwt("app-123", privateKey, 1_800_000_000);
    const [h, b, sig] = token.split(".");
    expect(JSON.parse(Buffer.from(h, "base64url").toString())).toEqual({ typ: "JWT", alg: "RS256", kid: "app-123" });
    expect(JSON.parse(Buffer.from(b, "base64url").toString())).toEqual({ iss: "enablebanking.com", aud: "api.enablebanking.com", iat: 1_800_000_000, exp: 1_800_003_600 });
    expect(createVerify("RSA-SHA256").update(`${h}.${b}`).verify(publicKey, Buffer.from(sig, "base64url"))).toBe(true);
  });

  it("turns bank transactions into charges and refunds, and skips pending ones", () => {
    expect(toTransaction(tx({}))).toMatchObject({ date: "2026-09-03", amount: 15.99, rawLabel: "CB NETFLIX.COM 02/09", source: "bank" });
    expect(toTransaction(tx({ credit_debit_indicator: "CRDT", remittance_information: ["SALAIRE"], debtor: { name: "ACME SAS" } }))).toMatchObject({ amount: -15.99, rawLabel: "ACME SAS SALAIRE" });
    expect(toTransaction(tx({ creditor: { name: "PAYPAL EUROPE S.A.R.L" }, remittance_information: ["1045987736512 PAYPAL"] }))!.rawLabel).toBe("PAYPAL EUROPE S.A.R.L ••••6512 PAYPAL"); // long references are masked
    expect(toTransaction(tx({ status: "PDNG" }))).toBeNull();
  });

  it("reads every account page by page, then closes the access", async () => {
    const calls: { method: string; url: string; body?: string }[] = [];
    const f = (async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      calls.push({ method: init?.method ?? "GET", url, body: init?.body as string | undefined });
      expect((init?.headers as Record<string, string>).Authorization).toMatch(/^Bearer ey/);
      if (url.endsWith("/sessions") && init?.method === "POST") return json({ session_id: "s1", accounts: [{ uid: "a1" }, { uid: "a2" }] });
      if (url.includes("/accounts/a1/transactions") && !url.includes("continuation_key")) return json({ transactions: [tx({})], continuation_key: "k2" });
      if (url.includes("/accounts/a1/transactions")) return json({ transactions: [tx({ booking_date: "2026-08-03", transaction_amount: { amount: "13.49", currency: "EUR" } })] });
      if (url.includes("/accounts/a2/transactions")) return json({ transactions: [tx({ remittance_information: ["PRLV SEPA FREE MOBILE"], transaction_amount: { amount: "19.99", currency: "EUR" } })], continuation_key: null });
      if (init?.method === "DELETE") return json({}, 204);
      throw new Error(`unexpected ${url}`);
    }) as typeof fetch;
    const read = await new EnableBanking("app-123", privateKey, f).finish({ code: "c0de", since: "2024-09-26", psu: { ip: "203.0.113.5", userAgent: "UA" } });
    expect(read.accounts).toBe(2);
    expect(read.transactions.map((t) => [t.date, t.amount])).toEqual([["2026-09-03", 15.99], ["2026-08-03", 13.49], ["2026-09-03", 19.99]]);
    expect(JSON.parse(calls[0].body!)).toEqual({ code: "c0de" });
    expect(calls[1].url).toContain("date_from=2024-09-26");
    expect(calls[2].url).toContain("continuation_key=k2");
    expect(calls.at(-1)).toMatchObject({ method: "DELETE", url: "https://api.enablebanking.com/sessions/s1" });
  });

  it("closes the access even when a read fails", async () => {
    const methods: string[] = [];
    const f = (async (input: string | URL | Request, init?: RequestInit) => {
      methods.push(`${init?.method ?? "GET"} ${String(input).replace("https://api.enablebanking.com", "")}`);
      if (String(input).endsWith("/sessions")) return json({ session_id: "s9", accounts: [{ uid: "a1" }] });
      if (init?.method === "DELETE") return json({}, 204);
      return json({ error: "boom" }, 500);
    }) as typeof fetch;
    await expect(new EnableBanking("app", privateKey, f).finish({ code: "x", since: "2025-01-01" })).rejects.toThrow(/500/);
    expect(methods.at(-1)).toBe("DELETE /sessions/s9");
  });

  it("asks the bank for a one-day, personal, read-only access", async () => {
    let body: Record<string, unknown> = {};
    const f = (async (_: string | URL | Request, init?: RequestInit) => {
      body = JSON.parse(init!.body as string);
      return json({ url: "https://bank.example/login" });
    }) as typeof fetch;
    const { url } = await new EnableBanking("app", privateKey, f).start({ institution: { name: "Crédit Mutuel", country: "FR" }, redirectUrl: "https://app.example/api/bank/callback", state: "st" });
    expect(url).toBe("https://bank.example/login");
    expect(body).toMatchObject({ aspsp: { name: "Crédit Mutuel", country: "FR" }, state: "st", redirect_url: "https://app.example/api/bank/callback", psu_type: "personal" });
    const hours = (Date.parse((body.access as { valid_until: string }).valid_until) - Date.now()) / 3_600_000;
    expect(hours).toBeGreaterThan(23);
    expect(hours).toBeLessThan(25);
  });

  it("remembers the pending bank in a cookie that cannot carry anything else", () => {
    expect(decodePending(encodePending("st", { name: "BNP Paribas", country: "FR" }))).toEqual({ state: "st", institution: { name: "BNP Paribas", country: "FR" } });
    expect(decodePending("not-json")).toBeNull();
  });
});

describe("demo bank, then the doubts left for the user", () => {
  it("finds the subscriptions and asks only what the bank cannot tell", () => {
    const today = "2026-09-26";
    const { transactions } = demoTransactions(today);
    const { subscriptions } = analyze(transactions, { today });
    const names = subscriptions.map((s) => s.serviceName);
    expect(names).toEqual(expect.arrayContaining(["Netflix", "Spotify", "Basic-Fit", "Free Mobile", "Amazon Prime"]));
    expect(names).not.toContain("Carrefour City Paris");

    const facts = collectFacts(transactions, new Set());
    const doubts = findDoubts(subscriptions, facts, { banks: ["Demo bank (test data)"], mailboxes: [], files: 0 });
    expect(doubts.map((d) => d.kind)).toEqual(["mail", "card", ...doubts.filter((d) => d.kind === "name").map(() => "name")]);
    const google = doubts.find((d) => d.kind === "name" && d.store === "google");
    expect(google?.title).toBe("Which service is the 9.99 EUR a week paid through Google Play?");
    expect(names).not.toContain("Uber One");

    // Once the mailbox is connected, the mail question goes away.
    expect(findDoubts(subscriptions, facts, { banks: ["Demo bank (test data)"], mailboxes: ["Gmail"], files: 0 }).some((d) => d.kind === "mail")).toBe(false);
  });
});

describe("Outlook scan", () => {
  it("asks for mail reading only, without a refresh token", () => {
    const url = new URL(outlookAuthUrl({ clientId: "cid", redirectUri: "https://app.example/api/outlook/callback", state: "st", codeChallenge: "ch" }));
    expect(url.searchParams.get("scope")).toBe(OUTLOOK_SCOPE);
    expect(url.searchParams.get("scope")).not.toContain("offline_access");
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
  });

  it("follows the result pages and keeps the receipts from the MIME content", async () => {
    const calls: string[] = [];
    const f = (async (input: string | URL | Request) => {
      const url = String(input);
      calls.push(url);
      if (url.endsWith("page=2")) return json({ value: [{ id: "m3" }] });
      if (url.includes("/messages?")) return json({ value: [{ id: "m1" }, { id: "m2" }], "@odata.nextLink": "https://graph.microsoft.com/v1.0/me/messages?page=2" });
      const id = url.match(/messages\/(\w+)\/\$value/)![1];
      const mime = id === "m1" ? readSample("receipt-duolingo.eml") : Buffer.from(`From: news@shop.example\r\nSubject: 50% off\r\n\r\nOnly €4.99!\r\n`);
      return new Response(mime, { status: 200 });
    }) as typeof fetch;
    expect(await listOutlookIds("t", f)).toEqual(["m1", "m2", "m3"]);
    expect(decodeURIComponent(calls[0])).toContain('$search="subject:receipt OR');
    const { scanned, receipts } = await scanOutlook("t", f);
    expect(scanned).toBe(3);
    expect(receipts.map((r) => r.merchant)).toEqual(["Duolingo"]);
  });
});
