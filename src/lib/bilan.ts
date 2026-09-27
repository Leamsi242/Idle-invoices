import type { StoredSubscription } from "./store";
import { addDays, addMonths, daysBetween } from "./dates";
import { mainCurrency } from "./engine/flags";

/**
 * The periodic money report ("bilan"): what subscriptions took over a week or a month, day by
 * day, against the period before, with a few badges earned from the data. Pure, so it is tested
 * without a database; every number comes from the payments behind each subscription.
 */
export type Period = "week" | "month";

type Sub = Pick<StoredSubscription, "id" | "serviceName" | "category" | "currency" | "charges" | "usage" | "status" | "needsLabel" | "firstSeen" | "yearlyCost" | "frequency" | "nextCharge" | "currentAmount">;

export interface BilanDay { date: string; amount: number }
export type BadgeId = "first" | "calm" | "down" | "hunter" | "named" | "yearly";
export interface Badge { id: BadgeId; earned: boolean }

export interface Bilan {
  period: Period;
  start: string;
  end: string; // inclusive
  currency: string;
  total: number;
  count: number;
  days: BilanDay[];
  previous: number;
  /** Change against the period before, in percent; null when the period before is empty. */
  change: number | null;
  biggest?: { name: string; amount: number; date: string };
  busiest?: BilanDay;
  categories: { category: string; amount: number }[];
  /** Subscriptions charged for the first time in the period. */
  newOnes: string[];
  /** What the coming days (7 or 30 from today) should take, from the expected next charges. */
  nextTotal: number;
  nextStart: string;
  nextEnd: string;
  /** Periods with at least one payment, most recent first, to move back in time. */
  available: string[];
  badges: Badge[];
}

const round = (n: number) => Math.round(n * 100) / 100;

/** Monday of the week holding `date` (ISO weeks). */
export function weekStart(date: string): string {
  const d = new Date(`${date}T12:00:00Z`).getUTCDay();
  return addDays(date, -((d + 6) % 7));
}

/** First and last day of the period holding `date`. */
export function bounds(period: Period, date: string): { start: string; end: string } {
  if (period === "week") {
    const start = weekStart(date);
    return { start, end: addDays(start, 6) };
  }
  const start = `${date.slice(0, 7)}-01`;
  return { start, end: addDays(addMonths(start, 1), -1) };
}

/**
 * The period to show by default: the last complete one that holds payments. Statements are
 * imported after the fact, so the running period is often empty; the last full one is the report.
 */
export function defaultAnchor(period: Period, subs: Sub[], today: string): string {
  const current = bounds(period, today).start;
  const dates = subs.flatMap((s) => (s.charges ?? []).filter((c) => c.amount > 0).map((c) => c.date)).filter((d) => d < current).sort();
  return dates.length ? bounds(period, dates[dates.length - 1]).start : bounds(period, addDays(current, -1)).start;
}

export function bilan(subs: Sub[], period: Period, anchor: string, today: string): Bilan {
  // History keeps what was paid, cancelled since or not; only one currency is added up.
  const paid = subs.filter((s) => s.usage !== "notsub");
  const currency = mainCurrency(paid);
  const mine = paid.filter((s) => s.currency === currency);
  const { start, end } = bounds(period, anchor);
  const before = bounds(period, addDays(start, -1));
  const length = daysBetween(start, end) + 1;
  const days: BilanDay[] = Array.from({ length }, (_, i) => ({ date: addDays(start, i), amount: 0 }));
  const cats = new Map<string, number>();
  let total = 0;
  let count = 0;
  let previous = 0;
  let biggest: Bilan["biggest"];
  const newOnes: string[] = [];
  const starts = new Set<string>();
  for (const s of mine) {
    for (const c of s.charges ?? []) {
      if (c.amount <= 0) continue;
      starts.add(bounds(period, c.date).start);
      if (c.date >= before.start && c.date <= before.end) previous += c.amount;
      if (c.date < start || c.date > end) continue;
      total += c.amount;
      count++;
      days[daysBetween(start, c.date)].amount += c.amount;
      const cat = s.category ?? "other";
      cats.set(cat, (cats.get(cat) ?? 0) + c.amount);
      if (!biggest || c.amount > biggest.amount) biggest = { name: s.serviceName, amount: c.amount, date: c.date };
    }
    const first = (s.charges ?? []).filter((c) => c.amount > 0).map((c) => c.date).sort()[0];
    if (first && first >= start && first <= end) newOnes.push(s.serviceName);
  }
  const rounded = days.map((d) => ({ ...d, amount: round(d.amount) }));
  const busiest = rounded.reduce<BilanDay | undefined>((b, d) => (d.amount > 0 && (!b || d.amount > b.amount) ? d : b), undefined);

  // Coming days, from today whatever period is shown: expected charges of what still runs.
  const nextStart = addDays(today, 1);
  const nextEnd = addDays(today, period === "week" ? 7 : 30);
  const step: Record<string, (d: string) => string> = {
    weekly: (d) => addDays(d, 7), monthly: (d) => addMonths(d, 1), quarterly: (d) => addMonths(d, 3), yearly: (d) => addMonths(d, 12),
  };
  let nextTotal = 0;
  for (const s of mine) {
    if (s.status === "cancelled" || s.usage === "stopped" || !s.nextCharge) continue;
    let d = s.nextCharge;
    for (let guard = 0; d < nextStart && guard < 400; guard++) d = step[s.frequency](d);
    for (let guard = 0; d <= nextEnd && guard < 60; guard++) {
      nextTotal += s.currentAmount;
      d = step[s.frequency](d);
    }
  }

  const running = mine.filter((s) => s.status !== "cancelled" && s.usage !== "stopped");
  const badges: Badge[] = [
    { id: "first", earned: true },
    { id: "calm", earned: count > 0 && newOnes.length === 0 },
    { id: "down", earned: previous > 0 && total < previous },
    { id: "hunter", earned: paid.some((s) => s.usage === "stopped") },
    { id: "named", earned: running.length > 0 && running.every((s) => !s.needsLabel) },
    { id: "yearly", earned: running.some((s) => s.frequency === "yearly") && running.filter((s) => s.frequency === "yearly").every((s) => s.nextCharge < today || daysBetween(today, s.nextCharge) > 30) },
  ];

  return {
    period,
    start,
    end,
    currency,
    total: round(total),
    count,
    days: rounded,
    previous: round(previous),
    change: previous > 0 ? Math.round(((total - previous) / previous) * 1000) / 10 : null,
    biggest,
    busiest,
    categories: [...cats].map(([category, amount]) => ({ category, amount: round(amount) })).sort((a, b) => b.amount - a.amount),
    newOnes,
    nextTotal: round(nextTotal),
    nextStart,
    nextEnd,
    available: [...starts].sort().reverse(),
    badges,
  };
}

/** Fun equivalents, with the unit price written on the page: a coffee, a cinema ticket. */
const UNIT: Record<string, { coffee: number; cinema: number }> = {
  EUR: { coffee: 2, cinema: 11 },
  USD: { coffee: 3.5, cinema: 12 },
  GBP: { coffee: 3, cinema: 10 },
  CHF: { coffee: 4.5, cinema: 18 },
  CAD: { coffee: 3, cinema: 14 },
};
export function equivalents(amount: number, currency: string): { coffee: number; cinema: number; coffeePrice: number; cinemaPrice: number } | null {
  const u = UNIT[currency];
  if (!u || amount <= 0) return null;
  return { coffee: Math.floor(amount / u.coffee), cinema: Math.round((amount / u.cinema) * 10) / 10, coffeePrice: u.coffee, cinemaPrice: u.cinema };
}
