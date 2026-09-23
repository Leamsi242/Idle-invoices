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
    ["Notion", "monthly"], ["Paddle.Net* Focusflow", "monthly"], ["Deezer", "monthly"], ["Amazon Prime", "yearly"],
    ["Canal+", "monthly"], ["Free Mobile", "monthly"], ["WeTransfer", "weekly"], ["Strava", "monthly"],
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
