import type { Frequency, NormalizedTransaction } from "../types";
import { findDescriptor } from "./descriptors";
import { nameKey, sameName } from "./labels";

export interface UpcomingTrial {
  kind: "trial" | "price-increase";
  serviceName: string;
  amount: number; // price that will be charged
  previousAmount?: number; // for a price increase
  currency: string;
  frequency?: Frequency;
  startsCharging: string; // YYYY-MM-DD
  cancellationUrl?: string;
}

/**
 * Charges announced for the future: free trials that have not charged yet (the classic way a
 * subscription gets forgotten) and announced price increases (an introductory price ending).
 * They come from app store lists and from receipts ("On September 14 you will be charged
 * €49.99", "then €99.99 a year from 26 Dec"). Services cancelled since are left out.
 */
export function upcomingTrials(transactions: NormalizedTransaction[], today: string): UpcomingTrial[] {
  const cancellations = transactions.filter((t) => t.isCancellation && t.merchant);
  const items: (UpcomingTrial & { recordDate: string })[] = [];
  for (const t of transactions) {
    if (t.source === "bank" || !t.merchant || t.isCancellation) continue;
    const when = t.nextChargeDate ?? (t.isTrial ? t.date : undefined);
    if (!when || when < today) continue;
    if (cancellations.some((c) => sameName(c.merchant!, t.merchant!) && c.date >= t.date)) continue;
    const d = findDescriptor([t.merchant]);
    const base = { serviceName: d?.serviceName ?? t.merchant, currency: t.currency, frequency: t.frequency, startsCharging: when, cancellationUrl: d?.cancellationUrl, recordDate: t.date };
    if (t.isTrial) items.push({ ...base, kind: "trial", amount: t.nextChargeAmount ?? t.amount });
    else if (t.nextChargeAmount && t.nextChargeAmount > t.amount * 1.05) items.push({ ...base, kind: "price-increase", amount: t.nextChargeAmount, previousAmount: t.amount });
  }
  // One entry per service: the most recent record wins.
  const latest = new Map<string, UpcomingTrial & { recordDate: string }>();
  for (const i of items.sort((a, b) => a.recordDate.localeCompare(b.recordDate))) latest.set(nameKey(i.serviceName), i);
  return [...latest.values()].sort((a, b) => a.startsCharging.localeCompare(b.startsCharging)).map(({ recordDate: _r, ...i }) => i);
}
