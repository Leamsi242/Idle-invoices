import type { Frequency, NormalizedTransaction } from "../types";
import { findDescriptor } from "./descriptors";
import { nameKey } from "./labels";

export interface UpcomingTrial {
  serviceName: string;
  amount: number;
  currency: string;
  frequency?: Frequency;
  startsCharging: string; // YYYY-MM-DD
  cancellationUrl?: string;
}

/**
 * Free trials that have not charged yet: the classic way a subscription gets forgotten.
 * They come from app store lists ("Free trial, then €69.99/year, renews on ...").
 */
export function upcomingTrials(transactions: NormalizedTransaction[], today: string): UpcomingTrial[] {
  const seen = new Set<string>();
  return transactions
    .filter((t) => t.source !== "bank" && t.isTrial && t.merchant && t.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))
    .filter((t) => {
      const key = nameKey(t.merchant!);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((t) => {
      const d = findDescriptor([t.merchant]);
      return {
        serviceName: d?.serviceName ?? t.merchant!,
        amount: t.amount,
        currency: t.currency,
        frequency: t.frequency,
        startsCharging: t.date,
        cancellationUrl: d?.cancellationUrl,
      };
    });
}
