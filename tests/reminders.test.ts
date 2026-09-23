import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { buildIcs, renewalReminder, trialReminder } from "@/lib/ics";
import { cancellationSteps } from "@/lib/cancel-guide";
import { addTrackedTrial, deleteEverything, getReport, listTrackedTrials, removeTrackedTrial, saveUpload, recompute } from "@/lib/store";
import { prisma } from "@/lib/db";
import { parseSample } from "./helpers";

describe("calendar reminders", () => {
  it("reminds two days before a trial ends, at 9:00", () => {
    const r = trialReminder("WeTransfer", "2026-10-10", "€9.99 per week", "https://wetransfer.com/account");
    expect(r.date).toBe("2026-10-08");
    const ics = buildIcs(r, new Date("2026-09-23T10:00:00Z"));
    expect(ics).toContain("BEGIN:VCALENDAR\r\n");
    expect(ics).toContain("DTSTART;VALUE=DATE:20261008");
    expect(ics).toContain("DTEND;VALUE=DATE:20261009");
    expect(ics).toContain("TRIGGER:PT9H");
    expect(ics).toContain("SUMMARY:Cancel the WeTransfer trial? It ends on 2026-10-10");
    expect(ics).toContain("DTSTAMP:20260923T100000Z");
    // Every line fits in 75 octets once unfolded lines are split.
    for (const line of ics.split("\r\n")) expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
  });

  it("escapes commas and semicolons", () => {
    const ics = buildIcs({ uid: "x", title: "A, B; C", date: "2026-01-01", description: "d" });
    expect(ics).toContain("SUMMARY:A\\, B\\; C");
  });

  it("reminds three days before a renewal", () => {
    expect(renewalReminder("Amazon Prime", "2027-09-29", "€69.90").date).toBe("2027-09-26");
  });
});

describe("cancellation guides", () => {
  it("sends Apple and Google subscriptions to the store, not the website", () => {
    expect(cancellationSteps("apple", "Apple One").join(" ")).toContain("Settings, tap your name, then Subscriptions");
    expect(cancellationSteps("google", "Calm").join(" ")).toContain("Payments & subscriptions");
    expect(cancellationSteps("paypal", "Disney+").join(" ")).toContain("Manage automatic payments");
    expect(cancellationSteps("direct-debit", "Basic-Fit").join(" ")).toContain("SEPA mandate");
    expect(cancellationSteps("card", "Netflix").join(" ")).toContain("Removing your card is not enough");
  });
});

describe("tracked trials", () => {
  it("are listed with the known service's cancel link, shown in the report, and removable", async () => {
    const session = randomUUID();
    const { id } = await addTrackedTrial(session, { serviceName: "wetransfer", endsOn: "2099-01-10", priceAfter: 9.99, frequency: "weekly" });
    const [t] = await listTrackedTrials(session);
    expect(t).toMatchObject({ serviceName: "WeTransfer", amount: 9.99, frequency: "weekly", startsCharging: "2099-01-10", cancellationUrl: "https://wetransfer.com/account", tracked: true });
    const raw = await prisma.trackedTrial.findUnique({ where: { id } });
    expect(raw!.serviceName).not.toContain("wetransfer"); // encrypted
    const parsed = await parseSample("google-subscriptions.txt", "google");
    await saveUpload(session, "google.txt", parsed.source, parsed.transactions);
    await recompute(session);
    const report = await getReport(session, "2026-09-30");
    expect(report.trials.map((x) => x.serviceName)).toEqual(["Calm", "WeTransfer"]);
    await removeTrackedTrial(randomUUID(), id); // another session cannot remove it
    expect(await listTrackedTrials(session)).toHaveLength(1);
    await removeTrackedTrial(session, id);
    expect(await listTrackedTrials(session)).toHaveLength(0);
  });

  it("are erased by Delete everything", async () => {
    const session = randomUUID();
    await addTrackedTrial(session, { serviceName: "X", endsOn: "2099-01-10" });
    await deleteEverything(session);
    expect(await prisma.trackedTrial.count({ where: { sessionId: session } })).toBe(0);
  });
});
