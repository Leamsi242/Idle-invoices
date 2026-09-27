import Link from "next/link";
import { today as todayLocal } from "@/lib/today";
import { getSessionId } from "@/lib/session";
import { getConnections, getDoubts, getReport, listAlerts, listWatches, PAID_WITH_FILE, PAID_WITH_RECEIPTS, type StoredSubscription } from "@/lib/store";
import { byCategory, insights, missions, type Insight } from "@/lib/insights";
import { attention, counted, refOf, monthly, rhythm, statusOf } from "@/lib/engagements";
import { v3, type V3 } from "@/lib/i18n-v3";
import { CountUp, ScoreRing } from "@/components/Motion";
import { Attention } from "@/components/Attention";
import { AlertsPanel } from "@/components/Watch";
import { alertLine } from "@/lib/notify";
import { ServiceIcon } from "@/components/ServiceIcon";
import { TryDemo } from "@/components/Nav";
import { Card, Icon, Logo, SectionTitle } from "@/components/ui";
import { mainCurrency } from "@/lib/engine/flags";
import { projectedNext, upcomingCharges, type UpcomingCharge } from "@/lib/upcoming";
import { getMessages } from "@/lib/locale";
import { formatDate, intlLocale, money, moneyRound, type Locale, type Messages } from "@/lib/i18n";

export const dynamic = "force-dynamic";

const payName = (p: string, m: Messages) => (p === PAID_WITH_FILE ? m.report.viaFile : p === PAID_WITH_RECEIPTS ? m.report.viaReceipts : p);
const whole = (n: number, currency: string, locale: Locale) => moneyRound(n, currency, locale);

/**
 * The yearly spend split by way of paying: one bar, one colored segment per bank, card or PayPal.
 * Each color keeps its way of paying across pages; the subscriptions page filters by it.
 */
function PaySplit({ subs, m, locale, perYear }: { subs: StoredSubscription[]; m: Messages; locale: Locale; perYear: string }) {
  const totals = new Map<string, number>();
  const cur = mainCurrency(subs.filter((s) => s.status !== "cancelled" && counted(s)));
  for (const s of subs) {
    if (s.status === "cancelled" || !counted(s) || s.currency !== cur) continue;
    const ways = s.paidWith?.length ? s.paidWith : [PAID_WITH_RECEIPTS];
    // A PayPal payment debited from a bank is one expense: count it once, under PayPal.
    const main = ways.includes("PayPal") ? "PayPal" : ways[0];
    totals.set(main, (totals.get(main) ?? 0) + s.yearlyCost);
  }
  const rows = [...totals].sort((a, b) => b[1] - a[1]);
  // Color follows the way of paying, not its rank: slots in a fixed (alphabetical) order.
  const order = [...totals.keys()].sort((a, b) => a.localeCompare(b));
  const color = (name: string) => `var(--series-${(order.indexOf(name) % 8) + 1})`;
  const sum = rows.reduce((t, [, v]) => t + v, 0);
  if (rows.length === 0) return null;
  const currency = cur;
  return (
    <Card className="space-y-4">
      <SectionTitle title={m.ui.split} aside={<span className="text-sm text-muted">{perYear}</span>} />
      <div className="flex h-3 overflow-hidden rounded-full bg-surface-2">
        {rows.map(([name, v], i) => (
          <div key={name} className="grow-x border-r-2 border-surface last:border-r-0" style={{ width: `${(v / sum) * 100}%`, background: color(name), animationDelay: `${i * 90}ms` }} />
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {rows.map(([name, v]) => (
          <span key={name} className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-sm font-medium text-ink-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: color(name) }} />
            {payName(name, m)}
            <span className="tabular text-xs opacity-70">{moneyRound(v, currency, locale)}</span>
          </span>
        ))}
      </div>
    </Card>
  );
}


const INSIGHT_ICON: Record<Insight["kind"], "clock" | "calendar" | "spark" | "list" | "eye" | "wallet" | "hourglass"> = {
  daily: "clock", lifetime: "hourglass", rises: "spark", overlap: "list", oldest: "eye", renewal: "calendar", fiveYears: "wallet",
};

/** What the numbers mean, one card per revelation, swiped on a phone. */
function Reveals({ items, m, locale, currency }: { items: Insight[]; m: Messages; locale: Locale; currency: string }) {
  if (items.length === 0) return null;
  const u = m.ui;
  const $ = (n: number, d = 0) => new Intl.NumberFormat(intlLocale(locale), { style: "currency", currency, maximumFractionDigits: d, minimumFractionDigits: d }).format(n);
  const card = (x: Insight): { big: string; text: string; tone: string } => {
    switch (x.kind) {
      case "daily": return { big: $(x.amount, 2), text: u.insightDaily($(x.amount, 2)), tone: "text-leak" };
      case "lifetime": return { big: $(x.amount), text: u.insightLifetime($(x.amount), formatDate(x.since, locale)), tone: "text-ink" };
      case "rises": return { big: `+${$(x.amount)}`, text: u.insightRises($(x.amount), x.count), tone: "text-leak" };
      case "overlap": return { big: `${x.count} × ${u.categories[x.category] ?? x.category}`, text: u.insightOverlap(x.count, u.categories[x.category] ?? x.category, $(x.amount)), tone: "text-brand" };
      case "oldest": return { big: `${x.months} ${locale === "fr" ? "mois" : x.months === 1 ? "month" : "months"}`, text: u.insightOldest(x.name, x.months), tone: "text-brand" };
      case "renewal": return { big: $(x.amount), text: u.insightRenewal(x.name, $(x.amount, 2), formatDate(x.date, locale)), tone: "text-leak" };
      case "fiveYears": return { big: $(x.amount), text: u.insightFiveYears($(x.amount)), tone: "text-save" };
    }
  };
  return (
    <section className="space-y-3">
      <SectionTitle title={u.reveals} />
      <ul className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-[repeat(auto-fit,minmax(210px,1fr))] sm:overflow-visible sm:px-0">
        {items.map((x, i) => {
          const c = card(x);
          return (
            <li key={x.kind} className="rise lift relative flex w-[72%] shrink-0 snap-start flex-col gap-2 rounded-3xl border border-line bg-surface p-5 shadow-card sm:w-auto" style={{ animationDelay: `${i * 80}ms` }}>
              <Icon name={INSIGHT_ICON[x.kind]} className="h-5 w-5 text-muted" />
              <p className={`tabular font-display text-3xl font-semibold tracking-tight ${c.tone}`}>{c.big}</p>
              <p className="text-sm text-ink-2">{c.text}</p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** Yearly spend per category: one hue, longest bar first, amounts written on each line. */
function CategoryBars({ rows, m, locale, currency, perYear }: { rows: { category: string; amount: number; count: number }[]; m: Messages; locale: Locale; currency: string; perYear: string }) {
  if (rows.length === 0) return null;
  const top = rows.slice(0, 6);
  const rest = rows.slice(6).reduce((t, r) => ({ amount: t.amount + r.amount, count: t.count + r.count }), { amount: 0, count: 0 });
  // Everything past the sixth folds into "other" (which may already be a row).
  const shown = rest.count
    ? top.some((r) => r.category === "other")
      ? top.map((r) => (r.category === "other" ? { ...r, amount: r.amount + rest.amount, count: r.count + rest.count } : r))
      : [...top, { category: "other", ...rest }]
    : top;
  const max = Math.max(...shown.map((r) => r.amount));
  return (
    <Card className="space-y-4">
      <SectionTitle title={m.ui.byCategory} aside={<span className="text-sm text-muted">{perYear}</span>} />
      <ul className="space-y-3">
        {shown.map((r, i) => (
          <li key={r.category} className="space-y-1">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="font-medium first-letter:uppercase">{m.ui.categories[r.category] ?? r.category} <span className="font-normal text-muted">({r.count})</span></span>
              <span className="tabular font-semibold">{moneyRound(r.amount, currency, locale)}</span>
            </div>
            <div className="h-2 rounded-full bg-surface-2">
              <div className="grow-x h-full rounded-full bg-brand" style={{ width: `${Math.max(3, (r.amount / max) * 100)}%`, animationDelay: `${i * 80}ms` }} />
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

/** A key figure: a label, a number that counts up, and what it means. */
function Kpi({ label, value, hint, id, locale, currency, tone = "", icon, decimals = 0, suffix }: { label: string; value: number; hint: string; id: string; locale: Locale; currency: string; tone?: string; icon: "wallet" | "eye" | "spark" | "check"; decimals?: number; suffix?: string }) {
  return (
    <div className="lift rise rounded-3xl border border-line bg-surface p-5 shadow-card">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted">{label}</p>
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-surface-2 text-ink-2"><Icon name={icon} className="h-4 w-4" /></span>
      </div>
      <p className={`mt-2 font-display text-3xl font-semibold tracking-tight ${tone}`}>
        <CountUp id={id} value={value} locale={locale} currency={currency} decimals={decimals} />
        {suffix && <span className="text-sm font-normal text-muted"> {suffix}</span>}
      </p>
      <p className="mt-1 text-xs text-muted">{hint}</p>
    </div>
  );
}

/**
 * Six months of subscription spending, one bar per month: the current month, still in progress,
 * stands out. One series, so no legend; each bar is labelled with its amount.
 */
function Rhythm({ data, w, locale, currency }: { data: { month: string; amount: number; current: boolean }[]; w: V3; locale: Locale; currency: string }) {
  const max = Math.max(1, ...data.map((d) => d.amount));
  const total = data.reduce((t, d) => t + d.amount, 0);
  return (
    <Card className="space-y-4">
      <SectionTitle title={w.rhythm} aside={<span className="tabular text-sm text-muted">{w.rhythmTotal(whole(total, currency, locale))}</span>} />
      <p className="-mt-3 text-sm text-muted">{w.rhythmHint}</p>
      <div className="grid h-48 grid-cols-6 items-end gap-3 border-b border-line pb-px">
        {data.map((d, i) => (
          <div key={d.month} className="group relative flex h-full flex-col items-center justify-end gap-1.5" title={`${d.month}: ${money(d.amount, currency, locale)}`}>
            <span className="tabular text-[11px] font-semibold text-ink-2">{whole(d.amount, currency, locale)}</span>
            <div
              className={`grow-y w-full max-w-12 rounded-t-lg transition group-hover:opacity-80 ${d.current ? "bg-save" : "bg-brand"}`}
              style={{ height: `${Math.max(2, (d.amount / max) * 78)}%`, animationDelay: `${i * 90}ms` }}
            />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-6 gap-3 text-center text-xs capitalize text-muted">
        {data.map((d) => <span key={d.month}>{new Date(`${d.month}-15T12:00:00Z`).toLocaleDateString(intlLocale(locale), { month: "short", timeZone: "UTC" })}</span>)}
      </div>
    </Card>
  );
}

/** The next few charges, with whether each date is confirmed or estimated. */
function Upcoming({ charges, subs, w, locale }: { charges: UpcomingCharge[]; subs: StoredSubscription[]; w: V3; locale: Locale }) {
  return (
    <Card className="flex flex-col gap-4">
      <SectionTitle title={w.upcoming} aside={<span className="rounded-lg border border-line px-2 py-0.5 text-xs text-muted">{charges.length}</span>} />
      <p className="-mt-3 text-sm text-muted">{w.upcomingHint}</p>
      <ul className="space-y-3">
        {charges.slice(0, 5).map((c, i) => {
          const s = subs.find((x) => x.id === c.key);
          return (
            <li key={`${c.key}:${c.date}`} className="rise flex items-center gap-3" style={{ animationDelay: `${i * 60}ms` }}>
              <ServiceIcon name={c.serviceName} size="sm" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{c.serviceName}</span>
                <span className="text-xs text-muted">
                  {formatDate(c.date, locale, true)} · {c.kind === "trial" ? w.tagTrial : c.kind === "price-increase" ? w.tagPrice : s?.nextConfirmed && s.nextCharge === c.date ? w.confirmed : w.estimated}
                </span>
              </span>
              <span className="tabular text-sm font-semibold">{money(c.amount, c.currency, locale)}</span>
            </li>
          );
        })}
      </ul>
      <Link href="/calendar" className="mt-auto flex items-center justify-center gap-1 rounded-2xl bg-surface-2 py-2.5 text-sm font-medium text-ink-2 hover:text-ink">
        {w.openCalendar} <Icon name="arrow" className="h-4 w-4" />
      </Link>
    </Card>
  );
}

/** The five biggest subscriptions, each opening its detail. */
function Glance({ subs, m, w, locale, today }: { subs: StoredSubscription[]; m: Messages; w: V3; locale: Locale; today: string }) {
  const top = [...subs].sort((a, b) => b.yearlyCost - a.yearlyCost).slice(0, 5);
  if (top.length === 0) return null;
  return (
    <Card className="space-y-3">
      <SectionTitle title={w.glance} aside={<Link href="/subscriptions" className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink">{w.seeAll} <Icon name="arrow" className="h-4 w-4" /></Link>} />
      <p className="-mt-2 text-sm text-muted">{w.glanceHint}</p>
      <ul className="divide-y divide-line">
        {top.map((s) => (
          <li key={s.id}>
            <Link href={`/subscriptions?open=${encodeURIComponent(refOf(s))}`} className="flex items-center gap-3 py-3 transition hover:opacity-80">
              <ServiceIcon name={s.serviceName} />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold tracking-tight">{s.serviceName}</span>
                <span className="text-xs text-muted">{w.statuses[statusOf(s)]}{s.paidWith?.length ? ` · ${s.paidWith.map((p) => payName(p, m)).join(" + ")}` : ""}</span>
              </span>
              <span className="text-right">
                <span className="tabular block font-semibold">{money(monthly(s), s.currency, locale)}<span className="text-xs font-normal text-muted"> {w.perMonth}</span></span>
                <span className="text-xs text-muted">{s.status === "cancelled" ? "" : formatDate(projectedNext(s, today), locale)}</span>
              </span>
              <Icon name="chevron" className="h-5 w-5 text-muted" />
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export default async function Overview() {
  const { m, locale } = await getMessages();
  const u = m.ui;
  const w = v3(locale);
  const sessionId = await getSessionId();
  const today = await todayLocal();
  const [report, doubts, alerts, connections, watches] = sessionId
    ? await Promise.all([getReport(sessionId, today), getDoubts(sessionId, locale), listAlerts(sessionId), getConnections(sessionId), listWatches(sessionId)])
    : [null, [], [], null, []];
  if (!report || report.uploads === 0) {
    return (
      <section className="spotlight grain sweep relative overflow-hidden rounded-[28px] px-6 py-14 text-center text-white">
        <Logo className="mx-auto h-12 w-12" id="lg-empty" />
        <h1 className="mx-auto mt-5 max-w-lg font-display text-3xl font-semibold tracking-tight sm:text-4xl">{w.heroTitle1} {w.heroTitle2}</h1>
        <p className="mx-auto mt-3 max-w-md text-white/75">{m.report.empty}</p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <Link href="/" className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 font-semibold text-night">{m.report.emptyLink} <Icon name="arrow" className="h-4 w-4" /></Link>
          <TryDemo label={w.tryDemo} className="rounded-2xl border border-white/30 px-5 py-3 font-semibold text-white hover:bg-white/10" />
          <a href={`/tour/index.html?lang=${locale}`} className="rounded-2xl px-3 py-3 font-semibold text-white/85 underline-offset-4 hover:underline">{w.tour}</a>
        </div>
        <p className="mt-3 text-sm text-white/60">{w.tryDemoHint}</p>
      </section>
    );
  }
  const r = report;
  const subs = r.subscriptions;
  const liveSubs = subs.filter((s) => counted(s) && s.status !== "cancelled");
  const currency = r.currency;
  const toReview = liveSubs.filter((s) => statusOf(s) === "todo" || s.status === "idle" || s.needsLabel);
  // Money to look at: what is unconfirmed or flagged, not a certain loss.
  const atRisk = toReview.filter((s) => s.currency === currency).reduce((t, s) => t + s.yearlyCost, 0) / 12;
  const mission = missions({
    banks: connections?.banks.length ?? 0,
    mailboxes: connections?.mailboxes.length ?? 0,
    unnamed: liveSubs.filter((s) => s.needsLabel).length,
    unanswered: liveSubs.filter((s) => !s.usage).length,
    idle: liveSubs.filter((s) => s.status === "idle"),
    watching: watches.length > 0,
  });
  const items = attention({
    subs,
    trials: r.trials,
    today,
    doubts: doubts.length,
    mailboxes: connections?.mailboxes.length ?? 0,
    watching: watches.length > 0,
    t: { trial: w.aTrial, renewal: w.aRenewal, price: w.aPriceUp, unknown: w.aUnknown, answer: w.aAnswer, idle: w.aIdle, doubts: w.aDoubts, mail: w.aMail, watch: w.aWatch },
    money: (n, cur) => money(n, cur, locale),
    date: (d) => formatDate(d, locale),
  });
  const icons = Object.fromEntries(items.filter((i) => i.name).map((i) => [i.name!, <ServiceIcon key={i.name} name={i.name!} />]));
  const charges = upcomingCharges([...r.forgotten, ...r.active, ...r.idle], r.trials, today);
  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">{w.nav.overview}</p>
          <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">{m.tagline}</h1>
        </div>
        <p className="flex items-center gap-2 text-sm text-muted"><Icon name="calendar" className="h-4 w-4" />{formatDate(today, locale)}</p>
      </section>

      <AlertsPanel lines={alerts.map((a) => ({ id: a.id, text: alertLine(a.change, locale), date: formatDate(a.createdAt, locale) }))} />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <section className="spotlight grain sweep relative overflow-hidden rounded-[28px] p-6 text-white sm:p-8">
          <div className="relative flex h-full flex-col gap-5">
            <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#5ef2b8]" />{w.heroEyebrow}</p>
            <div className="flex items-start justify-between gap-4">
              <h2 className="font-display text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">{w.heroTitle1}<br /><span className="text-white/70">{w.heroTitle2}</span></h2>
              <ScoreRing value={mission.score} label={u.mastery} />
            </div>
            <p className="max-w-md text-white/80">{w.heroSummary(liveSubs.length, toReview.length)}</p>
            <div className="mt-auto flex flex-wrap items-center gap-3">
              <Link href="/subscriptions" className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-2.5 font-semibold text-night hover:opacity-90">{w.seeSubs} <Icon name="arrow" className="h-4 w-4" /></Link>
              <span className="text-sm text-white/70">{u.masteryTitle(mission.score)}</span>
            </div>
          </div>
        </section>
        <div className="grid grid-cols-2 gap-4">
          <Kpi id="monthly" label={w.kpiMonthly} value={r.totalYearly / 12} decimals={2} hint={w.kpiAnnual(whole(r.totalYearly, currency, locale))} locale={locale} currency={currency} icon="wallet" />
          <Kpi id="risk" label={w.kpiRisk} value={atRisk} decimals={2} hint={w.kpiRiskHint} locale={locale} currency={currency} icon="eye" tone={atRisk ? "text-leak" : ""} suffix={w.perMonth} />
          <Kpi id="potential" label={w.kpiPotential} value={r.potentialSavings} hint={w.kpiPotentialHint} locale={locale} currency={currency} icon="spark" tone="text-brand" />
          <Kpi id="confirmed" label={w.kpiConfirmed} value={r.savedYearly} hint={w.kpiConfirmedHint} locale={locale} currency={currency} icon="check" tone="text-save" />
          {r.otherCurrencies.some((o) => o.totalYearly > 0) && (
            <p className="col-span-2 rounded-2xl border border-line bg-surface px-4 py-3 text-sm text-ink-2">
              {w.otherCurrencies(r.otherCurrencies.filter((o) => o.totalYearly > 0).map((o) => `${money(o.totalYearly / 12, o.currency, locale)} ${w.perMonth}`).join(", "))}
            </p>
          )}
        </div>
      </div>

      <Attention items={items} icons={icons} t={{ title: w.attention, hint: w.attentionHint, empty: w.attentionEmpty, snooze: w.snooze, see: w.see, tags: { trial: w.tagTrial, renewal: w.tagRenewal, price: w.tagPrice, todo: w.tagTodo, setup: w.tagSetup } }} />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <Rhythm data={rhythm(subs, today, 6, currency)} w={w} locale={locale} currency={currency} />
        <Upcoming charges={charges} subs={subs} w={w} locale={locale} />
      </div>

      <Reveals items={insights(subs, today)} m={m} locale={locale} currency={currency} />

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2 [&>*]:min-w-0">
        <PaySplit subs={subs} m={m} locale={locale} perYear={w.perYear} />
        <CategoryBars rows={byCategory(subs)} m={m} locale={locale} currency={currency} perYear={w.perYear} />
      </div>

      <Glance subs={liveSubs} m={m} w={w} locale={locale} today={today} />
    </div>
  );
}
