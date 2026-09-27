import type { StoredSubscription } from "./store";
import type { UpcomingTrial } from "./engine/trials";
import { addMonths, daysBetween } from "./dates";

/**
 * Shared reading of a subscription for the overview, the subscriptions table, the calendar and
 * the attention list: its type, its state from the user's point of view, its monthly cost.
 */
export type EngagementType = "subscription" | "membership" | "insurance" | "contract" | "fee";
export type EngagementStatus = "active" | "todo" | "idle" | "ended" | "stopped" | "hidden";

export function typeOf(s: Pick<StoredSubscription, "category">): EngagementType {
  switch (s.category) {
    case "insurance":
      return "insurance";
    case "energy":
    case "telecom":
      return "contract";
    case "fitness":
      return "membership";
    case "bank fees":
      return "fee";
    default:
      return "subscription";
  }
}

export function statusOf(s: Pick<StoredSubscription, "status" | "usage">): EngagementStatus {
  if (s.usage === "notsub") return "hidden";
  if (s.usage === "stopped") return "stopped";
  if (s.status === "cancelled") return "ended";
  if (s.status === "idle") return "idle";
  if (!s.usage) return "todo";
  return "active";
}

export const monthly = (s: Pick<StoredSubscription, "yearlyCost">) => s.yearlyCost / 12;

/** Counted in the totals: neither cancelled by the user nor marked "not a subscription". */
export const counted = (s: Pick<StoredSubscription, "usage">) => s.usage !== "stopped" && s.usage !== "notsub";

/**
 * What subscriptions cost each month over the last `months` months (the current one included,
 * still in progress), from the payments behind each subscription.
 */
export function rhythm(subs: StoredSubscription[], today: string, months = 6): { month: string; amount: number; current: boolean }[] {
  const first = addMonths(`${today.slice(0, 7)}-01`, -(months - 1));
  const out = Array.from({ length: months }, (_, i) => ({ month: addMonths(first, i).slice(0, 7), amount: 0, current: i === months - 1 }));
  for (const s of subs) {
    if (s.usage === "notsub") continue;
    for (const c of s.charges ?? []) {
      const slot = out.find((o) => o.month === c.date.slice(0, 7));
      if (slot && c.amount > 0) slot.amount += c.amount;
    }
  }
  return out.map((o) => ({ ...o, amount: Math.round(o.amount * 100) / 100 }));
}

export type AttentionTag = "trial" | "renewal" | "price" | "todo" | "setup";
export interface AttentionItem {
  id: string;
  tag: AttentionTag;
  name?: string;
  text: string;
  href: string;
}

/**
 * Everything that deserves a decision now, most urgent first: a trial about to turn paid, a
 * yearly renewal, a price rise, then the steps that complete the case. The page shows three and
 * lets the user put one off for 7 days.
 */
/**
 * A reference that survives a recompute (row ids do not): the detail stays open after a decision,
 * and links from the overview keep working after the nightly refresh.
 */
export const refOf = (s: Pick<StoredSubscription, "key" | "frequency" | "firstSeen">) => `${s.key}|${s.frequency}|${s.firstSeen}`;

export function attention(input: {
  subs: StoredSubscription[];
  trials: UpcomingTrial[];
  today: string;
  doubts: number;
  mailboxes: number;
  watching: boolean;
  t: {
    trial: (name: string, days: number) => string;
    renewal: (name: string, amount: string, date: string) => string;
    price: (name: string, from: string, to: string) => string;
    unknown: (n: number) => string;
    answer: (n: number) => string;
    idle: (n: number, amount: string) => string;
    doubts: (n: number) => string;
    mail: string;
    watch: string;
  };
  money: (n: number) => string;
  date: (iso: string) => string;
}): AttentionItem[] {
  const { subs, trials, today, t } = input;
  const live = subs.filter((s) => counted(s) && s.status !== "cancelled");
  const items: AttentionItem[] = [];
  for (const trial of trials) {
    const days = daysBetween(today, trial.startsCharging);
    if (days >= 0 && days <= 14) items.push({ id: `trial:${trial.serviceName}:${trial.startsCharging}`, tag: "trial", name: trial.serviceName, text: t.trial(trial.serviceName, days), href: "/calendar" });
  }
  for (const s of live) {
    if (s.frequency === "yearly" && s.nextCharge >= today && daysBetween(today, s.nextCharge) <= 30) {
      items.push({ id: `renewal:${s.key}:${s.nextCharge}`, tag: "renewal", name: s.serviceName, text: t.renewal(s.serviceName, input.money(s.currentAmount), input.date(s.nextCharge)), href: `/subscriptions?open=${encodeURIComponent(refOf(s))}` });
    }
  }
  for (const s of live) {
    const rise = s.priceChanges.filter((p) => p.to > p.from * 1.02 && daysBetween(p.date, today) <= 60).at(-1);
    if (rise) items.push({ id: `price:${s.key}:${rise.date}`, tag: "price", name: s.serviceName, text: t.price(s.serviceName, input.money(rise.from), input.money(rise.to)), href: `/subscriptions?open=${encodeURIComponent(refOf(s))}` });
  }
  const unnamed = live.filter((s) => s.needsLabel).length;
  if (unnamed) items.push({ id: `unknown:${unnamed}`, tag: "todo", text: t.unknown(unnamed), href: "/subscriptions?f=todo" });
  const idle = live.filter((s) => s.status === "idle");
  if (idle.length) items.push({ id: `idle:${idle.length}`, tag: "todo", text: t.idle(idle.length, input.money(idle.reduce((x, s) => x + s.yearlyCost, 0))), href: "/subscriptions?f=todo" });
  const todo = live.filter((s) => !s.usage).length;
  if (todo) items.push({ id: `answer:${todo}`, tag: "todo", text: t.answer(todo), href: "/subscriptions?f=todo" });
  if (input.doubts) items.push({ id: `doubts:${input.doubts}`, tag: "setup", text: t.doubts(input.doubts), href: "/#clarify" });
  if (!input.mailboxes) items.push({ id: "mail", tag: "setup", text: t.mail, href: "/" });
  if (!input.watching) items.push({ id: "watch", tag: "setup", text: t.watch, href: "/#bank" });
  return items;
}

/** The first day shown by a month grid (a Monday) and its 42 cells. */
export function monthGrid(month: string): string[] {
  const first = new Date(`${month}-01T12:00:00Z`);
  const offset = (first.getUTCDay() + 6) % 7;
  const start = new Date(first.getTime() - offset * 86_400_000);
  return Array.from({ length: 42 }, (_, i) => new Date(start.getTime() + i * 86_400_000).toISOString().slice(0, 10));
}
