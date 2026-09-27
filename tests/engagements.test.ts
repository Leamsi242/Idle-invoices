import { describe, expect, it } from "vitest";
import { V3_DICTS } from "@/lib/i18n-v3";
import { attention, monthGrid, rhythm, statusOf, typeOf } from "@/lib/engagements";
import { buildReport } from "@/lib/engine/flags";

const keys = (o: object, prefix = ""): string[] =>
  Object.entries(o).flatMap(([k, v]) => (v && typeof v === "object" && !Array.isArray(v) ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`]));

const sub = (over: Record<string, unknown>) => ({
  id: "1", key: "K", serviceName: "Netflix", status: "active", usage: undefined, yearlyCost: 120, currentAmount: 10, currency: "EUR", frequency: "monthly",
  nextCharge: "2026-10-05", priceChanges: [], needsLabel: false, category: undefined, charges: [], ...over,
});

describe("merged structure", () => {
  it("has the same texts in both languages", () => {
    expect(keys(V3_DICTS.fr).sort()).toEqual(keys(V3_DICTS.en).sort());
  });

  it("reads a subscription the user's way", () => {
    expect(statusOf(sub({}) as never)).toBe("todo");
    expect(statusOf(sub({ usage: "yes" }) as never)).toBe("active");
    expect(statusOf(sub({ usage: "stopped" }) as never)).toBe("stopped");
    expect(statusOf(sub({ usage: "notsub" }) as never)).toBe("hidden");
    expect(statusOf(sub({ status: "cancelled", usage: "yes" }) as never)).toBe("ended");
    expect([typeOf({ category: "insurance" }), typeOf({ category: "energy" }), typeOf({ category: "fitness" }), typeOf({})]).toEqual(["insurance", "contract", "membership", "subscription"]);
  });

  it("leaves what is not a subscription out of every total", () => {
    const r = buildReport([sub({ yearlyCost: 120 }), sub({ id: "2", key: "R", yearlyCost: 9000, usage: "notsub" })] as never);
    expect([r.totalYearly, r.hidden.length]).toEqual([120, 1]);
  });

  it("sums six months of payments, the current month last", () => {
    const data = rhythm([sub({ charges: [{ date: "2026-09-03", amount: 10, source: "bank" }, { date: "2026-08-03", amount: 10, source: "bank" }, { date: "2025-01-01", amount: 99, source: "bank" }] })] as never, "2026-09-27");
    expect(data.map((d) => d.month)).toEqual(["2026-04", "2026-05", "2026-06", "2026-07", "2026-08", "2026-09"]);
    expect(data.at(-1)).toMatchObject({ amount: 10, current: true });
  });

  it("puts urgent decisions first", () => {
    const t = { trial: () => "trial", renewal: () => "renewal", price: () => "price", unknown: () => "unknown", answer: () => "answer", idle: () => "idle", doubts: () => "doubts", mail: "mail", watch: "watch" };
    const items = attention({
      subs: [sub({ frequency: "yearly", nextCharge: "2026-10-10", usage: "yes" }), sub({ id: "2", key: "B", priceChanges: [{ date: "2026-09-01", from: 10, to: 13 }] })] as never,
      trials: [{ kind: "trial", serviceName: "Figma", amount: 18, currency: "EUR", startsCharging: "2026-09-30" }],
      today: "2026-09-27", doubts: 1, mailboxes: 0, watching: false, t, money: String, date: String,
    });
    expect(items.map((i) => i.tag)).toEqual(["trial", "renewal", "price", "todo", "setup", "setup", "setup"]);
  });

  it("lays a month out from its Monday", () => {
    const cells = monthGrid("2026-09");
    expect(cells[0]).toBe("2026-08-31");
    expect(cells).toHaveLength(42);
  });
});
