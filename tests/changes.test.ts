import { describe, expect, it } from "vitest";
import { diffSubscriptions, type SubSnapshot } from "@/lib/engine/changes";

const sub = (key: string, amount: number, status: SubSnapshot["status"] = "active", lastSeen = "2026-09-01"): SubSnapshot =>
  ({ key, serviceName: key, status, currentAmount: amount, currency: "EUR", frequency: "monthly", lastSeen });

describe("nightly changes", () => {
  it("reports new subscriptions, price increases and restarts, nothing else", () => {
    const before = [sub("NETFLIX", 13.49), sub("SPOTIFY", 11.12), sub("TINDER", 19.99, "cancelled"), sub("CLAUDE", 216), sub("ENGIE", 29.15)];
    const after = [
      sub("NETFLIX", 15.99, "active", "2026-09-25"),
      sub("SPOTIFY", 11.12),
      sub("TINDER", 39.99, "forgotten", "2026-09-25"),
      sub("CLAUDE", 216.2), // conversion noise
      sub("DISNEY", 11.99, "forgotten", "2026-09-25"),
      sub("OLD GYM", 30, "cancelled"),
    ];
    expect(diffSubscriptions(before, after).map((c) => [c.kind, c.key, c.amount, c.previousAmount])).toEqual([
      ["price-up", "NETFLIX", 15.99, 13.49],
      ["restarted", "TINDER", 39.99, 19.99],
      ["new", "DISNEY", 11.99, undefined],
    ]);
  });
});
