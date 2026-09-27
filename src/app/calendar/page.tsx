import Link from "next/link";
import { getSessionId } from "@/lib/session";
import { getReport, listTrackedTrials } from "@/lib/store";
import { getMessages } from "@/lib/locale";
import { v3 } from "@/lib/i18n-v3";
import { formatDate, money, moneyRound } from "@/lib/i18n";
import { addMonths, daysBetween } from "@/lib/dates";
import { counted, monthGrid } from "@/lib/engagements";
import { upcomingCharges } from "@/lib/upcoming";
import { ServiceIcon } from "@/components/ServiceIcon";
import { TrialForm } from "@/components/Reminders";
import { TrialList } from "@/components/TrialList";
import { Card, Icon } from "@/components/ui";

export const dynamic = "force-dynamic";

interface Event { date: string; name: string; amount: number; currency: string; kind: "paid" | "renewal" | "trial" | "price-increase"; confirmed?: boolean }

/**
 * A month of charges: what was paid (from the statements) on past days, what is expected on the
 * days ahead. Tapping a day shows its charges; without one, the month's list.
 */
export default async function Calendar({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const q = await searchParams;
  const { m, locale } = await getMessages();
  const w = v3(locale);
  const today = new Date().toISOString().slice(0, 10);
  const month = /^\d{4}-\d{2}$/.test(q.m ?? "") ? q.m! : today.slice(0, 7);
  const day = /^\d{4}-\d{2}-\d{2}$/.test(q.d ?? "") && q.d!.startsWith(month) ? q.d : undefined;
  const sessionId = await getSessionId();
  const [report, tracked] = sessionId ? await Promise.all([getReport(sessionId), listTrackedTrials(sessionId)]) : [null, []];
  const subs = (report?.subscriptions ?? []).filter(counted);

  const lastDay = addMonths(`${month}-01`, 1);
  const events: Event[] = [];
  for (const s of subs) for (const c of s.charges ?? []) if (c.date.startsWith(month) && c.date <= today && c.amount > 0) events.push({ date: c.date, name: s.serviceName, amount: c.amount, currency: s.currency, kind: "paid" });
  const ahead = daysBetween(today, lastDay);
  if (ahead > 0 && report) {
    const live = [...report.forgotten, ...report.active, ...report.idle];
    for (const c of upcomingCharges(live, report.trials, today, ahead)) {
      // Due today and not yet on the statement: still expected. Already paid today: shown as paid.
      if (c.date.startsWith(month) && c.date >= today && !events.some((e) => e.kind === "paid" && e.date === c.date && e.name === c.serviceName)) {
        const sub = live.find((s) => s.id === c.key);
        events.push({ date: c.date, name: c.serviceName, amount: c.amount, currency: c.currency, kind: c.kind, confirmed: sub?.nextConfirmed && sub.nextCharge === c.date });
      }
    }
  }
  const on = (d: string) => events.filter((e) => e.date === d);
  const cells = monthGrid(month);
  const title = new Date(`${month}-15T12:00:00Z`).toLocaleDateString(locale === "fr" ? "fr-FR" : "en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
  const weekdays = Array.from({ length: 7 }, (_, i) => new Date(Date.UTC(2024, 0, 1 + i)).toLocaleDateString(locale === "fr" ? "fr-FR" : "en-GB", { weekday: "short", timeZone: "UTC" }));
  const list = day ? on(day) : [...events].sort((a, b) => a.date.localeCompare(b.date));
  const monthTotal = events.reduce((t, e) => t + e.amount, 0);
  const currency = subs[0]?.currency ?? "EUR";
  const link = (params: Record<string, string>) => `/calendar?${new URLSearchParams(params)}`;

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">{w.nav.calendar}</p>
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">{w.calTitle}</h1>
        <p className="text-muted">{w.calIntro}</p>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        <Card className="space-y-4 p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-1">
              <Link href={link({ m: addMonths(`${month}-01`, -1).slice(0, 7) })} className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-surface-2" aria-label={w.prevMonth}><Icon name="chevron" className="h-5 w-5 rotate-180" /></Link>
              <h2 className="min-w-[9rem] text-center font-display text-lg font-semibold capitalize tracking-tight">{title}</h2>
              <Link href={link({ m: addMonths(`${month}-01`, 1).slice(0, 7) })} className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-surface-2" aria-label={w.nextMonth}><Icon name="chevron" className="h-5 w-5" /></Link>
            </div>
            <div className="flex items-center gap-3">
              <span className="tabular hidden text-sm font-semibold sm:inline">{money(monthTotal, currency, locale)}</span>
              <Link href="/calendar" className="rounded-full border border-line px-3 py-1.5 text-sm font-medium hover:border-ink">{w.today}</Link>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold uppercase tracking-widest text-muted">
            {weekdays.map((d) => <span key={d}>{d.replace(".", "")}</span>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((d, i) => {
              const inMonth = d.startsWith(month);
              const ev = inMonth ? on(d) : [];
              const total = ev.reduce((t, e) => t + e.amount, 0);
              const selected = d === day;
              const isToday = d === today;
              return (
                <Link
                  key={d}
                  href={inMonth ? link({ m: month, d }) : link({ m: d.slice(0, 7) })}
                  scroll={false}
                  aria-label={`${formatDate(d, locale)}${ev.length ? `, ${ev.map((e) => e.name).join(", ")}, ${money(total, currency, locale)}` : ""}`}
                  aria-current={isToday ? "date" : selected ? "true" : undefined}
                  className={`rise flex aspect-square flex-col rounded-xl border p-1.5 text-left transition sm:aspect-[1.1] sm:p-2 ${
                    selected ? "border-brand bg-brand text-white" : isToday ? "border-ink/60" : "border-line hover:border-ink/40"
                  } ${inMonth ? "" : "opacity-30"} ${ev.length && !selected ? "bg-brand-soft/50" : ""}`}
                  style={{ animationDelay: `${Math.min(i, 41) * 8}ms` }}
                >
                  <span className="tabular text-xs font-medium">{Number(d.slice(8))}</span>
                  {ev.length > 0 && (
                    <span className="mt-auto flex items-end justify-between gap-1">
                      <span className="hidden -space-x-2 sm:flex">
                        {ev.slice(0, 1).map((e) => <ServiceIcon key={e.name} name={e.name} size="sm" />)}{ev.length > 1 && <span className="ml-2.5 self-center text-[10px] font-semibold text-muted">+{ev.length - 1}</span>}
                      </span>
                      <span className={`tabular whitespace-nowrap text-[10px] font-semibold sm:text-xs ${selected ? "" : ev.some((e) => e.kind !== "paid") ? "text-brand" : "text-ink-2"}`}>{moneyRound(total, currency, locale)}</span>
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </Card>

        <Card className="space-y-4">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="font-display text-lg font-semibold tracking-tight">{day ? formatDate(day, locale) : w.thisMonth}</h2>
            {day && <Link href={link({ m: month })} scroll={false} className="text-sm text-muted hover:text-ink">{w.seeAll}</Link>}
          </div>
          {list.length === 0 ? (
            <div className="py-8 text-center">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-save-soft text-save"><Icon name="spark" className="h-6 w-6" /></span>
              <p className="mt-3 font-semibold">{w.lightDay}</p>
              <p className="text-sm text-muted">{w.lightDayText}</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {list.map((e, i) => (
                <li key={`${e.date}:${e.name}:${i}`} className="flex items-center gap-3">
                  <ServiceIcon name={e.name} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{e.name}</span>
                    <span className="text-xs text-muted">
                      {formatDate(e.date, locale, true)} · {e.kind === "paid" ? w.paid : e.kind === "trial" ? w.tagTrial : e.kind === "price-increase" ? w.tagPrice : e.confirmed ? w.confirmed : w.estimated}
                    </span>
                  </span>
                  <span className="tabular text-sm font-semibold">{money(e.amount, e.currency, locale)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <section className="space-y-4">
        <h2 className="font-display text-xl font-semibold tracking-tight">{w.trialsTitle}</h2>
        <p className="text-sm text-muted">{m.trials.pageIntro}</p>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
          <TrialForm />
          <TrialList trials={report?.trials ?? tracked.filter((t) => t.startsCharging >= today)} />
        </div>
      </section>
    </div>
  );
}
