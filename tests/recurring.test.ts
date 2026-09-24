import { describe, expect, it } from "vitest";
import { detectRecurring, regularity } from "@/lib/engine/recurring";
import { cleanLabel } from "@/lib/engine/labels";
import { analyze } from "@/lib/engine/pipeline";
import { monthlySeries, tx, weeklySeries } from "./factory";
import { loadAllSamples, parseSample } from "./helpers";

const byLabel = (t: { rawLabel: string }) => cleanLabel(t.rawLabel);

describe("cleanLabel", () => {
  it("removes prefixes, references, dates and masked numbers", () => {
    expect(cleanLabel("CB PADDLE.NET* NOTION 22/01")).toBe("PADDLE.NET* NOTION");
    expect(cleanLabel("SPOTIFY P2A91C7F3E")).toBe("SPOTIFY");
    expect(cleanLabel("PAYPAL * ••••1923 PAYPAL")).toBe("PAYPAL * PAYPAL");
    expect(cleanLabel("PRLV SEPA FREE MOBILE")).toBe("FREE MOBILE");
    expect(cleanLabel("Netflix.com")).toBe("NETFLIX.COM");
  });
});

describe("regularity", () => {
  it("recognises each frequency window", () => {
    expect(regularity(["2026-01-01", "2026-01-08", "2026-01-15"])?.frequency).toBe("weekly");
    expect(regularity(["2026-01-31", "2026-02-28", "2026-03-31"])?.frequency).toBe("monthly");
    expect(regularity(["2025-01-10", "2025-04-10", "2025-07-10"])?.frequency).toBe("quarterly");
    expect(regularity(["2025-10-02", "2026-09-29"])?.frequency).toBe("yearly");
  });
  it("allows one missed payment but not two", () => {
    expect(regularity(["2026-01-05", "2026-02-05", "2026-04-05", "2026-05-05"])).toEqual({ frequency: "monthly", missed: 1 });
    expect(regularity(["2026-01-05", "2026-03-05", "2026-05-05", "2026-06-05"])).toBeNull();
  });
  it("rejects irregular intervals and too few charges", () => {
    expect(regularity(["2026-01-05", "2026-01-20", "2026-03-01"])).toBeNull();
    expect(regularity(["2026-01-05", "2026-02-05"])).toBeNull(); // 2 monthly charges are not enough
  });
});

describe("detectRecurring", () => {
  it("finds weekly and monthly series and ignores one-off purchases", () => {
    const txs = [
      ...weeklySeries("2026-01-02", 6, 59.99, "HELLOFRESH"),
      ...monthlySeries("2026-01-10", 5, 7.99, "CB SPOTIFY 10/01"),
      tx("2026-01-15", 45, "CB FNAC"),
      tx("2026-02-17", 44, "CB FNAC"),
      tx("2026-05-02", 89, "CB FNAC"),
    ];
    const { groups } = detectRecurring(txs, byLabel);
    expect(groups.map((g) => [g.key, g.frequency, g.transactions.length])).toEqual([
      ["HELLOFRESH", "weekly", 6],
      ["SPOTIFY", "monthly", 5],
    ]);
  });

  it("keeps a series together across a price increase", () => {
    const txs = monthlySeries("2025-10-05", 12, (i) => (i < 6 ? 13.49 : 15.99), "NETFLIX.COM");
    const { groups } = detectRecurring(txs, byLabel);
    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({ frequency: "monthly", currentAmount: 15.99, averageAmount: 14.74 });
    expect(groups[0].priceChanges).toEqual([{ date: "2026-04-05", from: 13.49, to: 15.99 }]);
  });

  it("accepts a price increase that happened on the latest charge", () => {
    const txs = monthlySeries("2026-01-05", 6, (i) => (i < 5 ? 10 : 12), "DAZN");
    const { groups } = detectRecurring(txs, byLabel);
    expect(groups).toHaveLength(1);
    expect(groups[0].currentAmount).toBe(12);
  });

  it("tolerates one missed month", () => {
    const txs = monthlySeries("2025-10-12", 12, 11.12, "SPOTIFY", [4]);
    const { groups } = detectRecurring(txs, byLabel);
    expect(groups[0]).toMatchObject({ frequency: "monthly", missedPayments: 1 });
    expect(groups[0].transactions).toHaveLength(11);
  });

  it("separates two subscriptions behind the same label by amount", () => {
    const txs = [...monthlySeries("2026-01-18", 6, 19.95, "APPLE.COM/BILL"), ...monthlySeries("2026-01-04", 6, 0.99, "APPLE.COM/BILL")];
    const { groups } = detectRecurring(txs, byLabel);
    expect(groups.map((g) => g.currentAmount).sort()).toEqual([0.99, 19.95]);
  });

  it("does not merge unrelated one-off purchases as a price change", () => {
    const txs = [tx("2025-11-01", 126.84, "IKEA"), tx("2026-02-01", 84.34, "IKEA"), tx("2026-05-01", 90, "IKEA")];
    expect(detectRecurring(txs, byLabel).groups).toHaveLength(0);
  });
});

describe("recurring detection on the samples", () => {
  const EXPECTED = [
    ["Netflix", "monthly"], ["Spotify", "monthly"], ["Uber One", "monthly"], ["Disney+", "monthly"],
    ["Basic-Fit", "monthly"], ["Duolingo", "yearly"], ["Apple One", "monthly"], ["iCloud+", "monthly"],
    ["Notion", "monthly"], ["Focusflow", "monthly"], ["Deezer", "monthly"], ["Amazon Prime", "yearly"],
    ["Canal+", "monthly"], ["Free Mobile", "monthly"], ["WeTransfer", "weekly"], ["Strava", "monthly"],
    // Only in the Google Play list (paid with a card we have no statement for).
    ["Google One", "monthly"],
  ];

  it("finds every subscription in /samples and nothing else", async () => {
    const { subscriptions } = analyze(await loadAllSamples());
    expect(subscriptions.map((s) => [s.serviceName, s.frequency]).sort()).toEqual([...EXPECTED].sort());
  });

  it("ignores groceries, one-off purchases, salary and rent", async () => {
    const { subscriptions } = analyze(await loadAllSamples());
    const keys = subscriptions.map((s) => s.key).join(" ");
    for (const noise of ["LIDL", "CARREFOUR", "FNAC", "IKEA", "SNCF", "BISTROT", "TILLEULS", "EXAMPLE CORP", "VINTAGE", "PHARMACIE"]) {
      expect(keys).not.toContain(noise);
    }
  });

  it("finds the bank-only subscriptions from one CSV without any other source", async () => {
    const { transactions } = await parseSample("bank-n26.csv");
    const { groups } = detectRecurring(transactions.filter((t) => !cleanLabel(t.rawLabel).startsWith("TRANSFER")), byLabel);
    expect(groups.map((g) => g.key)).toEqual(["BASIC-FIT FRANCE", "NETFLIX.COM", "PAYPAL * PAYPAL", "PAYPAL *UBER PAYPAL", "SPOTIFY", "WETRANSFER.COM"]);
    const netflix = groups.find((g) => g.key === "NETFLIX.COM")!;
    expect(netflix.priceChanges).toHaveLength(1);
    expect(groups.find((g) => g.key === "SPOTIFY")!.missedPayments).toBe(1);
  });
});

describe("statements with many different payments under one label", () => {
  it("finds the exact-amount subscription hidden among other PayPal payments", () => {
    const noise = ["2026-05-08", "2026-05-12", "2026-05-20", "2026-06-03", "2026-06-15", "2026-06-28", "2026-07-06", "2026-07-19", "2026-08-10"]
      .map((d, i) => tx(d, [22.07, 22.56, 23.23, 23.59, 24.4, 22.9, 23.1, 24.8, 22.3][i], "PRLV SEPA PAYPAL EUROPE S.A.R.L"));
    const adobe = ["2026-05-04", "2026-06-02", "2026-07-01", "2026-08-04"].map((d) => tx(d, 23.99, "PRLV SEPA PAYPAL EUROPE S.A.R.L"));
    const { groups } = detectRecurring([...noise, ...adobe], byLabel);
    expect(groups.map((g) => [g.currentAmount, g.transactions.length])).toEqual([[23.99, 4]]);
  });

  it("still joins yearly price steps of the same exact-amount series", () => {
    const txs = [...monthlySeries("2023-01-03", 12, 84.1, "NAVIGO ANNUEL"), ...monthlySeries("2024-01-03", 12, 86.4, "NAVIGO ANNUEL")];
    const { groups } = detectRecurring(txs, byLabel);
    expect(groups).toHaveLength(1);
    expect(groups[0].priceChanges).toEqual([{ date: "2024-01-03", from: 84.1, to: 86.4 }]);
  });
});

describe("overlapping uploads", () => {
  it("counts a bank line present in two statements once, but keeps same-day twins within one", async () => {
    const { dedupeUploads } = await import("@/lib/engine/pipeline");
    const a = [tx("2026-06-02", 23.99, "PAYPAL", "bank", { uploadId: "u1" }), tx("2026-06-02", 5.99, "PAYPAL", "bank", { uploadId: "u1" }), tx("2026-06-02", 5.99, "PAYPAL", "bank", { uploadId: "u1" })];
    const b = [tx("2026-06-02", 23.99, "PAYPAL", "bank", { uploadId: "u2" }), tx("2026-06-02", 5.99, "PAYPAL", "bank", { uploadId: "u2" })];
    expect(dedupeUploads([...a, ...b]).map((t) => t.amount).sort()).toEqual([23.99, 5.99, 5.99]);
  });
});

describe("card statements (American Express)", () => {
  const today = "2026-09-24";
  const services = (txs: ReturnType<typeof tx>[]) =>
    analyze(txs, { today }).subscriptions.map((s) => [s.serviceName, s.frequency, s.transactions.length]);

  it("keys a known service by name when the card processor changes the label", () => {
    const labels = ["AMEX NETFLIX.COM AMSTERDAM", "AMEX NETFLIX.COM 521525 NL", "AMEX NETFLIX.COM ••••9160", "AMEX NETFLIX.COM ••••9160"];
    const txs = labels.map((l, i) => tx(["2026-05-30", "2026-06-30", "2026-07-30", "2026-08-30"][i], [8.92, 8.82, 8.76, 8.84][i], l));
    expect(services(txs)).toEqual([["Netflix", "monthly", 4]]);
  });

  it("follows a known service across a plan change, prorated first charge included", () => {
    const txs = [
      tx("2026-04-13", 108, "AMEX CLAUDE.AI SUBSCRIPTION DUBLIN"), tx("2026-05-13", 108, "AMEX CLAUDE.AI SUBSCRIPTION DUBLIN"),
      tx("2026-06-13", 108, "AMEX ANTHROPIC* CLAUDE SUB DUBLIN"), tx("2026-07-10", 205.79, "AMEX ANTHROPIC* CLAUDE SUB DUBLIN"),
      tx("2026-08-10", 216, "AMEX ANTHROPIC* CLAUDE SUB DUBLIN"), tx("2026-09-10", 216, "AMEX ANTHROPIC* CLAUDE SUB DUBLIN"),
    ];
    const [claude] = analyze(txs, { today }).subscriptions;
    expect([claude.serviceName, claude.transactions.length, claude.currentAmount, claude.totalPaid]).toEqual(["Claude", 6, 216, 961.79]);
  });

  it("does not take a single higher charge as a plan change", () => {
    const txs = [...monthlySeries("2025-07-27", 4, 21.99, "AMEX GOOGLE *GOOGLE ONE G.CO/HELPPAY#"), tx("2025-12-26", 49.99, "AMEX GOOGLE*GOOGLE ONE GOOGL G.CO HELPPAY#")];
    expect(services(txs)).toEqual([["Google One", "monthly", 4]]);
  });

  it("keeps a yearly fee whose price rises in steps", () => {
    const txs = [165, 165, 180, 180, 192, 192].map((a, i) => tx(`${2020 + i}-10-20`, a, "AMEX COTISATION - MERCI POUR VOTRE CONFIANCE."));
    const [fee] = analyze(txs, { today }).subscriptions;
    expect([fee.serviceName, fee.frequency, fee.nextCharge, fee.totalPaid]).toEqual(["American Express card fee", "yearly", "2026-10-20", 1074]);
  });

  it("keeps an unknown merchant with the same step rule, but not a bakery", () => {
    const steps = [9.9, 9.9, 9.9, 10.9, 10.9, 11.5].map((a, i) => tx(addMonthsIso("2026-01-05", i), a, "CLUB ECHECS"));
    const bakery = [4.1, 4.6, 4.3, 4.8, 4.2].map((a, i) => tx(addMonthsIso("2026-01-07", i), a, "BOULANGERIE DU COIN"));
    expect(analyze([...steps, ...bakery], { today: "2026-06-30" }).subscriptions.map((s) => s.transactions.length)).toEqual([6]);
  });

  it("reports a paid trial followed by one full charge of a known service, not two meals", () => {
    const meals = [tx("2026-08-11", 11.37, "UBER EATS"), tx("2026-08-26", 26.44, "UBER EATS")];
    expect(analyze(meals, { today }).subscriptions).toEqual([]);
    const txs = [tx("2026-09-07", 0.99, "AMEX SPL*Support.PDFGuru.com Nicosia"), tx("2026-09-14", 49.99, "AMEX SPL*Support.PDFGuru.com Nicosia")];
    const [guru] = analyze(txs, { today }).subscriptions;
    expect([guru.serviceName, guru.frequency, guru.trialCharge, guru.totalPaid]).toEqual(["PDF Guru", "monthly", { date: "2026-09-07", amount: 0.99 }, 50.98]);
  });
});

function addMonthsIso(start: string, i: number) {
  const d = new Date(`${start}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + i);
  return d.toISOString().slice(0, 10);
}
