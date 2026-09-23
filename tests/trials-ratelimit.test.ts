import { describe, expect, it } from "vitest";
import { upcomingTrials } from "@/lib/engine/trials";
import { analyze } from "@/lib/engine/pipeline";
import { rateLimit } from "@/lib/rate-limit";
import { loadAllSamples, TODAY } from "./helpers";
import { tx } from "./factory";

describe("upcoming free trials", () => {
  it("finds the Calm trial in the Google list, with its first charge date and cancel link", async () => {
    const trials = upcomingTrials(await loadAllSamples(), TODAY);
    expect(trials).toEqual([
      { kind: "trial", serviceName: "Calm", amount: 69.99, currency: "EUR", frequency: "yearly", startsCharging: "2027-03-05", cancellationUrl: "https://www.calm.com/profile/manage-subscription" },
    ]);
  });

  it("ignores trials that already converted and bank charges", () => {
    const txs = [
      tx("2026-01-22", 9.5, "EMAIL Notion", "email", { merchant: "Notion", isTrial: true }),
      tx("2026-12-01", 5, "SOMETHING", "bank", { isTrial: true }),
      tx("2026-11-01", 4.99, "APPLE X (free trial)", "apple", { merchant: "X", isTrial: true }),
      tx("2026-11-01", 4.99, "APPLE X (free trial)", "apple", { merchant: "X", isTrial: true }),
    ];
    expect(upcomingTrials(txs, "2026-09-30").map((t) => t.serviceName)).toEqual(["X"]);
  });

  it("does not turn a future trial record into a subscription", async () => {
    const { subscriptions } = analyze(await loadAllSamples());
    expect(subscriptions.some((s) => s.serviceName === "Calm")).toBe(false);
  });
});

describe("rate limit", () => {
  it("allows up to the limit per window, then resets", () => {
    const t0 = 1_000_000;
    for (let i = 0; i < 3; i++) expect(rateLimit("k", 3, 1000, t0).ok).toBe(true);
    const blocked = rateLimit("k", 3, 1000, t0 + 400);
    expect(blocked).toEqual({ ok: false, retryAfter: 1 });
    expect(rateLimit("k", 3, 1000, t0 + 1000).ok).toBe(true);
    expect(rateLimit("other", 3, 1000, t0 + 400).ok).toBe(true);
  });
});
