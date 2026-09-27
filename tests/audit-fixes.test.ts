import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { refOf } from "@/lib/engagements";
import { projectedNext, upcomingCharges } from "@/lib/upcoming";
import { proxy } from "@/proxy";

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
});
