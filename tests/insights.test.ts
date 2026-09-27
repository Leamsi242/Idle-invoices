import { describe, expect, it } from "vitest";
import { byCategory, insights, missions } from "@/lib/insights";
import { buildReport } from "@/lib/engine/flags";

const sub = (over: Record<string, unknown>) => ({
  serviceName: "X", status: "active" as const, yearlyCost: 120, currentAmount: 10, currency: "EUR", frequency: "monthly" as const,
  firstSeen: "2025-01-01", nextCharge: "2026-10-01", priceChanges: [], totalPaid: 200, category: undefined as string | undefined, usage: undefined as string | undefined,
  needsLabel: false,
  ...over,
});

describe("insights", () => {
  it("finds what the user did not know", () => {
    const subs = [
      sub({ serviceName: "Netflix", category: "streaming", yearlyCost: 215.88, priceChanges: [{ date: "2026-06-01", from: 13.49, to: 17.99 }] }),
      sub({ serviceName: "Disney+", category: "streaming", yearlyCost: 119.88, usage: "yes" }),
      sub({ serviceName: "Amazon Prime", frequency: "yearly", yearlyCost: 69.9, currentAmount: 69.9, nextCharge: "2026-10-20", usage: "yes" }),
      sub({ serviceName: "Gym", usage: "no", status: "idle", yearlyCost: 359.88 }),
    ];
    const found = insights(subs as never, "2026-09-27");
    const kinds = found.map((x) => x.kind);
    expect(kinds).toEqual(["renewal", "rises", "overlap", "oldest", "fiveYears", "lifetime", "daily"]);
    expect(found.find((x) => x.kind === "rises")).toMatchObject({ count: 1, amount: 54 });
    expect(found.find((x) => x.kind === "overlap")).toMatchObject({ category: "streaming", count: 2 });
    expect(found.find((x) => x.kind === "fiveYears")).toMatchObject({ amount: 359.88 * 5 });
    expect(found.find((x) => x.kind === "oldest")).toMatchObject({ name: "Netflix" });
  });

  it("leaves out what the user cancelled", () => {
    const subs = [sub({ serviceName: "A", category: "music" }), sub({ serviceName: "B", category: "music", usage: "stopped" })];
    expect(insights(subs as never, "2026-09-27").some((x) => x.kind === "overlap")).toBe(false);
    expect(byCategory(subs as never)).toEqual([{ category: "music", amount: 120, count: 1 }]);
    const report = buildReport(subs as never);
    expect([report.totalYearly, report.savedYearly, report.stopped.length]).toEqual([120, 120, 1]);
  });

  it("orders the missions and scores the case", () => {
    const m = missions({ banks: 1, mailboxes: 0, unnamed: 2, unanswered: 0, idle: [], watching: false });
    expect(m.next?.id).toBe("mail");
    expect(m.score).toBe(50);
    expect(missions({ banks: 1, mailboxes: 1, unnamed: 0, unanswered: 0, idle: [], watching: true }).score).toBe(100);
  });
});
