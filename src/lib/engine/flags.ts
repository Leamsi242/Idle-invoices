import type { DetectedSubscription, NormalizedTransaction, Status, Usage } from "../types";
import { daysBetween } from "../dates";
import { PER_YEAR, PERIOD_DAYS } from "./recurring";
import { sameName } from "./labels";

export const SMALL_MONTHLY_AMOUNT = 10;
/** A subscription first charged this recently is "new": check it was meant to continue. */
export const NEW_WITHIN_DAYS = 60;

const SYMBOL: Record<string, string> = { EUR: "€", USD: "$", GBP: "£" };
const price = (amount: number, currency: string) => (SYMBOL[currency] ? `${SYMBOL[currency]}${amount.toFixed(2)}` : `${amount.toFixed(2)} ${currency}`);

export interface FlagContext {
  /** Receipts and app store records, used for "trial" and "no receipt email". */
  records: NormalizedTransaction[];
  /** First and last dates covered by the uploaded statements. */
  dataStart: string;
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
    if (s.frequency === "weekly") reasons.push(`Billed every week, about ${price(monthlyEquivalent(s), s.currency)} a month`);
    if (s.trialCharge) reasons.push(`Started with a ${price(s.trialCharge.amount, s.currency)} trial on ${s.trialCharge.date}`);
    // "New" only means something if the statements go back far enough to show it was not there before.
    const isNew = !!ctx.dataStart && daysBetween(s.firstSeen, ctx.dataEnd) <= NEW_WITHIN_DAYS && daysBetween(ctx.dataStart, s.firstSeen) >= 30;
    if (isNew) reasons.push(`New: first charged on ${s.firstSeen}, check you meant to keep it`);
    const stillCharging = (o: DetectedSubscription) => daysBetween(o.lastSeen, ctx.dataEnd) <= PERIOD_DAYS[o.frequency] * 1.5 + 3;
    const twin = stillCharging(s) && subs.find((o) => o !== s && o.serviceName === s.serviceName && stillCharging(o));
    if (twin) reasons.push("Charged twice: two accounts or a duplicate subscription?");

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
      isNew,
      yearlyCost: Math.round(s.currentAmount * PER_YEAR[s.frequency] * 100) / 100,
    };
  });
}

type ReportItem = Pick<DetectedSubscription, "status" | "yearlyCost" | "needsLabel" | "currency">;

export interface Report<T extends ReportItem = DetectedSubscription> {
  totalYearly: number;
  potentialSavings: number;
  forgotten: T[];
  idle: T[];
  active: T[];
  cancelled: T[];
  needsLabel: T[];
  currency: string;
}

/** Bundles are one subscription, so their parts are never counted twice. */
export function buildReport<T extends ReportItem>(subs: T[]): Report<T> {
  const live = subs.filter((s) => s.status !== "cancelled");
  const sum = (xs: T[]) => Math.round(xs.reduce((t, s) => t + s.yearlyCost, 0) * 100) / 100;
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
