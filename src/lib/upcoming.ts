import type { Frequency, Status } from "./types";
import type { UpcomingTrial } from "./engine/trials";
import { nextChargeDate } from "./engine/pipeline";

/**
 * What will be charged in the coming days: the one list a user can act on right away. A
 * subscription whose expected date has passed without a new charge on the statements yet (the
 * bank statement ends earlier than today) is projected to its next period.
 */
export interface UpcomingCharge {
  key: string;
  serviceName: string;
  date: string;
  amount: number;
  currency: string;
  kind: "renewal" | "trial" | "price-increase";
  cancellationUrl?: string;
}

interface Sub { key: string; serviceName: string; status: Status; nextCharge: string; currentAmount: number; currency: string; frequency: Frequency; cancellationUrl?: string }

export function upcomingCharges(subs: Sub[], trials: UpcomingTrial[], today: string, days = 30): UpcomingCharge[] {
  const until = new Date(Date.parse(`${today}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
  const out: UpcomingCharge[] = [];
  for (const s of subs) {
    if (s.status === "cancelled" || !s.nextCharge) continue;
    let date = s.nextCharge;
    for (let i = 0; date < today && i < 60; i++) date = nextChargeDate(date, s.frequency);
    // Every charge in the window: a weekly plan charges four or five times in 30 days.
    for (let i = 0; date <= until && i < 6; i++, date = nextChargeDate(date, s.frequency)) {
      out.push({ key: s.key, serviceName: s.serviceName, date, amount: s.currentAmount, currency: s.currency, kind: "renewal", cancellationUrl: s.cancellationUrl });
    }
  }
  for (const t of trials) {
    if (t.startsCharging < today || t.startsCharging > until) continue;
    out.push({ key: `trial:${t.serviceName}`, serviceName: t.serviceName, date: t.startsCharging, amount: t.amount, currency: t.currency, kind: t.kind, cancellationUrl: t.cancellationUrl });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date) || b.amount - a.amount);
}
