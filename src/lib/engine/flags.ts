import type { DetectedSubscription, NormalizedTransaction, Status, Usage } from "../types";
import { daysBetween } from "../dates";
import { PER_YEAR, PERIOD_DAYS } from "./recurring";
import { sameName } from "./labels";

export const SMALL_MONTHLY_AMOUNT = 10;

export interface FlagContext {
  /** Receipts and app store records, used for "trial" and "no receipt email". */
  records: NormalizedTransaction[];
  /** Last date covered by the uploaded statements. */
  dataEnd: string;
  usage: Record<string, Usage | undefined>;
}

export const monthlyEquivalent = (s: Pick<DetectedSubscription, "currentAmount" | "frequency">) => (s.currentAmount * PER_YEAR[s.frequency]) / 12;

const recordsFor = (s: DetectedSubscription, records: NormalizedTransaction[]) =>
  records.filter((r) => [s.serviceName, s.merchant, s.key].some((n) => n && r.merchant && sameName(n, r.merchant)));

/**
 * Step 4 of the core logic. A subscription is "possibly forgotten" when it is yearly, costs
 * under €10 a month, started as a trial, has no receipt email, or is already part of a bundle.
 * "No" or "Rarely" to "Still using this?" makes it idle.
 */
export function flagSubscriptions(subs: DetectedSubscription[], ctx: FlagContext): DetectedSubscription[] {
  const emailsUploaded = ctx.records.some((r) => r.source === "email");
  const bundles = subs.filter((s) => s.bundle?.length);

  return subs.map((s) => {
    const related = recordsFor(s, ctx.records);
    const reasons: string[] = [];
    if (s.frequency === "yearly") reasons.push("Billed once a year, easy to forget between renewals");
    if (monthlyEquivalent(s) < SMALL_MONTHLY_AMOUNT) reasons.push("Small charge, under €10 a month");
    if (related.some((r) => r.isTrial)) reasons.push("Started as a free trial");
    // Only meaningful if the user gave us some receipts to look through.
    if (emailsUploaded && !related.some((r) => r.source === "email")) reasons.push("No receipt email found");
    const bundle = bundles.find((b) => b !== s && b.bundle!.some((part) => sameName(part, s.serviceName)));
    if (bundle) reasons.push(`Already included in ${bundle.serviceName}`);

    const usage = ctx.usage[s.key] ?? s.usage;
    const overdue = daysBetween(s.lastSeen, ctx.dataEnd) > PERIOD_DAYS[s.frequency] * 1.5 + 3;
    let status: Status = "active";
    if (overdue) status = "cancelled";
    else if (usage === "no" || usage === "rarely") status = "idle";
    else if (reasons.length > 0 && usage !== "yes") status = "forgotten";

    return {
      ...s,
      usage,
      status,
      forgottenReasons: reasons,
      includedIn: bundle?.serviceName,
      yearlyCost: Math.round(s.currentAmount * PER_YEAR[s.frequency] * 100) / 100,
    };
  });
}

export interface Report {
  totalYearly: number;
  potentialSavings: number;
  forgotten: DetectedSubscription[];
  idle: DetectedSubscription[];
  active: DetectedSubscription[];
  cancelled: DetectedSubscription[];
  needsLabel: DetectedSubscription[];
  currency: string;
}

/** Bundles are one subscription, so their parts are never counted twice. */
export function buildReport(subs: DetectedSubscription[]): Report {
  const live = subs.filter((s) => s.status !== "cancelled");
  const sum = (xs: DetectedSubscription[]) => Math.round(xs.reduce((t, s) => t + s.yearlyCost, 0) * 100) / 100;
  const idle = subs.filter((s) => s.status === "idle");
  return {
    totalYearly: sum(live),
    potentialSavings: sum(idle),
    forgotten: subs.filter((s) => s.status === "forgotten"),
    idle,
    active: subs.filter((s) => s.status === "active"),
    cancelled: subs.filter((s) => s.status === "cancelled"),
    needsLabel: subs.filter((s) => s.needsLabel && s.status !== "cancelled"),
    currency: live[0]?.currency ?? "EUR",
  };
}
