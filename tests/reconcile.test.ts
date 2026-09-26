import { describe, expect, it } from "vitest";
import { reconcile } from "@/lib/engine/reconcile";
import { analyze } from "@/lib/engine/pipeline";
import { tx } from "./factory";
import { loadAllSamples } from "./helpers";

describe("reconcile", () => {
  it("matches an exact PayPal record with full confidence", () => {
    const bank = tx("2026-03-20", 24.99, "PAYPAL *");
    const pp = tx("2026-03-20", 24.99, "PAYPAL Uber", "paypal", { merchant: "Uber One" });
    expect(reconcile([bank, pp])).toEqual([{ bankTransactionId: bank.id, intermediaryTransactionId: pp.id, confidence: 1, candidateCount: 1, merchant: "Uber One" }]);
  });

  it("matches within 3 days with lower confidence, not beyond", () => {
    const bank = tx("2026-03-10", 9.99, "PAYPAL *");
    const near = tx("2026-03-08", 9.99, "PAYPAL Disney", "paypal", { merchant: "Disney Plus" });
    expect(reconcile([bank, near])[0].confidence).toBe(0.8);
    const after = tx("2026-03-14", 9.99, "PAYPAL Disney", "paypal", { merchant: "Disney Plus" });
    expect(reconcile([bank, after])).toEqual([]);
  });

  it("gives a bank line to the payee named after the star", () => {
    const bank = tx("2024-10-17", 5.99, "PAIEMENT CB 1510 LUXEMBOURG PAYPAL *UBER");
    const uber = tx("2024-10-15", 5.99, "PAYPAL Uber BV", "paypal", { merchant: "Uber BV" });
    const sony = tx("2024-10-16", 5.99, "PAYPAL Sony Interactive Entertainment", "paypal", { merchant: "Sony Interactive Entertainment" });
    expect(reconcile([bank, sony, uber]).map((m) => m.merchant)).toEqual(["Uber BV"]);
  });

  it("accepts a card booking up to 6 days after the PayPal payment", () => {
    const record = tx("2024-12-13", 10.99, "PAYPAL Google Payment Ireland Limited", "paypal", { merchant: "SoundType AI" });
    expect(reconcile([tx("2024-12-17", 10.99, "PAIEMENT CB 1312 LUXEMBOURG PAYPAL *GOOGLE"), record])[0].confidence).toBe(0.6);
    expect(reconcile([tx("2024-12-20", 10.99, "PAIEMENT CB 1312 LUXEMBOURG PAYPAL *GOOGLE"), record])).toEqual([]);
  });

  it("requires the same amount and currency", () => {
    const bank = tx("2026-03-10", 9.99, "PAYPAL *");
    expect(reconcile([bank, tx("2026-03-10", 10.99, "x", "paypal", { merchant: "A" })])).toEqual([]);
    expect(reconcile([bank, tx("2026-03-10", 9.99, "x", "paypal", { merchant: "A", currency: "USD" })])).toEqual([]);
  });

  it("only reconciles intermediary charges, with sources that fit the intermediary", () => {
    const direct = tx("2026-03-10", 9.99, "NETFLIX.COM");
    const apple = tx("2026-03-10", 9.99, "APPLE.COM/BILL");
    const pp = tx("2026-03-10", 9.99, "PAYPAL X", "paypal", { merchant: "X" });
    expect(reconcile([direct, apple, pp])).toEqual([]);
    const store = tx("2026-03-09", 9.99, "APPLE Y", "apple", { merchant: "Y" });
    expect(reconcile([apple, store])[0].merchant).toBe("Y");
  });

  it("picks the closest date among several candidates and lowers confidence", () => {
    const bank = tx("2026-03-10", 4.99, "PAYPAL *");
    const a = tx("2026-03-07", 4.99, "PAYPAL A", "paypal", { merchant: "Service A" });
    const b = tx("2026-03-09", 4.99, "PAYPAL B", "paypal", { merchant: "Service B" });
    const [m] = reconcile([bank, a, b]);
    expect(m).toMatchObject({ intermediaryTransactionId: b.id, merchant: "Service B", candidateCount: 2 });
    expect(m.confidence).toBe(0.7); // 0.9 for 1 day, minus 0.2 for a rival merchant
  });

  it("uses each record once when two identical charges compete", () => {
    const b1 = tx("2026-03-10", 4.99, "PAYPAL *");
    const b2 = tx("2026-03-11", 4.99, "PAYPAL *");
    const r1 = tx("2026-03-10", 4.99, "PAYPAL A", "paypal", { merchant: "A" });
    const r2 = tx("2026-03-11", 4.99, "PAYPAL B", "paypal", { merchant: "B" });
    const matches = reconcile([b1, b2, r1, r2]);
    expect(matches).toHaveLength(2);
    expect(matches.find((m) => m.bankTransactionId === b1.id)!.merchant).toBe("A");
    expect(matches.find((m) => m.bankTransactionId === b2.id)!.merchant).toBe("B");
  });

  it("prefers the PayPal record over a receipt email on a tie, without penalising the same merchant", () => {
    const bank = tx("2025-11-16", 83.99, "PAYPAL *");
    const email = tx("2025-11-14", 83.99, "EMAIL Duolingo", "email", { merchant: "Duolingo", frequency: "yearly" });
    const pp = tx("2025-11-14", 83.99, "PAYPAL Duolingo", "paypal", { merchant: "Duolingo" });
    const [m] = reconcile([bank, email, pp]);
    expect(m).toMatchObject({ intermediaryTransactionId: pp.id, confidence: 0.8, candidateCount: 2 });
  });
});

describe("reconciliation on the samples", () => {
  it("unmasks the PayPal, Apple and Paddle charges", async () => {
    const txs = await loadAllSamples();
    const { matches, subscriptions } = analyze(txs);
    const byId = new Map(txs.map((t) => [t.id, t]));
    const vague = txs.filter((t) => t.source === "bank" && /PAYPAL|APPLE\.COM/.test(t.rawLabel) && t.amount > 0);
    const matched = vague.filter((t) => matches.some((m) => m.bankTransactionId === t.id));
    expect(matched.length / vague.length).toBeGreaterThanOrEqual(0.8); // SPEC target: 80% unmasked
    expect(matched).toHaveLength(vague.length);
    const merchants = new Set(matches.map((m) => m.merchant));
    for (const m of ["Uber", "Disney Plus", "Duolingo", "Apple One", "iCloud+", "Notion", "Vintage Records Shop"]) expect(merchants).toContain(m);
    expect(matches.every((m) => byId.get(m.bankTransactionId)!.source === "bank")).toBe(true);
    expect(subscriptions.find((s) => s.serviceName === "Disney+")!.matchedSources).toContain("paypal");
  });
});
