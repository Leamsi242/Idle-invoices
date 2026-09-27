import type { DetectedSubscription } from "./types";
import { PER_YEAR } from "./engine/recurring";
import { daysBetween } from "./dates";
import { mainCurrency } from "./engine/flags";

/**
 * Facts worth coming back for, computed from the subscriptions alone: each one is a number the
 * user did not know, with the subscription it points to. Pure, so it is tested without a database.
 */
type Sub = Pick<DetectedSubscription, "serviceName" | "status" | "yearlyCost" | "currentAmount" | "currency" | "frequency" | "firstSeen" | "nextCharge" | "priceChanges" | "totalPaid" | "category" | "usage">;

export type Insight =
  | { kind: "daily"; amount: number }
  | { kind: "lifetime"; amount: number; since: string }
  | { kind: "rises"; amount: number; count: number }
  | { kind: "overlap"; category: string; count: number; amount: number }
  | { kind: "oldest"; name: string; months: number }
  | { kind: "renewal"; name: string; amount: number; date: string }
  | { kind: "fiveYears"; amount: number };

// Categories where several services at once are often one too many.
const OVERLAP = new Set(["streaming", "music", "cloud storage", "dating", "news", "gaming"]);

export function insights(subs: Sub[], today: string): Insight[] {
  const running = subs.filter((s) => s.status !== "cancelled" && s.usage !== "stopped" && s.usage !== "notsub");
  // Sums are in one currency: what is paid in another one is left out rather than converted.
  const cur = mainCurrency(running);
  const live = running.filter((s) => s.currency === cur);
  if (live.length === 0) return [];
  const out: Insight[] = [];
  const yearly = live.reduce((t, s) => t + s.yearlyCost, 0);

  // Yearly renewals coming within two months: the big charges people forget.
  const renewal = live
    .filter((s) => s.frequency === "yearly" && s.nextCharge >= today && daysBetween(today, s.nextCharge) <= 60)
    .sort((a, b) => a.nextCharge.localeCompare(b.nextCharge))[0];
  if (renewal) out.push({ kind: "renewal", name: renewal.serviceName, amount: renewal.currentAmount, date: renewal.nextCharge });

  // Price rises of the last 12 months, as a yearly extra cost.
  const yearAgo = new Date(Date.parse(`${today}T00:00:00Z`) - 365 * 86_400_000).toISOString().slice(0, 10);
  let rise = 0;
  let risen = 0;
  for (const s of live) {
    const up = s.priceChanges.filter((p) => p.date >= yearAgo && p.to > p.from * 1.02);
    if (up.length === 0) continue;
    risen++;
    rise += up.reduce((t, p) => t + (p.to - p.from), 0) * PER_YEAR[s.frequency];
  }
  if (risen > 0) out.push({ kind: "rises", amount: Math.round(rise * 100) / 100, count: risen });

  // Several services of the same kind at once.
  const byCategory = new Map<string, Sub[]>();
  for (const s of live) if (s.category && OVERLAP.has(s.category)) byCategory.set(s.category, [...(byCategory.get(s.category) ?? []), s]);
  const overlap = [...byCategory].filter(([, xs]) => xs.length >= 2).sort((a, b) => b[1].length - a[1].length)[0];
  if (overlap) out.push({ kind: "overlap", category: overlap[0], count: overlap[1].length, amount: overlap[1].reduce((t, s) => t + s.yearlyCost, 0) });

  // The longest-running subscription nobody has confirmed using.
  const oldest = live.filter((s) => !s.usage && daysBetween(s.firstSeen, today) >= 90).sort((a, b) => a.firstSeen.localeCompare(b.firstSeen))[0];
  if (oldest) out.push({ kind: "oldest", name: oldest.serviceName, months: Math.floor(daysBetween(oldest.firstSeen, today) / 30.4) });

  const idle = live.filter((s) => s.usage === "no" || s.usage === "rarely" || s.status === "idle").reduce((t, s) => t + s.yearlyCost, 0);
  if (idle > 0) out.push({ kind: "fiveYears", amount: idle * 5 });

  // Everything paid since the first charge found, stopped subscriptions included.
  const real = subs.filter((s) => s.usage !== "notsub" && s.currency === cur);
  const since = real.map((s) => s.firstSeen).sort()[0];
  const paid = real.reduce((t, s) => t + (s.totalPaid ?? 0), 0);
  if (paid > 0 && since) out.push({ kind: "lifetime", amount: paid, since });

  out.push({ kind: "daily", amount: yearly / 365 });
  return out;
}

/** Yearly spend per category, largest first; anything without a category is "other". */
export function byCategory(subs: Sub[]): { category: string; amount: number; count: number }[] {
  const totals = new Map<string, { amount: number; count: number }>();
  const running = subs.filter((s) => s.status !== "cancelled" && s.usage !== "stopped" && s.usage !== "notsub");
  const cur = mainCurrency(running);
  for (const s of running) {
    if (s.currency !== cur) continue;
    const key = s.category ?? "other";
    const t = totals.get(key) ?? { amount: 0, count: 0 };
    totals.set(key, { amount: t.amount + s.yearlyCost, count: t.count + 1 });
  }
  return [...totals].map(([category, t]) => ({ category, ...t })).sort((a, b) => b.amount - a.amount);
}

export interface Mission {
  id: "bank" | "mail" | "name" | "answer" | "idle" | "watch";
  done: boolean;
  count?: number;
  amount?: number;
  href: string;
}

/**
 * The steps to a solved case, in the order that pays off most. The first one not done is the
 * "next move" shown on top of the report; the share done is the mastery score.
 */
export function missions(input: { banks: number; mailboxes: number; unnamed: number; unanswered: number; idle: Sub[]; watching: boolean }): { steps: Mission[]; score: number; next?: Mission } {
  const cur = mainCurrency(input.idle);
  const idleAmount = input.idle.filter((s) => s.currency === cur).reduce((t, s) => t + s.yearlyCost, 0);
  const steps: Mission[] = [
    { id: "bank", done: input.banks > 0, href: "/#bank" },
    { id: "mail", done: input.mailboxes > 0, href: "/" },
    { id: "name", done: input.unnamed === 0, count: input.unnamed, href: "/subscriptions?f=todo" },
    { id: "answer", done: input.unanswered === 0, count: input.unanswered, href: "/subscriptions?f=todo" },
    { id: "idle", done: input.idle.length === 0, count: input.idle.length, amount: idleAmount, href: "/subscriptions?f=todo" },
    { id: "watch", done: input.watching, href: "/#bank" },
  ];
  const score = Math.round((steps.filter((s) => s.done).length / steps.length) * 100);
  return { steps, score, next: steps.find((s) => !s.done) };
}
