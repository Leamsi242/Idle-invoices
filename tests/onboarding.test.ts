import { describe, expect, it } from "vitest";
import { buildPlan, collectFacts, EMPTY_ANSWERS, gdprRequest, progress, sanitizeAnswers } from "@/lib/onboarding";
import { tx } from "./factory";

const none = collectFacts([], new Set());

describe("onboarding checklist", () => {
  it("lists one item per source the user named, bank first", () => {
    const plan = buildPlan({ ...EMPTY_ANSWERS, banks: ["credit-mutuel"], cards: ["amex"], wallets: ["paypal"], stores: ["apple", "google"], mailboxes: ["gmail", "outlook"] }, none);
    expect(plan.map((i) => [i.id, i.status])).toEqual([
      ["bank:credit-mutuel", "todo"], ["card:amex", "todo"], ["paypal", "todo"], ["apple", "todo"], ["google", "todo"], ["mail:gmail", "todo"], ["mail:outlook", "todo"],
    ]);
    expect(plan[0].steps.join(" ")).toMatch(/PDF statements/);
    expect(plan.find((i) => i.id === "mail:outlook")!.steps.join(" ")).toMatch(/Download: it saves a \.eml file/);
    expect(progress(plan)).toEqual({ done: 0, total: 7 });
  });

  it("points to the sources the statements reveal, even if the user did not mention them", () => {
    const bank = [
      tx("2026-06-02", 23.99, "PRLV SEPA PAYPAL EUROPE S.A.R.L"),
      tx("2026-07-02", 23.99, "PRLV SEPA PAYPAL EUROPE S.A.R.L"),
      tx("2026-07-05", 9.99, "PAYPAL *SPOTIFY"),
      tx("2026-06-24", 742.24, "PRLV SEPA AMERICAN EXPRESS CARTE FRANCE"),
      tx("2026-07-24", 426.78, "PRLV SEPA AMERICAN EXPRESS CARTE FRANCE"),
      tx("2026-07-12", 2.99, "APPLE.COM/BILL ITUNES.COM"),
      tx("2026-06-30", 312.4, "FACTURE CARTE DU 300626 CARTE 4970XXXX"),
      tx("2026-06-10", 29.99, "PRLV SEPA BOUYGUES TELECOM"),
      tx("2026-07-10", 29.99, "PRLV SEPA BOUYGUES TELECOM"),
    ];
    const facts = collectFacts(bank, new Set([bank[2].id]));
    expect(facts.intermediaries.paypal).toEqual({ charges: 3, unexplained: 2 });
    const plan = buildPlan({ ...EMPTY_ANSWERS, banks: ["bnp"] }, facts);
    const byId = Object.fromEntries(plan.map((i) => [i.id, i]));
    expect(byId["card:amex"]).toMatchObject({ detected: true, status: "todo", alert: "We found 2 payments to American Express on your bank account, but not the card's own statement." });
    expect(byId.paypal).toMatchObject({ detected: true, alert: "2 PayPal payments on your statements are still unnamed." });
    expect(byId.apple.alert).toBe("1 Apple charge on your statements is still unnamed.");
    expect(byId["card:deferred"]).toMatchObject({ detected: true, status: "optional" });
    expect(byId.operator).toMatchObject({ detected: true, status: "optional" });
    expect(byId["bank:bnp"]).toMatchObject({ status: "done", alert: expect.stringMatching(/Add older months/) });
  });

  it("ticks items from the data, and by hand", () => {
    const facts = collectFacts([
      tx("2025-09-20", 19.9, "AMEX PARIS SAINT GERMAIN PARIS"),
      tx("2026-09-10", 216, "AMEX ANTHROPIC* CLAUDE SUB DUBLIN"),
      tx("2026-09-12", 9.99, "Spotify", "paypal"),
    ], new Set());
    const plan = buildPlan({ ...EMPTY_ANSWERS, cards: ["amex"], wallets: ["paypal"], stores: ["amazon"], done: ["amazon"] }, facts);
    expect(plan.map((i) => [i.id, i.status])).toEqual([["bank:other-bank", "done"], ["card:amex", "done"], ["paypal", "done"], ["amazon", "done"]]);
    expect(plan[1].alert).toBeUndefined();
  });

  it("does not tick every bank when only one bank's statements were read", () => {
    const facts = collectFacts([tx("2026-07-01", 10.99, "SPOTIFY")], new Set());
    const plan = buildPlan({ ...EMPTY_ANSWERS, banks: ["credit-mutuel", "n26"], done: ["bank:n26"] }, facts);
    expect(plan.map((i) => [i.id, i.status])).toEqual([["bank:credit-mutuel", "todo"], ["bank:n26", "done"]]);
    expect(plan[0].alert).toMatch(/one of your banks/);
  });

  it("keeps only known answers", () => {
    expect(sanitizeAnswers({ banks: ["bnp", "bnp", "<script>"], cards: "amex", other: ["bnpl"], done: ["paypal", "DROP TABLE"], iban: "FR76" })).toEqual({
      ...EMPTY_ANSWERS, banks: ["bnp"], other: ["bnpl"], done: ["paypal"],
    });
  });

  it("writes a GDPR access request citing the right articles", () => {
    const text = gdprRequest("PayPal", "2017");
    expect(text).toMatch(/article 15/);
    expect(text).toMatch(/article 20/);
    expect(text).toMatch(/Article 12\(3\)/);
    expect(text).toMatch(/since 2017/);
  });
});
