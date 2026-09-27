import { describe, expect, it } from "vitest";
import { bilan, bounds, defaultAnchor, equivalents, weekStart } from "@/lib/bilan";
import { BILAN_DICTS } from "@/lib/i18n-bilan";

const keys = (o: object, prefix = ""): string[] =>
  Object.entries(o).flatMap(([k, v]) => (v && typeof v === "object" && !Array.isArray(v) ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`]));

const sub = (over: Record<string, unknown>) => ({
  id: "x", serviceName: "Netflix", category: "streaming", currency: "EUR", usage: undefined, status: "active", needsLabel: false,
  firstSeen: "2026-01-05", yearlyCost: 120, frequency: "monthly", nextCharge: "2026-10-05", currentAmount: 10, charges: [], ...over,
}) as never;

describe("bilan", () => {
  it("finds ISO weeks and calendar months", () => {
    expect(weekStart("2026-09-27")).toBe("2026-09-21"); // a Sunday
    expect(bounds("week", "2026-09-21")).toEqual({ start: "2026-09-21", end: "2026-09-27" });
    expect(bounds("month", "2026-02-14")).toEqual({ start: "2026-02-01", end: "2026-02-28" });
  });

  it("adds up a month day by day and compares it with the month before", () => {
    const subs = [
      sub({ charges: [{ date: "2026-07-05", amount: 10, source: "bank" }, { date: "2026-08-05", amount: 12, source: "bank" }] }),
      sub({ id: "y", serviceName: "Spotify", category: "music", charges: [{ date: "2026-08-20", amount: 11, source: "bank" }] }),
      sub({ id: "z", serviceName: "Rent", usage: "notsub", charges: [{ date: "2026-08-01", amount: 800, source: "bank" }] }),
    ];
    const b = bilan(subs, "month", "2026-08-01", "2026-09-27");
    expect(b.total).toBe(23);
    expect(b.count).toBe(2);
    expect(b.days).toHaveLength(31);
    expect(b.days[4].amount).toBe(12);
    expect(b.previous).toBe(10);
    expect(b.change).toBe(130);
    expect(b.biggest?.name).toBe("Netflix");
    expect(b.newOnes).toEqual(["Spotify"]);
    expect(b.categories[0]).toEqual({ category: "streaming", amount: 12 });
    expect(b.badges.find((x) => x.id === "calm")?.earned).toBe(false);
    expect(b.badges.find((x) => x.id === "down")?.earned).toBe(false);
  });

  it("projects the coming days from today, the next charge and the rhythm", () => {
    const b = bilan([sub({ nextCharge: "2026-08-05", charges: [{ date: "2026-08-05", amount: 10, source: "bank" }] })], "month", "2026-08-01", "2026-09-27");
    expect([b.nextStart, b.nextEnd]).toEqual(["2026-09-28", "2026-10-27"]);
    expect(b.nextTotal).toBe(10); // 2026-10-05
    expect(bilan([sub({ nextCharge: "2026-10-05" })], "week", "2026-08-01", "2026-09-27").nextTotal).toBe(0);
  });

  it("defaults to the last complete period holding payments", () => {
    const subs = [sub({ charges: [{ date: "2026-06-10", amount: 10, source: "bank" }, { date: "2026-09-02", amount: 10, source: "bank" }] })];
    expect(defaultAnchor("month", subs, "2026-09-27")).toBe("2026-06-01");
    expect(defaultAnchor("week", [], "2026-09-27")).toBe("2026-09-14");
  });

  it("gives equivalents only for known currencies", () => {
    expect(equivalents(23, "EUR")).toMatchObject({ coffee: 11, cinema: 2.1 });
    expect(equivalents(23, "JPY")).toBeNull();
  });

  it("has the same texts in both languages, without dashes used as punctuation", () => {
    expect(keys(BILAN_DICTS.fr).sort()).toEqual(keys(BILAN_DICTS.en).sort());
    expect(JSON.stringify(BILAN_DICTS.fr) + BILAN_DICTS.fr.spentLine(2) + BILAN_DICTS.fr.range("1 sept.", "30 sept. 2026")).not.toMatch(/[\u2013\u2014]/);
    expect(BILAN_DICTS.fr.cinema("1,5")).toBe("1,5 place de cinéma");
  });
});
