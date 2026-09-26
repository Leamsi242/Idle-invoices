import { describe, expect, it, vi } from "vitest";
import { generateKeyPairSync, randomUUID } from "node:crypto";
import { EnableBanking, toPaypalTransaction, type EbTransaction } from "@/lib/banking/enable-banking";
import { demoPaypalTransactions, demoTransactions } from "@/lib/banking/demo";
import { isPaypal, kindOf } from "@/lib/banking";
import { paypalPayment } from "@/lib/parsers/paypal-csv";
import { analyze } from "@/lib/engine/pipeline";
import { addDays, addMonths } from "@/lib/dates";
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
    vi.stubEnv("BANK_DEMO", "1");
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

describe("PayPal review fixes", () => {
  const bankLine = (date: string, amount: number, rawLabel: string) => ({ id: `${rawLabel}-${date}`, date, amount, currency: "EUR", rawLabel, source: "bank" as const });

  it("still asks which app when PayPal paid a store that its line does not name", () => {
    const months = ["2025-10", "2025-11", "2025-12", ...Array.from({ length: 9 }, (_, i) => `2026-0${i + 1}`)];
    const bank = months.map((m) => bankLine(`${m}-05`, 4.99, "PRLV SEPA PAYPAL EUROPE S.A.R.L"));
    const paypal = months.slice(-3).map((m) => toPaypalTransaction(line({ transaction_date: `${m}-03`, transaction_amount: { amount: "4.99", currency: "EUR" }, creditor: { name: "Google Payment Ireland Limited" } }))!);
    const [sub] = analyze([...bank, ...paypal], { today: "2026-09-10" }).subscriptions;
    expect(sub).toMatchObject({ needsLabel: true, channel: "google" });
    const doubts = findDoubts([sub], collectFacts([...bank, ...paypal], new Set()), { banks: ["B"], mailboxes: [], files: 0, wallets: ["PayPal"] }, "en", { canConnect: true });
    // A Play Store screenshot could not name a PayPal payment: only the name is asked.
    const name = doubts.find((d) => d.kind === "name")!;
    expect(name).toMatchObject({ title: "Which service is the €4.99 a month paid through Google Play?" });
    expect(name.kind === "name" && name.store).toBeUndefined();
  });

  it("keeps products named after a store as they are", async () => {
    const { storeOf } = await import("@/lib/engine/labels");
    expect(["Google Payment Ireland Limited", "Apple Services", "Paddle.com Market Ltd", "Stripe Payments Europe"].map(storeOf)).toEqual(["google", "apple", "processor", "processor"]);
    expect(["Google Play Pass", "iTunes Match", "Google One", "Stripe Press Books"].map(storeOf)).toEqual([undefined, undefined, undefined, undefined]);
  });

  it("asks one question per app when two apps were bought through the same store", () => {
    const months = ["2026-06", "2026-07", "2026-08"];
    const rows = [4.99, 11.99].flatMap((amount) => months.map((m) => toPaypalTransaction(line({ transaction_date: `${m}-03`, transaction_amount: { amount: String(amount), currency: "EUR" }, creditor: { name: "Google Payment Ireland Limited" } }))!));
    const subs = analyze(rows, { today: "2026-08-20" }).subscriptions;
    const ids = findDoubts(subs, collectFacts(rows, new Set()), { banks: [], mailboxes: [], files: 0, wallets: ["PayPal"] }).filter((d) => d.kind === "name").map((d) => d.id);
    expect(ids).toHaveLength(2);
    expect(new Set(ids).size).toBe(2);
  });

  it("keeps the older bank lines of a subscription PayPal named, beyond PayPal's window", () => {
    const months = Array.from({ length: 24 }, (_, i) => addMonths("2024-10-05", i));
    const bank = months.map((d) => bankLine(d, 10.99, "PRLV SEPA PAYPAL (EUROPE) S.A R.L. ET CIE"));
    const paypal = months.slice(-3).map((d) => toPaypalTransaction(line({ transaction_date: addDays(d, -2), transaction_amount: { amount: "10.99", currency: "EUR" } }))!);
    const [spotify] = analyze([...bank, ...paypal], { today: "2026-09-20" }).subscriptions;
    expect(spotify.serviceName).toMatch(/spotify/i);
    expect(spotify.transactions).toHaveLength(24);
  });

  it("keeps the 4X rule for bank lines older than the PayPal data", () => {
    const plan = ["2025-01-12", "2025-02-12", "2025-03-12"].map((d) => bankLine(d, 62.5, "PRLV SEPA PAYPAL (EUROPE) S.A R.L. ET CIE"));
    const vinted = toPaypalTransaction(line({ transaction_date: "2026-09-01", creditor: { name: "Vinted UAB" } }))!;
    expect(analyze(plan, { today: "2026-09-10" }).subscriptions).toEqual([]);
    expect(analyze([...plan, vinted], { today: "2026-09-10" }).subscriptions).toEqual([]);
  });

  it("accepts a monthly PayPal payment seen twice when PayPal is all there is", () => {
    const rows = ["2026-07-12", "2026-08-12"].map((d) => toPaypalTransaction(line({ transaction_date: d, transaction_amount: { amount: "7.49", currency: "EUR" }, creditor: { name: "Kagi Inc" } }))!);
    const subs = analyze(rows, { today: "2026-08-20" }).subscriptions;
    expect(subs.map((s) => [s.serviceName, s.frequency, s.forgottenReasons[0]])).toEqual([["Kagi Inc", "monthly", "Seen twice so far: PayPal shares about 3 months of history"]]);
  });
});

describe("report by way of paying, and label changes", () => {
  const bankLine = (date: string, amount: number, rawLabel: string, uploadId = "cm") => ({ id: `${rawLabel}-${date}`, uploadId, date, amount, currency: "EUR", rawLabel, source: "bank" as const });

  it("joins a subscription whose bank label changed format mid-history", () => {
    const before = ["2026-04-13", "2026-05-11", "2026-06-11"].map((d) => bankLine(d, 11, "PRLV SEPA ASSURANCE ACCIDENTS DE LA VIE P"));
    const after = ["2026-07-13", "2026-08-11", "2026-09-11"].map((d) => bankLine(d, 11, "PRLV SEPA ASSURANCE ACCIDENTS DE LA VIE"));
    const subs = analyze([...before, ...after], { today: "2026-09-20" }).subscriptions;
    expect(subs).toHaveLength(1);
    expect(subs[0]).toMatchObject({ serviceName: "Assurance Accidents De La Vie", firstSeen: "2026-04-13", status: "active" });
    expect(subs[0].transactions).toHaveLength(6);
  });

  it("leaves tax payments out", () => {
    const tax = ["2026-04-15", "2026-05-15", "2026-06-15"].map((d) => bankLine(d, 92, "PRLV SEPA DIRECTION GENERALE DE"));
    expect(analyze(tax, { today: "2026-06-20" }).subscriptions).toEqual([]);
  });

  it("says which bank, card or PayPal pays each subscription", async () => {
    const { paymentMethods, PAID_WITH_RECEIPTS } = await import("@/lib/store");
    const paidWith = paymentMethods([
      { id: "cm", fileName: "Bank connection: Crédit Mutuel (2 accounts)", sourceType: "bank" },
      { id: "amex", fileName: "Bank connection: American Express (1 account)", sourceType: "bank" },
      { id: "pp", fileName: "Bank connection: PayPal (1 account)", sourceType: "paypal" },
      { id: "mail", fileName: "Gmail scan (10 emails checked)", sourceType: "email" },
    ]);
    const tx = (uploadId: string, rawLabel = "X") => ({ ...bankLine("2026-01-01", 1, rawLabel, uploadId) });
    expect(paidWith({ transactions: [tx("cm")], matchedSources: ["bank", "paypal"] })).toEqual(["Crédit Mutuel", "PayPal"]);
    expect(paidWith({ transactions: [tx("amex")], matchedSources: ["bank"] })).toEqual(["American Express"]);
    expect(paidWith({ transactions: [tx("pp")], matchedSources: ["paypal"] })).toEqual(["PayPal"]);
    expect(paidWith({ transactions: [tx("mail")], matchedSources: ["email"] })).toEqual([PAID_WITH_RECEIPTS]);
  });
});
