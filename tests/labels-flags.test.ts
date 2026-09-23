import { describe, expect, it } from "vitest";
import { BUILT_IN_DESCRIPTORS, descriptorFromAnswer, findDescriptor } from "@/lib/engine/descriptors";
import { buildReport } from "@/lib/engine/flags";
import { analyze } from "@/lib/engine/pipeline";
import { monthlySeries, tx } from "./factory";
import { loadAllSamples } from "./helpers";

describe("descriptor map", () => {
  it("has at least 50 services, each with a cancellation URL", () => {
    expect(BUILT_IN_DESCRIPTORS.length).toBeGreaterThanOrEqual(50);
    for (const d of BUILT_IN_DESCRIPTORS) expect(d.cancellationUrl).toMatch(/^https:\/\//);
    expect(new Set(BUILT_IN_DESCRIPTORS.map((d) => d.pattern)).size).toBe(BUILT_IN_DESCRIPTORS.length);
  });

  it("maps cryptic labels to services", () => {
    expect(findDescriptor(["PADDLE.NET* NOTION"])?.serviceName).toBe("Notion");
    expect(findDescriptor(["NETFLIX.COM"])?.serviceName).toBe("Netflix");
    expect(findDescriptor(["Apple One"])?.bundle).toContain("iCloud+");
    expect(findDescriptor(["UBER EATS"])?.serviceName).toBe("Uber Eats");
    expect(findDescriptor(["PAYPAL *UBER"])?.serviceName).toBe("Uber One");
    expect(findDescriptor(["PADDLE.NET* FOCUSFLOW"])).toBeUndefined();
  });

  it("checks user-provided labels first", () => {
    const user = [descriptorFromAnswer("PADDLE.NET* FOCUSFLOW", "FocusFlow timer", "https://focusflow.example/account")];
    expect(findDescriptor(["PADDLE.NET* FOCUSFLOW"], user)).toMatchObject({ serviceName: "FocusFlow timer", cancellationUrl: "https://focusflow.example/account" });
    // An answer naming a known service reuses its category and cancellation link.
    expect(descriptorFromAnswer("DRI*XYZ", "netflix")).toMatchObject({ serviceName: "Netflix", cancellationUrl: "https://www.netflix.com/cancelplan" });
  });
});

describe("labelling and flags on the samples", () => {
  it("asks about the unknown label once, then uses the answer", async () => {
    const txs = await loadAllSamples();
    const first = analyze(txs);
    const unknown = first.subscriptions.filter((s) => s.needsLabel);
    expect(unknown.map((s) => s.key)).toEqual(["PADDLE.NET* FOCUSFLOW"]);
    const second = analyze(txs, { userDescriptors: [descriptorFromAnswer(unknown[0].key, "FocusFlow")] });
    expect(second.subscriptions.filter((s) => s.needsLabel)).toHaveLength(0);
    expect(second.subscriptions.find((s) => s.key === "PADDLE.NET* FOCUSFLOW")!.serviceName).toBe("FocusFlow");
  });

  it("flags possibly forgotten subscriptions with the SPEC reasons", async () => {
    const { subscriptions } = analyze(await loadAllSamples());
    const get = (name: string) => subscriptions.find((s) => s.serviceName === name)!;
    expect(get("Duolingo").forgottenReasons).toContain("Billed once a year, easy to forget between renewals");
    expect(get("Uber One").forgottenReasons).toContain("Small charge, under €10 a month");
    expect(get("Notion").forgottenReasons).toContain("Started as a free trial");
    expect(get("Basic-Fit").forgottenReasons).toEqual(["No receipt email found"]);
    expect(get("Spotify").forgottenReasons).toEqual([]); // has a receipt, over €10, monthly
    expect(get("Spotify").status).toBe("active");
    expect(get("Basic-Fit").status).toBe("forgotten");
    expect(get("Deezer").status).toBe("cancelled");
  });

  it("splits bundles and spots services already included in one", async () => {
    const { subscriptions } = analyze(await loadAllSamples());
    expect(subscriptions.find((s) => s.serviceName === "Apple One")!.bundle).toEqual(["Apple Music", "Apple TV+", "Apple Arcade", "iCloud+"]);
    expect(subscriptions.find((s) => s.serviceName === "iCloud+")!.includedIn).toBe("Apple One");
    expect(subscriptions.find((s) => s.serviceName === "Netflix")!.includedIn).toBe("Canal+");
  });

  it("marks idle subscriptions from the 'Still using this?' answers and counts savings", async () => {
    const txs = await loadAllSamples();
    const { subscriptions } = analyze(txs, { usage: { "BASIC-FIT FRANCE": "no", "UBER": "rarely", "SPOTIFY": "yes", "NETFLIX.COM": "yes" } });
    const report = buildReport(subscriptions);
    expect(report.idle.map((s) => s.serviceName).sort()).toEqual(["Basic-Fit", "Uber One"]);
    expect(report.potentialSavings).toBe(359.88 + 71.88);
    // Answering "yes" means the user knows about it, so it is not "forgotten".
    expect(subscriptions.find((s) => s.serviceName === "Netflix")!.status).toBe("active");
    // Cancelled subscriptions are not in the yearly total; bundles count once.
    const expected = subscriptions.filter((s) => s.status !== "cancelled").reduce((t, s) => t + s.yearlyCost, 0);
    expect(report.totalYearly).toBeCloseTo(expected, 2);
    expect(report.cancelled.map((s) => s.serviceName)).toEqual(["Deezer"]);
  });

  it("uses the current price for the yearly cost", async () => {
    const { subscriptions } = analyze(await loadAllSamples());
    expect(subscriptions.find((s) => s.serviceName === "Netflix")!.yearlyCost).toBe(191.88);
    expect(subscriptions.find((s) => s.serviceName === "Amazon Prime")!.yearlyCost).toBe(69.9);
  });

  it("does not flag 'no receipt email' when no emails were uploaded", () => {
    const { subscriptions } = analyze([...monthlySeries("2026-01-03", 6, 29.99, "BASIC-FIT"), tx("2026-06-30", 5, "CB CAFE")]);
    expect(subscriptions[0].forgottenReasons).toEqual([]);
    expect(subscriptions[0].status).toBe("active");
  });
});
