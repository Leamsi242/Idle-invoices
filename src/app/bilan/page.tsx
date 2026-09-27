import Link from "next/link";
import type { ReactNode } from "react";
import { today as todayLocal } from "@/lib/today";
import { getSessionId } from "@/lib/session";
import { getReport } from "@/lib/store";
import { bilan, defaultAnchor, equivalents, type Period } from "@/lib/bilan";
import { bilanText, type BilanText } from "@/lib/i18n-bilan";
import { addDays } from "@/lib/dates";
import { getMessages } from "@/lib/locale";
import { intlLocale, money, moneyRound, type Locale } from "@/lib/i18n";
import { CountUp } from "@/components/Motion";
import { Icon, Logo } from "@/components/ui";

export const dynamic = "force-dynamic";

// Accent of each card, like a sports report: one hue per theme, readable on the night background.
const ACCENT = { spent: "#ffb547", next: "#7aa7ff", eq: "#5ef2b8", cat: "#ff8a65", dec: "#5ef2b8", badges: "#ffd166" };
const DONUT = ["#ffb547", "#7aa7ff", "#5ef2b8", "#ff8a65", "#e87ba4", "#9085e9"];

const isoDay = /^\d{4}-\d{2}-\d{2}$/;

function Card({ accent, eyebrow, line, art, children, delay = 0 }: { accent: string; eyebrow: string; line: string; art?: string; children?: ReactNode; delay?: number }) {
  return (
    <section className="rise relative overflow-hidden rounded-[26px] bg-white/[0.06] p-5 ring-1 ring-white/10 sm:p-6" style={{ animationDelay: `${delay}ms` }}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[12px] font-semibold uppercase tracking-[0.16em]" style={{ color: accent }}>{eyebrow}</p>
          <h2 className="mt-1.5 font-display text-xl font-semibold leading-snug tracking-tight text-white sm:text-2xl">{line}</h2>
        </div>
        {art && <img src={art} alt="" className="-mr-2 -mt-2 h-24 w-24 shrink-0 object-contain sm:h-28 sm:w-28" />}
      </div>
      {children && <div className="mt-5">{children}</div>}
    </section>
  );
}

function Change({ value, t, period, locale }: { value: number | null; t: BilanText; period: Period; locale: Locale }) {
  if (value === null) return <p className="text-sm text-white/60">{t.noBefore}</p>;
  const up = value > 0;
  const color = value === 0 ? "#cfd3e6" : up ? "#ff8a65" : "#5ef2b8";
  return (
    <p className="flex items-center gap-2 text-sm text-white/70">
      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold tabular" style={{ color, background: `${color}22` }}>
        <svg viewBox="0 0 12 12" className="h-3 w-3" aria-hidden><path d={up ? "M6 2 11 9H1z" : "M6 10 1 3h10z"} fill="currentColor" /></svg>
        {new Intl.NumberFormat(intlLocale(locale), { style: "percent", maximumFractionDigits: 1 }).format(Math.abs(value) / 100)}
      </span>
      {t.vsBefore[period]}
    </p>
  );
}

function Bars({ days, period, locale, currency }: { days: { date: string; amount: number }[]; period: Period; locale: Locale; currency: string }) {
  const max = Math.max(1, ...days.map((d) => d.amount));
  const label = (d: string, i: number) =>
    period === "week"
      ? new Date(`${d}T12:00:00Z`).toLocaleDateString(intlLocale(locale), { weekday: "narrow", timeZone: "UTC" })
      : [0, 7, 14, 21, 28].includes(i) ? String(i + 1) : "";
  return (
    <div>
      <div className={`flex h-32 items-end border-b border-white/15 ${period === "week" ? "gap-3" : "gap-[3px]"}`}>
        {days.map((d, i) => (
          <div key={d.date} className="flex h-full flex-1 items-end" title={`${d.date}: ${money(d.amount, currency, locale)}`}>
            <div className="grow-y w-full rounded-t-[4px]" style={{ height: d.amount ? `${Math.max(6, (d.amount / max) * 100)}%` : "3px", background: d.amount ? ACCENT.spent : "rgb(255 255 255 / 0.12)", animationDelay: `${i * 18}ms` }} />
          </div>
        ))}
      </div>
      <div className={`mt-1.5 flex text-[11px] text-white/50 ${period === "week" ? "gap-3" : "gap-[3px]"}`}>
        {days.map((d, i) => <span key={d.date} className="flex-1 text-center tabular capitalize">{label(d.date, i)}</span>)}
      </div>
    </div>
  );
}

function Donut({ rows, names, locale, currency }: { rows: { category: string; amount: number }[]; names: Record<string, string>; locale: Locale; currency: string }) {
  const top = rows.slice(0, 5);
  const rest = rows.slice(5).reduce((t, r) => t + r.amount, 0);
  // Everything past the fifth folds into "other", which may already be a row.
  const shown = rest <= 0 ? top : top.some((r) => r.category === "other") ? top.map((r) => (r.category === "other" ? { ...r, amount: r.amount + rest } : r)) : [...top, { category: "other", amount: rest }];
  const sum = shown.reduce((t, r) => t + r.amount, 0);
  const R = 42;
  const C = 2 * Math.PI * R;
  let at = 0;
  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row">
      <svg viewBox="0 0 110 110" className="h-36 w-36 shrink-0 -rotate-90" aria-hidden>
        <circle cx="55" cy="55" r={R} fill="none" stroke="rgb(255 255 255 / 0.08)" strokeWidth="16" />
        {shown.map((r, i) => {
          const len = (r.amount / sum) * C;
          const el = <circle key={r.category + i} cx="55" cy="55" r={R} fill="none" stroke={DONUT[i % DONUT.length]} strokeWidth="16" strokeDasharray={`${Math.max(0, len - 1.5)} ${C}`} strokeDashoffset={-at} />;
          at += len;
          return el;
        })}
      </svg>
      <ul className="w-full space-y-2">
        {shown.map((r, i) => (
          <li key={r.category + i} className="flex items-center gap-2.5 text-sm">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: DONUT[i % DONUT.length] }} />
            <span className="flex-1 truncate text-white/80 first-letter:uppercase">{names[r.category] ?? r.category}</span>
            <span className="tabular text-white/60">{new Intl.NumberFormat(intlLocale(locale), { style: "percent" }).format(r.amount / sum)}</span>
            <span className="tabular w-20 text-right font-semibold text-white">{moneyRound(r.amount, currency, locale)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const BADGE_ICON: Record<string, ReactNode> = {
  first: <path d="M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.4 6.8 19.1l1-5.8L3.5 9.2l5.9-.9z" />,
  calm: <><circle cx="12" cy="12" r="8" /><path d="M8.5 13.5c1 1.3 2.1 2 3.5 2s2.5-.7 3.5-2M9 9.5h.01M15 9.5h.01" /></>,
  down: <path d="M4 7l6 6 3-3 7 7M20 11v6h-6" />,
  hunter: <><circle cx="11" cy="11" r="6" /><path d="M20 20l-4.5-4.5M8.5 11h5" /></>,
  named: <><path d="M4 12.5l5 5L20 6.5" /></>,
  yearly: <><rect x="4" y="5" width="16" height="15" rx="2.5" /><path d="M4 10h16M9 3v4M15 3v4M9.5 15l2 2 3.5-3.5" /></>,
};

export default async function BilanPage({ searchParams }: { searchParams: Promise<{ p?: string; d?: string }> }) {
  const { m, locale } = await getMessages();
  const t = bilanText(locale);
  const q = await searchParams;
  const period: Period = q.p === "week" ? "week" : "month";
  const sessionId = await getSessionId();
  const today = await todayLocal();
  const report = sessionId ? await getReport(sessionId, today) : null;

  if (!report || report.uploads === 0) {
    return (
      <section className="spotlight grain relative overflow-hidden rounded-[28px] px-6 py-14 text-center text-white">
        <img src="/illustrations/hero-month.svg" alt="" className="mx-auto h-44 w-auto" />
        <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight">{t.title.month}</h1>
        <p className="mx-auto mt-2 max-w-md text-white/75">{t.empty}</p>
        <Link href="/" className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 font-semibold text-night">{t.emptyCta} <Icon name="arrow" className="h-4 w-4" /></Link>
      </section>
    );
  }

  const subs = report.subscriptions;
  const anchor = q.d && isoDay.test(q.d) ? q.d : defaultAnchor(period, subs, today);
  const b = bilan(subs, period, anchor, today);
  const cur = b.currency;
  const fmt = (n: number, d = 2) => money(Math.round(n * 10 ** d) / 10 ** d, cur, locale);
  const day = (d: string, year = false) => new Date(`${d}T12:00:00Z`).toLocaleDateString(intlLocale(locale), { day: "numeric", month: "long", ...(year ? { year: "numeric" } : {}), timeZone: "UTC" });
  const range = t.range(day(b.start).replace(/\.$/, ""), day(b.end, true));
  const prevHref = `/bilan?p=${period}&d=${addDays(b.start, -1)}`;
  const nextStart = addDays(b.end, 1);
  const canNext = nextStart <= today;
  const nextHref = `/bilan?p=${period}&d=${nextStart}`;
  const eq = equivalents(b.total, cur);
  const decided = subs.filter((s) => s.usage).length;
  const earned = b.badges.filter((x) => x.earned).length;
  const dayName = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString(intlLocale(locale), { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
  const others = report.otherCurrencies.filter((o) => o.totalYearly > 0).map((o) => o.currency);

  return (
    <div className="mx-auto max-w-2xl space-y-4 rounded-[32px] bg-[#0d1020] p-3 text-white sm:p-5">
      {/* Hero: the illustration, the title, the period, and how to move in time. */}
      <header className="relative overflow-hidden rounded-[26px] bg-gradient-to-b from-[#1d2446] to-[#121630] px-5 pb-6 pt-5 text-center ring-1 ring-white/10">
        <div className="flex items-center justify-between gap-2">
          <nav className="inline-flex rounded-full bg-white/10 p-1 text-sm font-semibold" aria-label={t.eyebrow}>
            {(["week", "month"] as const).map((p) => (
              <Link key={p} href={`/bilan?p=${p}`} aria-current={p === period ? "page" : undefined} className={`rounded-full px-3.5 py-1.5 transition ${p === period ? "bg-white text-night" : "text-white/70 hover:text-white"}`}>{t.tabs[p]}</Link>
            ))}
          </nav>
          <div className="flex gap-1.5">
            <Link href={prevHref} aria-label={t.prev} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 hover:bg-white/20"><Icon name="chevron" className="h-4 w-4 rotate-180" /></Link>
            {canNext
              ? <Link href={nextHref} aria-label={t.next} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 hover:bg-white/20"><Icon name="chevron" className="h-4 w-4" /></Link>
              : <span aria-hidden className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-white/25"><Icon name="chevron" className="h-4 w-4" /></span>}
          </div>
        </div>
        <img src="/illustrations/hero-month.svg" alt="" className="mx-auto mt-2 h-44 w-auto sm:h-56" />
        <p className="mt-2 text-[12px] font-semibold uppercase tracking-[0.18em] text-[#ffd166]">{t.eyebrow}</p>
        <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight sm:text-4xl">{t.title[period]}</h1>
        <p className="mt-1.5 text-sm text-white/65">{range}</p>
      </header>

      <Card accent={ACCENT.spent} eyebrow={t.spentEyebrow} line={t.spentLine(b.count)} art="/illustrations/spending.svg" delay={60}>
        <p className="text-sm text-white/60">{t.total}</p>
        <p className="font-display text-4xl font-semibold tracking-tight sm:text-5xl"><CountUp id={`bilan-${b.start}`} value={b.total} locale={locale} currency={cur} decimals={2} /></p>
        <div className="mt-2"><Change value={b.change} t={t} period={period} locale={locale} /></div>
        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.14em] text-white/45">{t.daily}</p>
        <div className="mt-2"><Bars days={b.days} period={period} locale={locale} currency={cur} /></div>
        {(b.busiest || b.biggest || b.newOnes.length > 0) && (
          <div className="mt-5 flex gap-3 rounded-2xl bg-[#ffb547]/10 p-4 text-sm text-white/85 ring-1 ring-[#ffb547]/25">
            <svg viewBox="0 0 24 24" className="mt-0.5 h-5 w-5 shrink-0 text-[#ffb547]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M5 12h14M13 6l6 6-6 6" /></svg>
            <div className="space-y-1">
              {b.biggest && <p>{t.biggest(b.biggest.name, fmt(b.biggest.amount))}</p>}
              {b.busiest && period === "month" && !(b.biggest && b.biggest.date === b.busiest.date && b.biggest.amount === b.busiest.amount) && <p>{t.busiest(dayName(b.busiest.date), fmt(b.busiest.amount))}</p>}
              {b.newOnes.length > 0 && <p>{t.newOnes(b.newOnes.join(", "))}</p>}
            </div>
          </div>
        )}
        {others.length > 0 && <p className="mt-3 text-xs text-white/50">{t.otherCurrency(others.join(", "))}</p>}
      </Card>

      {eq && (
        <Card accent={ACCENT.eq} eyebrow={t.eqEyebrow} line={t.eqLine} art="/illustrations/equivalence.svg" delay={120}>
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="font-display text-3xl font-semibold tracking-tight text-[#5ef2b8]">{t.coffees(eq.coffee)}</span>
            <span className="text-white/50">{t.or}</span>
            <span className="font-display text-3xl font-semibold tracking-tight text-[#5ef2b8]">{t.cinema(eq.cinema.toLocaleString(intlLocale(locale)))}</span>
          </div>
          <p className="mt-2 text-xs text-white/50">{t.eqHint(money(eq.coffeePrice, cur, locale), money(eq.cinemaPrice, cur, locale))}</p>
        </Card>
      )}

      {b.categories.length > 0 && (
        <Card accent={ACCENT.cat} eyebrow={t.catEyebrow} line={t.catLine((m.ui.categories[b.categories[0].category] ?? b.categories[0].category).replace(/^./, (c) => c.toUpperCase()))} delay={180}>
          <Donut rows={b.categories} names={m.ui.categories} locale={locale} currency={cur} />
        </Card>
      )}

      <Card accent={ACCENT.next} eyebrow={t.nextEyebrow} line={t.nextLine[period]} art="/illustrations/calendar.svg" delay={240}>
        {b.nextTotal > 0
          ? <p className="font-display text-3xl font-semibold tracking-tight">{fmt(b.nextTotal)} <span className="text-sm font-normal text-white/55">{t.range(day(b.nextStart), day(b.nextEnd))}</span></p>
          : <p className="text-white/75">{t.nextNone}</p>}
        <p className="mt-2 text-xs text-white/50">{t.nextHint}</p>
        <Link href="/calendar" className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/20">{t.seeCalendar} <Icon name="arrow" className="h-4 w-4" /></Link>
      </Card>

      <Card accent={ACCENT.dec} eyebrow={t.decEyebrow} line={t.decLine(decided)} art="/illustrations/decisions.svg" delay={300}>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-white/[0.06] p-4">
            <p className="text-xs text-white/55">{t.saved}</p>
            <p className="mt-1 font-display text-2xl font-semibold text-[#5ef2b8]">{moneyRound(report.savedYearly, cur, locale)}</p>
            <p className="text-[11px] text-white/45">{t.savedHint}</p>
          </div>
          <div className="rounded-2xl bg-white/[0.06] p-4">
            <p className="text-xs text-white/55">{t.potential}</p>
            <p className="mt-1 font-display text-2xl font-semibold text-[#ffb547]">{moneyRound(report.potentialSavings, cur, locale)}</p>
            <p className="text-[11px] text-white/45">{t.potentialHint}</p>
          </div>
        </div>
        <p className="mt-3 text-xs text-white/50">{t.decNote}</p>
        <Link href="/subscriptions" className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-semibold text-night hover:opacity-90">{t.decide} <Icon name="arrow" className="h-4 w-4" /></Link>
      </Card>

      <Card accent={ACCENT.badges} eyebrow={t.badgesEyebrow} line={t.badgesLine(earned, b.badges.length)} art="/illustrations/medals.svg" delay={360}>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {b.badges.map((x) => {
            const [name, hint] = t.badges[x.id];
            return (
              <li key={x.id} className={`flex flex-col items-center rounded-2xl p-3 text-center ${x.earned ? "bg-[#ffd166]/10 ring-1 ring-[#ffd166]/30" : "bg-white/[0.04] opacity-55"}`}>
                <span className={`flex h-12 w-12 items-center justify-center rounded-full ${x.earned ? "bg-gradient-to-b from-[#ffe08a] to-[#f0a92e] text-[#5a3a00]" : "bg-white/10 text-white/50"}`}>
                  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{BADGE_ICON[x.id]}</svg>
                </span>
                <span className="mt-2 text-sm font-semibold">{name}</span>
                <span className="mt-0.5 text-[11px] leading-snug text-white/55">{hint}</span>
                <span className="sr-only">{x.earned ? t.earned : t.locked}</span>
              </li>
            );
          })}
        </ul>
      </Card>

      <footer className="flex items-center gap-3 px-2 pb-2 pt-1">
        <Logo className="h-8 w-8 shrink-0" id="lg-bilan" />
        <div>
          <p className="font-display font-semibold">Subscription Detective</p>
          <p className="text-[11px] text-white/50">{t.footer}</p>
        </div>
      </footer>
    </div>
  );
}
