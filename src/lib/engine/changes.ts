import type { Frequency, Status } from "../types";

/**
 * What changed between two analyses of the same session (before and after a nightly read):
 * a subscription that was not there, a price that went up, a stopped subscription charging again.
 * Only these are worth an alert; everything else is in the report.
 */
export interface SubSnapshot { key: string; serviceName: string; status: Status; currentAmount: number; currency: string; frequency: Frequency; lastSeen: string }

export interface Change {
  kind: "new" | "price-up" | "restarted";
  key: string;
  serviceName: string;
  amount: number;
  previousAmount?: number;
  currency: string;
  frequency: Frequency;
  date: string;
}

const PRICE_STEP = 0.02; // below that, currency conversion rather than a price change

export function diffSubscriptions(before: SubSnapshot[], after: SubSnapshot[]): Change[] {
  const old = new Map(before.map((s) => [s.key, s]));
  const changes: Change[] = [];
  for (const s of after) {
    if (s.status === "cancelled") continue;
    const was = old.get(s.key);
    const base = { key: s.key, serviceName: s.serviceName, amount: s.currentAmount, currency: s.currency, frequency: s.frequency, date: s.lastSeen };
    if (!was) changes.push({ kind: "new", ...base });
    else if (was.status === "cancelled") changes.push({ kind: "restarted", ...base, previousAmount: was.currentAmount });
    else if (s.currentAmount > was.currentAmount * (1 + PRICE_STEP)) changes.push({ kind: "price-up", ...base, previousAmount: was.currentAmount });
  }
  return changes;
}
