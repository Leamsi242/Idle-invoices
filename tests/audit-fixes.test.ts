import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { refOf } from "@/lib/engagements";
import { projectedNext, upcomingCharges } from "@/lib/upcoming";
import { proxy } from "@/proxy";
import { buildReport, flagSubscriptions } from "@/lib/engine/flags";
import { monthGrid } from "@/lib/engagements";
import { money } from "@/lib/i18n";

const sub = { id: "row-1", key: "NETFLIX", serviceName: "Netflix", status: "active" as const, nextCharge: "2026-10-05", currentAmount: 10, currency: "EUR", frequency: "monthly" as const };

describe("fixes before sharing with testers", () => {
  it("projects a next charge left in the past by the statement", () => {
    expect(projectedNext({ nextCharge: "2026-08-15", frequency: "monthly" }, "2026-09-27")).toBe("2026-10-15");
    expect(projectedNext({ nextCharge: "2026-10-15", frequency: "monthly" }, "2026-09-27")).toBe("2026-10-15");
  });

  it("still shows a monthly plan a year ahead, and every week of a weekly one", () => {
    const year = upcomingCharges([sub], [], "2026-09-27", 400).filter((c) => c.key === "row-1");
    expect(year.length).toBeGreaterThanOrEqual(12);
    const weekly = upcomingCharges([{ ...sub, frequency: "weekly" as const, nextCharge: "2026-09-29" }], [], "2026-09-27", 90);
    expect(weekly.length).toBeGreaterThanOrEqual(12);
  });

  it("keeps the same reference for a subscription across recomputes", () => {
    const a = refOf({ key: "NETFLIX", frequency: "monthly", firstSeen: "2025-09-03" });
    expect(a).toBe(refOf({ key: "NETFLIX", frequency: "monthly", firstSeen: "2025-09-03" }));
    expect(a).not.toBe(refOf({ key: "NETFLIX", frequency: "yearly", firstSeen: "2025-09-03" }));
  });

  it("refuses API writes from another site, and lets the app's own through", () => {
    const req = (headers: Record<string, string>, method = "POST") => new NextRequest("https://app.example/api/demo", { method, headers: { host: "app.example", ...headers } });
    expect(proxy(req({ "sec-fetch-site": "cross-site", origin: "https://evil.example" })).status).toBe(403);
    expect(proxy(req({ origin: "https://evil.example" })).status).toBe(403);
    expect(proxy(req({ origin: "null" })).status).toBe(403);
    expect(proxy(req({ "sec-fetch-site": "same-origin", origin: "https://app.example" })).status).toBe(200);
    expect(proxy(req({})).status).toBe(200);
    expect(proxy(req({ "sec-fetch-site": "cross-site" }, "GET")).status).toBe(200);
  });

  it("never adds amounts paid in different currencies", () => {
    const r = buildReport([
      { status: "active", yearlyCost: 120, currency: "EUR", needsLabel: false, usage: undefined },
      { status: "active", yearlyCost: 60, currency: "EUR", needsLabel: false, usage: undefined },
      { status: "active", yearlyCost: 120, currency: "USD", needsLabel: false, usage: undefined },
    ] as never);
    expect(r.currency).toBe("EUR");
    expect(r.totalYearly).toBe(180);
    expect(r.otherCurrencies).toEqual([{ currency: "USD", totalYearly: 120, potentialSavings: 0, savedYearly: 0 }]);
  });

  it("writes amounts in their own currency, the American or French way", () => {
    expect(money(9.99, "EUR", "en")).toBe("€9.99");
    expect(money(12, "USD", "en")).toBe("$12.00");
    expect(money(12, "USD", "fr")).toBe("12,00\u00a0$US");
  });

  it("starts weeks on Sunday in American English, on Monday in French", () => {
    expect(monthGrid("2026-10", 0)[0]).toBe("2026-09-27");
    expect(monthGrid("2026-10", 1)[0]).toBe("2026-09-28");
  });

  it("applies a decision to one plan, not to the other plan of the same service", () => {
    const base = { key: "SPOTIFY", serviceName: "Spotify", status: "active", currency: "EUR", currentAmount: 10, averageAmount: 10, yearlyCost: 120, firstSeen: "2026-01-01", lastSeen: "2026-09-01", nextCharge: "2026-10-01", priceChanges: [], forgottenReasons: [], missedPayments: 0, matchedSources: ["bank"], transactions: [], needsLabel: false, confidence: 0.9 };
    const subs = [{ ...base, frequency: "monthly" }, { ...base, frequency: "yearly", yearlyCost: 100, currentAmount: 100 }];
    const out = flagSubscriptions(subs as never, { records: [], dataStart: "2025-09-01", dataEnd: "2026-09-20", usage: { "SPOTIFY|monthly": "notsub" } });
    expect(out.map((s) => s.usage)).toEqual(["notsub", undefined]);
  });
});
