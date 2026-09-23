import { describe, expect, it } from "vitest";
import { analyze, nextChargeDate } from "@/lib/engine/pipeline";
import { loadAllSamples } from "./helpers";
import { monthlySeries, tx, weeklySeries } from "./factory";

const find = async (name: string) => (await analyze(await loadAllSamples())).subscriptions.find((s) => s.serviceName === name)!;

describe("trials that keep charging", () => {
  it("flags a forgotten weekly trial (the WeTransfer case)", async () => {
    const wt = await find("WeTransfer");
    expect(wt).toMatchObject({ frequency: "weekly", status: "forgotten", isNew: true, totalPaid: 49.95, yearlyCost: 519.48, nextCharge: "2026-09-30" });
    expect(wt.forgottenReasons).toContain("Billed every week, about €43.29 a month");
    expect(wt.forgottenReasons).toContain("New: first charged on 2026-08-26, check you meant to keep it");
  });

  it("catches a new known subscription after 2 charges and its paid trial", async () => {
    const strava = await find("Strava");
    expect(strava).toMatchObject({ frequency: "monthly", confidence: 0.5, trialCharge: { date: "2026-07-28", amount: 1 }, totalPaid: 24.98, isNew: true });
    expect(strava.forgottenReasons).toContain("Started with a €1.00 trial on 2026-07-28");
  });

  it("does not accept 2 charges of an unknown merchant", () => {
    const { subscriptions } = analyze([tx("2026-01-10", 20, "SOME SHOP"), tx("2026-02-10", 20, "SOME SHOP")]);
    expect(subscriptions).toHaveLength(0);
  });

  it("does not call a subscription new when the statements only just started", () => {
    const { subscriptions } = analyze(weeklySeries("2026-09-01", 4, 9.99, "WETRANSFER.COM"));
    expect(subscriptions[0].isNew).toBe(false);
  });

  it("flags the same service charged on two accounts", () => {
    const { subscriptions } = analyze([...monthlySeries("2026-01-05", 6, 13.49, "NETFLIX.COM"), ...monthlySeries("2026-01-20", 6, 7.99, "CB NETFLIX INTERNATIONAL")]);
    expect(subscriptions).toHaveLength(2);
    for (const s of subscriptions) expect(s.forgottenReasons).toContain("Charged twice: two accounts or a duplicate subscription?");
  });
});

describe("next charge and channel", () => {
  it("computes the next charge from the last one", () => {
    expect(nextChargeDate("2026-01-31", "monthly")).toBe("2026-02-28");
    expect(nextChargeDate("2026-09-23", "weekly")).toBe("2026-09-30");
    expect(nextChargeDate("2025-11-16", "yearly")).toBe("2026-11-16");
  });

  it("knows how each subscription is paid", async () => {
    expect((await find("Apple One")).channel).toBe("apple");
    expect((await find("Disney+")).channel).toBe("paypal");
    expect((await find("Basic-Fit")).channel).toBe("direct-debit");
    expect((await find("Netflix")).channel).toBe("card");
  });
});
