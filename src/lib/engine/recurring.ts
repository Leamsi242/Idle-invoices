import type { Frequency, NormalizedTransaction, RecurringGroup } from "../types";
import { daysBetween } from "../dates";
import { round2 } from "../amount";

/** Interval windows in days (SPEC.md, "Detect recurring charges"). */
export const WINDOWS: Record<Frequency, [number, number]> = {
  weekly: [6, 8],
  monthly: [27, 33],
  quarterly: [85, 97],
  yearly: [360, 370],
};
// Yearly needs only 2 charges (12 months of statements rarely show more); the others need 3.
const MIN_OCCURRENCES: Record<Frequency, number> = { weekly: 3, monthly: 3, quarterly: 3, yearly: 2 };
export const PERIOD_DAYS: Record<Frequency, number> = { weekly: 7, monthly: 30.4, quarterly: 91.3, yearly: 365 };
export const PER_YEAR: Record<Frequency, number> = { weekly: 52, monthly: 12, quarterly: 4, yearly: 1 };

const AMOUNT_TOLERANCE = 0.1; // "similar amount (within 10%)"
const MAX_PRICE_CHANGE = 0.6; // a larger jump is treated as a different charge

interface Regularity { frequency: Frequency; missed: number }

/** Checks that every interval fits one frequency, allowing a single missed payment (a double interval). */
export function regularity(dates: string[], minOccurrences?: number): Regularity | null {
  if (dates.length < 2) return null;
  const intervals = dates.slice(1).map((d, i) => daysBetween(dates[i], d));
  for (const frequency of Object.keys(WINDOWS) as Frequency[]) {
    const [lo, hi] = WINDOWS[frequency];
    let ok = 0;
    let missed = 0;
    for (const days of intervals) {
      if (days >= lo && days <= hi) ok++;
      else if (frequency !== "yearly" && days >= lo * 2 && days <= hi * 2) missed++;
    }
    if (ok + missed === intervals.length && missed <= 1 && ok >= 1 && dates.length >= (minOccurrences ?? MIN_OCCURRENCES[frequency])) {
      return { frequency, missed };
    }
  }
  return null;
}

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
};

/** Splits charges with the same label into clusters of similar amounts (within 10%). */
function amountClusters(txs: NormalizedTransaction[]): NormalizedTransaction[][] {
  const byAmount = [...txs].sort((a, b) => a.amount - b.amount);
  const clusters: NormalizedTransaction[][] = [];
  for (const tx of byAmount) {
    const current = clusters.at(-1);
    if (current && tx.amount <= median(current.map((t) => t.amount)) * (1 + AMOUNT_TOLERANCE)) current.push(tx);
    else clusters.push([tx]);
  }
  return clusters.map((c) => c.sort((a, b) => a.date.localeCompare(b.date)));
}

const datesOf = (txs: NormalizedTransaction[]) => txs.map((t) => t.date);

/**
 * Joins a cluster with the one that follows it in time when together they form a regular
 * series: that is a price increase (or decrease), e.g. Netflix going from 13.49 to 15.99.
 */
function mergePriceChanges(clusters: NormalizedTransaction[][]): NormalizedTransaction[][] {
  let merged = true;
  let list = [...clusters].sort((a, b) => a[0].date.localeCompare(b[0].date));
  while (merged) {
    merged = false;
    outer: for (let i = 0; i < list.length; i++) {
      for (let j = 0; j < list.length; j++) {
        if (i === j) continue;
        const a = list[i];
        const b = list[j];
        // The earlier price must be an established series, not a lone purchase.
        if (a.length < 2 || a.at(-1)!.date >= b[0].date) continue;
        const from = a.at(-1)!.amount;
        const to = b[0].amount;
        if (Math.abs(to - from) / from > MAX_PRICE_CHANGE) continue;
        const joined = [...a, ...b];
        if (!regularity(datesOf(joined))) continue;
        list = list.filter((_, k) => k !== i && k !== j);
        list.push(joined);
        list.sort((x, y) => x[0].date.localeCompare(y[0].date));
        merged = true;
        break outer;
      }
    }
  }
  return list;
}

function confidenceFor(count: number, missed: number, priceChanges: number): number {
  const c = 0.5 + 0.1 * (count - 2) - 0.1 * missed - 0.05 * priceChanges;
  return round2(Math.min(0.95, Math.max(0.3, c)));
}

export function toGroup(key: string, txs: NormalizedTransaction[], frequency: Frequency, missed: number, confidence?: number): RecurringGroup {
  const sorted = [...txs].sort((a, b) => a.date.localeCompare(b.date));
  const priceChanges: RecurringGroup["priceChanges"] = [];
  for (let i = 1; i < sorted.length; i++) {
    const from = sorted[i - 1].amount;
    const to = sorted[i].amount;
    if (Math.abs(to - from) > 0.01) priceChanges.push({ date: sorted[i].date, from, to });
  }
  const amounts = sorted.map((t) => t.amount);
  return {
    key,
    frequency,
    transactions: sorted,
    averageAmount: round2(amounts.reduce((s, a) => s + a, 0) / amounts.length),
    currentAmount: amounts.at(-1)!,
    currency: sorted[0].currency,
    firstSeen: sorted[0].date,
    lastSeen: sorted.at(-1)!.date,
    missedPayments: missed,
    priceChanges,
    confidence: confidence ?? confidenceFor(sorted.length, missed, priceChanges.length),
    merchant: sorted.find((t) => t.merchant)?.merchant,
  };
}

/**
 * Step 1 of the core logic. Groups charges by key (cleaned label, or real merchant once
 * reconciled) and similar amount, then keeps the groups whose intervals are regular.
 * Returns the recurring groups and the leftover charges, still keyed, for the extra rules in
 * the pipeline (yearly plans seen once, new subscriptions, paid trials).
 */
export function detectRecurring(
  charges: NormalizedTransaction[],
  keyOf: (tx: NormalizedTransaction) => string,
): { groups: RecurringGroup[]; leftovers: { key: string; txs: NormalizedTransaction[] }[] } {
  const byKey = new Map<string, NormalizedTransaction[]>();
  for (const tx of charges) {
    if (tx.amount <= 0) continue;
    const key = keyOf(tx);
    if (!key) continue;
    byKey.set(key, [...(byKey.get(key) ?? []), tx]);
  }
  const groups: RecurringGroup[] = [];
  const leftovers: { key: string; txs: NormalizedTransaction[] }[] = [];
  for (const [key, txs] of byKey) {
    for (const cluster of mergePriceChanges(amountClusters(txs))) {
      const reg = regularity(datesOf(cluster));
      if (reg) groups.push(toGroup(key, cluster, reg.frequency, reg.missed));
      else leftovers.push({ key, txs: cluster });
    }
  }
  return { groups: groups.sort((a, b) => a.key.localeCompare(b.key)), leftovers };
}
