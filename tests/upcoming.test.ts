import { describe, expect, it } from "vitest";
import { upcomingCharges } from "@/lib/upcoming";

const sub = (serviceName: string, nextCharge: string, amount: number, frequency: "weekly" | "monthly" | "yearly" = "monthly", status: "active" | "forgotten" | "cancelled" = "active") =>
  ({ key: serviceName.toUpperCase(), serviceName, status, nextCharge, currentAmount: amount, currency: "EUR", frequency });

describe("next 30 days", () => {
  it("lists the charges due soon, oldest first, and projects the ones a statement has not caught up with", () => {
    const list = upcomingCharges(
      [
        sub("Claude", "2026-10-10", 216),
        sub("Navigo", "2026-09-03", 90.8), // the bank statement ends on 31 August
        sub("Amazon Prime", "2026-10-20", 69.9, "yearly"),
        sub("PlayStation", "2026-12-23", 151.99, "yearly"),
        sub("Tinder", "2026-08-17", 19.99, "weekly", "cancelled"),
      ],
      [{ kind: "price-increase", serviceName: "Google One", amount: 99.99, currency: "EUR", startsCharging: "2026-12-26" }],
      "2026-09-26",
    );
    expect(list.map((c) => [c.serviceName, c.date, c.amount])).toEqual([
      ["Navigo", "2026-10-03", 90.8],
      ["Claude", "2026-10-10", 216],
      ["Amazon Prime", "2026-10-20", 69.9],
    ]);
  });

  it("counts every charge of a weekly plan in the window", () => {
    const list = upcomingCharges([sub("WeTransfer", "2026-09-29", 9.99, "weekly")], [], "2026-09-26");
    expect(list.map((c) => c.date)).toEqual(["2026-09-29", "2026-10-06", "2026-10-13", "2026-10-20"]);
  });

  it("includes a trial that starts charging within the window", () => {
    const list = upcomingCharges([], [{ kind: "trial", serviceName: "Calm", amount: 69.99, currency: "EUR", startsCharging: "2026-10-05" }], "2026-09-26");
    expect(list).toEqual([{ key: "trial:Calm", serviceName: "Calm", date: "2026-10-05", amount: 69.99, currency: "EUR", kind: "trial", cancellationUrl: undefined }]);
  });
});
