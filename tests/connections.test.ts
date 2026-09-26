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
    // American Express leaves the remittance empty and names the merchant in the note.
    expect(toTransaction(tx({ remittance_information: null, note: "NETFLIX.COM" }))!.rawLabel).toBe("NETFLIX.COM");
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
    const read = await new EnableBanking("app-123", privateKey, f).finish({ code: "c0de", since: ["2024-09-26"], psu: { "psu-ip-address": "203.0.113.5", "psu-user-agent": "UA" } });
    expect(read.accounts).toBe(2);
    expect(read.transactions.map((t) => [t.date, t.amount])).toEqual([["2026-09-03", 15.99], ["2026-08-03", 13.49], ["2026-09-03", 19.99]]);
    expect(JSON.parse(calls[0].body!)).toEqual({ code: "c0de" });
    expect(calls[1].url).toContain("date_from=2024-09-26");
    expect(calls[2].url).toContain("continuation_key=k2");
    expect(calls.at(-1)).toMatchObject({ method: "DELETE", url: "https://api.enablebanking.com/sessions/s1" });
  });

  it("keeps no access when the bank shared nothing, and says why", async () => {
    const methods: string[] = [];
    const f = (async (input: string | URL | Request, init?: RequestInit) => {
      methods.push(init?.method ?? "GET");
      if (String(input).endsWith("/sessions")) return json({ session_id: "s3", accounts: [{ uid: "a1" }] });
      if (init?.method === "DELETE") return json({}, 204);
      return json({ transactions: [tx({ status: "PDNG" }), tx({ remittance_information: null })] });
    }) as typeof fetch;
    const read = await new EnableBanking("app", privateKey, f).finish({ code: "x", since: ["2025-01-01"], keep: true });
    expect(read.transactions).toEqual([]);
    expect(read.access).toBeUndefined();
    expect(read.stats).toMatchObject({ raw: 2, pending: 1, skipped: 1 });
    expect(read.stats!.fields).toContain("transaction_amount");
    expect(methods.at(-1)).toBe("DELETE");
  });

  it("closes the access even when a read fails", async () => {
    const methods: string[] = [];
    const f = (async (input: string | URL | Request, init?: RequestInit) => {
      methods.push(`${init?.method ?? "GET"} ${String(input).replace("https://api.enablebanking.com", "")}`);
      if (String(input).endsWith("/sessions")) return json({ session_id: "s9", accounts: [{ uid: "a1" }] });
      if (init?.method === "DELETE") return json({}, 204);
      return json({ error: "boom" }, 500);
    }) as typeof fetch;
    await expect(new EnableBanking("app", privateKey, f).finish({ code: "x", since: ["2025-01-01"] })).rejects.toThrow(/500/);
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
    expect(decodePending(encodePending("st", { name: "BNP Paribas", country: "FR" }))).toEqual({ state: "st", institution: { name: "BNP Paribas", country: "FR" }, watch: false });
    expect(decodePending(encodePending("st", { name: "BNP Paribas", country: "FR" }, true))?.watch).toBe(true);
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
    expect(google?.title).toBe("Which service is the €9.99 a week paid through Google Play?");
    expect(names).not.toContain("Uber One");

    // Connecting the card itself answers the card question.
    expect(findDoubts(subscriptions, facts, { banks: ["Demo bank (test data)", "American Express"], mailboxes: [], files: 0 }).some((d) => d.kind === "card")).toBe(false);
    // The mail question counts subscriptions, not every payment.
    const hiddenSubs = subscriptions.filter((s) => s.needsLabel && s.status !== "cancelled" && ["paypal", "google", "apple"].includes(s.channel)).length;
    expect(doubts[0].title).toMatch(new RegExp(`^${hiddenSubs} subscription`));

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

describe("a Crédit Mutuel connection (90 days of history)", () => {
  it("falls back to 90 days when the bank refuses a longer history, and still finds the subscriptions", async () => {
    const today = "2026-09-26";
    const dateFroms: string[] = [];
    const cm = (date: string, amount: string, lines: string[]): EbTransaction => ({
      transaction_amount: { amount, currency: "EUR" }, credit_debit_indicator: "DBIT", status: "BOOK", booking_date: date, remittance_information: lines,
    });
    const booked: EbTransaction[] = [
      ...["2026-07-03", "2026-08-03", "2026-09-03"].map((d) => cm(d, "15.99", ["PAIEMENT CB 0207 PARIS", "NETFLIX.COM CARTE 4970XXXX1234"])),
      ...["2026-07-06", "2026-08-06", "2026-09-07"].map((d) => cm(d, "29.99", ["PRLV SEPA BOUYGUES TELECOM"])),
      ...["2026-08-05", "2026-09-05"].map((d) => cm(d, "23.99", ["PRLV SEPA PAYPAL EUROPE S.A.R.L", "1045987736512 PAYPAL"])),
      ...["2026-07-12", "2026-07-19", "2026-08-02", "2026-08-23", "2026-09-13"].map((d, i) => cm(d, ["48.20", "61.75", "33.10", "72.40", "55.05"][i], ["PAIEMENT CB 1107 PARIS", "CARREFOUR CITY CARTE 4970XXXX1234"])),
      { ...cm("2026-09-01", "2450.00", ["VIR SEPA SALAIRE ACME"]), credit_debit_indicator: "CRDT" },
    ];
    const f = (async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/sessions") && init?.method === "POST") return json({ session_id: "s1", accounts: [{ uid: "cm1" }] });
      if (init?.method === "DELETE") return json({}, 204);
      const from = new URL(url).searchParams.get("date_from")!;
      dateFroms.push(from);
      // Like Crédit Mutuel: no more than 90 days back.
      if (from < "2026-06-28") return json({ error: "WRONG_TRANSACTIONS_PERIOD", message: "date_from is out of the allowed period" }, 422);
      return json({ transactions: booked, continuation_key: null });
    }) as typeof fetch;
    const since = [730, 395, 89].map((d) => new Date(Date.parse(`${today}T00:00:00Z`) - d * 86_400_000).toISOString().slice(0, 10));
    const { transactions } = await new EnableBanking("app", privateKey, f).finish({ code: "c", since, psu: { "psu-ip-address": "203.0.113.5" } });
    expect(dateFroms).toEqual(["2024-09-26", "2025-08-27", "2026-06-29"]);

    const { subscriptions } = analyze(transactions, { today });
    expect(subscriptions.map((s) => [s.serviceName, s.frequency, s.transactions.length]).sort()).toEqual([
      ["Bouygues Telecom", "monthly", 3], ["Netflix", "monthly", 3], ["Paypal", "monthly", 2],
    ]);
    const doubts = findDoubts(subscriptions, collectFacts(transactions, new Set()), { banks: ["Crédit Mutuel"], mailboxes: [], files: 0 });
    expect(doubts[0]).toMatchObject({ kind: "mail" });
    expect(doubts[0].detail).toMatch(/only shares the last 3 months/);
  });
});

describe("doubts in French", () => {
  it("asks the same questions in French, with French prices", () => {
    const { transactions } = demoTransactions("2026-09-26");
    const { subscriptions } = analyze(transactions, { today: "2026-09-26" });
    const doubts = findDoubts(subscriptions, collectFacts(transactions, new Set()), { banks: ["Demo"], mailboxes: [], files: 0 }, "fr");
    expect(doubts[1].title).toBe("Votre banque paie une carte American Express chaque mois");
    expect(doubts.find((d) => d.kind === "name" && d.store === "google")?.title).toMatch(/^Quel service se cache derrière 9,99\s€ par semaine payés via Google Play \?$/);
  });
});

describe("watching an account", () => {
  it("asks for a 90-day access, keeps it after the first read, and reads it again later", async () => {
    const calls: { method: string; url: string; body?: string }[] = [];
    const f = (async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      calls.push({ method: init?.method ?? "GET", url, body: init?.body as string | undefined });
      if (url.endsWith("/auth")) return json({ url: "https://bank.example/login" });
      if (url.endsWith("/sessions") && init?.method === "POST") return json({ session_id: "s1", accounts: [{ uid: "a1" }] });
      if (url.includes("/transactions")) return json({ transactions: [tx({})] });
      return json({}, 204);
    }) as typeof fetch;
    const eb = new EnableBanking("app", privateKey, f);
    await eb.start({ institution: { name: "Crédit Mutuel", country: "FR" }, redirectUrl: "https://app.example/cb", state: "st", keepDays: 90 });
    const days = (Date.parse(JSON.parse(calls[0].body!).access.valid_until) - Date.now()) / 86_400_000;
    expect(Math.round(days)).toBe(90);

    const read = await eb.finish({ code: "c", since: ["2026-06-29"], keep: true });
    expect(read.access).toEqual({ session: "s1", accounts: ["a1"] });
    expect(calls.some((c) => c.method === "DELETE")).toBe(false);

    await eb.read(read.access!, "2026-09-19");
    expect(calls.at(-1)!.url).toContain("/accounts/a1/transactions?date_from=2026-09-19");
    await eb.close("s1");
    expect(calls.at(-1)).toMatchObject({ method: "DELETE", url: "https://api.enablebanking.com/sessions/s1" });
  });
});
