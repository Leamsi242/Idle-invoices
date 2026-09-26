import { describe, expect, it } from "vitest";
import { generateKeyPairSync, randomUUID } from "node:crypto";
import { EnableBanking, toPaypalTransaction, type EbTransaction } from "@/lib/banking/enable-banking";
import { demoPaypalTransactions, demoTransactions } from "@/lib/banking/demo";
import { isPaypal, kindOf } from "@/lib/banking";
import { paypalPayment } from "@/lib/parsers/paypal-csv";
import { analyze } from "@/lib/engine/pipeline";
import { collectFacts } from "@/lib/onboarding";
import { reconcile } from "@/lib/engine/reconcile";
import { findDoubts } from "@/lib/doubts";
import { prisma } from "@/lib/db";
import { getConnections, getDoubts, listSubscriptions, recompute, refreshWatch, saveUpload, saveWatch } from "@/lib/store";

const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048, privateKeyEncoding: { type: "pkcs8", format: "pem" }, publicKeyEncoding: { type: "spki", format: "pem" } });
const json = (body: unknown, status = 200) => new Response(status === 204 ? null : JSON.stringify(body), { status });

/** A PayPal line as Enable Banking returns it (real shape: we-promise/sure issue 1193, March 2026). */
const line = (over: Partial<EbTransaction> = {}): EbTransaction => ({
  entry_reference: "REF",
  transaction_amount: { amount: "12.99", currency: "EUR" },
  credit_debit_indicator: "DBIT",
  status: "BOOK",
  booking_date: undefined,
  value_date: undefined,
  transaction_date: "2026-03-08",
  creditor: { name: "Spotify AB", contact_details: { email_address: "paypal-se@spotify.com" } },
  debtor: null,
  remittance_information: [],
  bank_transaction_code: { description: "PAYMENT", code: "PMNT" },
  ...over,
});

describe("PayPal lines read through Enable Banking", () => {
  it("gives the same row as the PayPal activity download", () => {
    const row = toPaypalTransaction(line())!;
    const csv = paypalPayment({ date: "2026-03-08", name: "Spotify AB", amount: 12.99, currency: "EUR", toPerson: false });
    expect(row).toMatchObject({ date: "2026-03-08", amount: 12.99, currency: "EUR", rawLabel: "PAYPAL Spotify AB", merchant: "Spotify AB", source: "paypal" });
    expect({ ...row, id: "" }).toEqual({ ...csv, id: "" });
  });

  it("keeps completed payments only", () => {
    expect(toPaypalTransaction(line({ credit_debit_indicator: "CRDT" }))).toBeNull(); // refund or money received
    expect(toPaypalTransaction(line({ status: "PDNG" }))).toBeNull();
    expect(toPaypalTransaction(line({ creditor: { name: null } }))).toBeNull(); // payout to the user's bank
    expect(toPaypalTransaction(line({ bank_transaction_code: { description: "Currency conversion" } }))).toBeNull();
    expect(toPaypalTransaction(line({ bank_transaction_code: { description: "PAYMENT", sub_code: "REFUND" } }))).toBeNull();
    expect(toPaypalTransaction(line({ transaction_date: undefined }))).toBeNull();
  });

  it("judges the type, never the payee, and spots money sent to a person", () => {
    expect(toPaypalTransaction(line({ creditor: { name: "WeTransfer BV" } }))!.merchant).toBe("WeTransfer BV");
    expect(toPaypalTransaction(line({ creditor: { name: "Marie Martin", contact_details: { email_address: "marie.martin@gmail.com" } } }))!.rawLabel).toBe("TRANSFER PAYPAL Marie Martin");
    // "XXX" is ISO 4217's "no currency": PayPal sends it for EUR accounts at times.
    expect(toPaypalTransaction(line({ transaction_amount: { amount: "5", currency: "XXX" } }))!.currency).toBe("EUR");
    // Stores name the app in the item title, as in the export.
    expect(toPaypalTransaction(line({ creditor: { name: "Google Payment Ireland Limited" }, remittance_information: ["Pro (SoundType AI - Voice To Text)"] }))!.merchant).toBe("SoundType AI");
  });

  it("recognises PayPal among the banks", () => {
    expect(["PayPal", "Demo PayPal (test data)"].map(isPaypal)).toEqual([true, true]);
    expect(kindOf({ name: "Crédit Mutuel", country: "FR" })).toBe("bank");
  });
});

describe("PayPal connection", () => {
  it("asks for a shorter history when PayPal answers the long one with an empty list", async () => {
    const asked: string[] = [];
    const f = (async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/sessions") && init?.method === "POST") return json({ session_id: "s1", accounts: [{ uid: "pp" }] });
      if (url.includes("/transactions")) {
        const from = new URL(url).searchParams.get("date_from")!;
        asked.push(from);
        return json({ transactions: from >= "2026-06-01" ? [line({ transaction_date: "2026-09-01" }), line({ creditor: { name: null } })] : [] });
      }
      return json({}, 204);
    }) as typeof fetch;
    const read = await new EnableBanking("app", privateKey, f).finish({ code: "c", since: ["2024-09-26", "2025-08-27", "2026-06-29"], kind: "paypal" });
    expect(asked).toEqual(["2024-09-26", "2025-08-27", "2026-06-29"]);
    expect(read.transactions.map((t) => [t.date, t.source, t.merchant])).toEqual([["2026-09-01", "paypal", "Spotify AB"]]);
    expect(read.stats).toMatchObject({ raw: 2, skipped: 1 });
    // Field names only, nested ones included, to learn PayPal's shape.
    expect(read.stats!.fields).toEqual(expect.arrayContaining(["creditor.name", "transaction_date", "bank_transaction_code.description"]));
    expect(JSON.stringify(read.stats)).not.toContain("Spotify");
  });

  it("stays within PayPal's consent limit and PSU type", async () => {
    const bodies: Record<string, unknown>[] = [];
    const f = (async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/aspsps")) return json({ aspsps: [{ name: "PayPal", country: "FR", psu_types: ["business"], maximum_consent_validity: 30 * 86_400 }, { name: "Banque X", country: "FR", psu_types: ["business"] }] });
      bodies.push(JSON.parse(init!.body as string));
      return json({ url: "https://paypal.example/login" });
    }) as typeof fetch;
    const eb = new EnableBanking("app", privateKey, f);
    expect((await eb.listInstitutions("FR")).map((i) => i.name)).toEqual(["PayPal"]);
    const { days } = await eb.start({ institution: { name: "PayPal", country: "FR" }, redirectUrl: "https://app.example/cb", state: "st", keepDays: 90 });
    expect(days).toBe(30);
    expect(bodies[0].psu_type).toBe("business");
    expect(Math.round((Date.parse((bodies[0].access as { valid_until: string }).valid_until) - Date.now()) / 86_400_000)).toBe(30);
  });

  it("names the bank's PAYPAL line, leaves money sent to a friend out, and asks to connect PayPal only while needed", () => {
    const today = "2026-09-26";
    const bank = demoTransactions(today).transactions;
    const paypal = demoPaypalTransactions(today).transactions;
    expect(paypal.map((t) => t.rawLabel)).toContain("TRANSFER PAYPAL Marie Martin");
    expect(paypal.some((t) => t.amount === 120)).toBe(false); // the payout to the bank

    // Bank alone: the 23.99 PayPal subscription is unnamed, and connecting PayPal is suggested first.
    const before = analyze(bank, { today }).subscriptions;
    const facts = collectFacts(bank, new Set());
    const doubts = findDoubts(before, facts, { banks: ["Demo bank (test data)"], mailboxes: [], files: 0 }, "fr", { canConnect: true });
    expect(doubts[0]).toMatchObject({ kind: "paypal", bank: "PayPal", title: "1 abonnement payé via PayPal : connectez PayPal pour le nommer" });
    expect(doubts.some((d) => d.kind === "name" && /PayPal/.test(d.title))).toBe(false);
    expect(doubts.find((d) => d.kind === "mail")?.title).toMatch(/Google Play ou Apple/);
    // Without a way to connect, the mailbox is asked for PayPal too.
    expect(findDoubts(before, facts, { banks: ["Demo bank (test data)"], mailboxes: [], files: 0 }, "fr").some((d) => d.kind === "paypal")).toBe(false);

    // Bank and PayPal: the line is named, and neither the transfer nor a second copy becomes a subscription.
    const all = [...bank, ...paypal];
    const after = analyze(all, { today }).subscriptions;
    const adobe = after.find((s) => /adobe/i.test(s.serviceName))!;
    expect(adobe).toMatchObject({ currentAmount: 23.99, frequency: "monthly", needsLabel: false });
    expect(adobe.matchedSources).toEqual(["bank", "paypal"]);
    expect(after.filter((s) => s.currentAmount === 23.99)).toHaveLength(1);
    expect(after.some((s) => /marie/i.test(s.serviceName))).toBe(false);
    const explained = new Set(reconcile(all).map((m) => m.bankTransactionId));
    const later = findDoubts(after, collectFacts(all, explained), { banks: ["Demo bank (test data)"], mailboxes: [], files: 0, wallets: ["Demo PayPal (test data)"] }, "fr", { canConnect: true });
    expect(later.some((d) => d.kind === "paypal")).toBe(false);
  });

  it("is listed apart from the banks, and read again every night as PayPal", async () => {
    const session = randomUUID();
    const today = new Date().toISOString().slice(0, 10);
    await saveUpload(session, "Bank connection: Demo bank (test data) (1 account)", "bank", demoTransactions(today).transactions);
    await saveUpload(session, "Bank connection: Demo PayPal (test data) (1 account)", "paypal", demoPaypalTransactions(today).transactions);
    await recompute(session);
    expect(await getConnections(session)).toEqual({ banks: ["Demo bank (test data)"], wallets: ["Demo PayPal (test data)"], mailboxes: [], files: 0 });
    expect((await getDoubts(session, "fr")).some((d) => d.kind === "paypal")).toBe(false);
    const count = (await listSubscriptions(session)).length;

    const link = await saveWatch(session, { provider: "demo", institution: "Demo PayPal (test data)", access: { session: "demo", accounts: ["demo"] }, locale: "fr", days: 90 });
    expect(await refreshWatch((await prisma.bankLink.findUnique({ where: { id: link.id } }))!)).toEqual([]);
    const uploads = await prisma.upload.findMany({ where: { sessionId: session }, orderBy: { uploadedAt: "asc" } });
    expect(uploads.at(-1)!.sourceType).toBe("paypal");
    expect((await prisma.transaction.findMany({ where: { uploadId: uploads.at(-1)!.id } })).every((t) => t.source === "paypal")).toBe(true);
    // The nightly copy of the same payments adds nothing.
    expect((await listSubscriptions(session)).length).toBe(count);
  });
});

describe("PayPal export and PayPal connection together", () => {
  it("counts a payment once when the two date it a day apart", () => {
    const months = ["2026-06", "2026-07", "2026-08"];
    const fromCsv = months.map((m) => ({ ...paypalPayment({ date: `${m}-08`, name: "Spotify AB", amount: 12.99, currency: "EUR", toPerson: false }), uploadId: "csv" }));
    const fromApi = months.map((m) => ({ ...paypalPayment({ date: `${m}-09`, name: "Spotify AB", amount: 12.99, currency: "EUR", toPerson: false }), uploadId: "api" }));
    const [spotify] = analyze([...fromCsv, ...fromApi], { today: "2026-08-20" }).subscriptions;
    expect(spotify.transactions).toHaveLength(3);
    expect(spotify.totalPaid).toBeCloseTo(38.97);
  });
});
