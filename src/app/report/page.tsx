import Link from "next/link";
import { getSessionId } from "@/lib/session";
import { getConnections, getDoubts, getReport, getSources, listAlerts, listWatches, PAID_WITH_FILE, PAID_WITH_RECEIPTS, type StoredSubscription } from "@/lib/store";
import { byCategory, insights, missions, type Insight, type Mission } from "@/lib/insights";
import { CountUp, ScoreRing } from "@/components/Motion";
import { StoppedButton } from "@/components/Questions";
import { buildReport } from "@/lib/engine/flags";
import { AlertsPanel } from "@/components/Watch";
import { alertLine } from "@/lib/notify";
import { Doubts } from "@/components/Doubts";
import { gmailConfigured } from "@/lib/gmail";
import { outlookConfigured } from "@/lib/outlook";
import { bankingConfigured } from "@/lib/banking";
import { DeleteEverythingButton } from "@/components/Questions";
import { ReminderButton } from "@/components/Reminders";
import { TrialList } from "@/components/TrialList";
import { CoverageLine, CoverageTimeline } from "@/components/Coverage";
import { ServiceIcon } from "@/components/ServiceIcon";
import { buttonClass, Card, Eyebrow, Icon, Pill, SectionTitle } from "@/components/ui";
import { renewalReminder } from "@/lib/ics";
import { cancellationSteps } from "@/lib/cancel-guide";
import { upcomingCharges, type UpcomingCharge } from "@/lib/upcoming";
import { getMessages } from "@/lib/locale";
import { daysBetween } from "@/lib/dates";
import { formatDate, money, translateReason, type Locale, type Messages } from "@/lib/i18n";

export const dynamic = "force-dynamic";

const payName = (p: string, m: Messages) => (p === PAID_WITH_FILE ? m.report.viaFile : p === PAID_WITH_RECEIPTS ? m.report.viaReceipts : p);

/** Big money: the euros large, the cents small, like a price tag. */
function BigMoney({ amount, currency, locale }: { amount: number; currency: string; locale: Locale }) {
  const text = money(Math.round(amount), currency, locale).replace(/[.,]00(?=\D*$)/, "");
  return <span className="tabular font-display font-semibold tracking-tight">{text}</span>;
}

/**
 * The yearly spend split by way of paying: one bar, one colored segment per bank, card or PayPal.
 * The legend is the filter: tapping a way of paying narrows the whole case to it.
 */
function PaySplit({ subs, active, m, locale }: { subs: StoredSubscription[]; active?: string; m: Messages; locale: Locale }) {
  const totals = new Map<string, number>();
  for (const s of subs) {
    if (s.status === "cancelled") continue;
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
  const currency = subs[0]?.currency ?? "EUR";
  return (
    <Card className="space-y-4">
      <SectionTitle eyebrow={m.ui.split} title={m.ui.splitHint} />
      <div className="flex h-3 overflow-hidden rounded-full bg-surface-2">
        {rows.map(([name, v], i) => (
          <div key={name} className="grow-x border-r-2 border-surface last:border-r-0" style={{ width: `${(v / sum) * 100}%`, background: color(name), opacity: active && active !== name ? 0.25 : 1, animationDelay: `${i * 90}ms` }} />
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <Link href="/report" className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${!active ? "border-ink bg-ink text-bg" : "border-line bg-surface text-ink-2 hover:border-ink"}`}>
          {m.report.filterAll}
        </Link>
        {rows.map(([name, v]) => (
          <Link
            key={name}
            href={active === name ? "/report" : `/report?pay=${encodeURIComponent(name)}`}
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition ${active === name ? "border-ink bg-ink text-bg" : "border-line bg-surface text-ink-2 hover:border-ink"}`}
          >
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: color(name) }} />
            {payName(name, m)}
            <span className="tabular text-xs opacity-70">{money(Math.round(v), currency, locale).replace(/[.,]00(?=\D*$)/, "")}</span>
          </Link>
        ))}
      </div>
    </Card>
  );
}

/** One subscription as a case file: the headline in one line, everything else one tap away. */
function CaseFile({ s, m, locale }: { s: StoredSubscription; m: Messages; locale: Locale }) {
  const t = m.report;
  const $ = (n: number) => money(n, s.currency, locale);
  const d = (iso: string) => formatDate(iso, locale);
  const unmasked = s.matchedSources.filter((x) => x !== "bank").map((x) => t.sources[x]);
  const changes = s.priceChanges.filter((p) => Math.abs(p.to - p.from) / p.from >= 0.02);
  const stopped = s.status === "cancelled";
  return (
    <details className={`lift group rounded-3xl border border-line bg-surface shadow-card open:shadow-lg ${stopped ? "opacity-70" : ""}`}>
      <summary className="flex items-center gap-3 p-4 sm:gap-4">
        <ServiceIcon name={s.serviceName} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold tracking-tight">{s.serviceName}</p>
          <p className="truncate text-sm text-muted">
            <span className="tabular">{$(s.currentAmount)}</span> {m.per[s.frequency]}
            {s.paidWith?.length ? <> · {s.paidWith.map((p) => payName(p, m)).join(" + ")}</> : null}
          </p>
        </div>
        <div className="text-right">
          <p className="tabular font-semibold">{$(s.yearlyCost)}</p>
          <p className="text-[11px] text-muted">{m.ui.aYear}</p>
        </div>
        <Icon name="chevron" className="chev h-5 w-5 shrink-0 text-muted" />
      </summary>
      {(s.forgottenReasons.length > 0 || changes.length > 0 || unmasked.length > 0) && (
        <div className="-mt-1 flex flex-wrap gap-1.5 px-4 pb-3 sm:pl-[4.5rem]">
          {unmasked.length > 0 && <Pill tone="brand"><Icon name="eye" className="h-3.5 w-3.5" />{t.unmasked} {unmasked.join(", ")}</Pill>}
          {changes.length > 0 && <Pill tone="leak">{t.priceChanged} {$(changes.at(-1)!.to)}</Pill>}
          {s.forgottenReasons.map((r) => <Pill key={r} tone="warn">{translateReason(r, locale)}</Pill>)}
        </div>
      )}
      <div className="space-y-4 border-t border-line px-4 py-4 text-sm sm:pl-[4.5rem]">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
          <div><dt className="text-xs text-muted">{t.since}</dt><dd className="font-medium">{d(s.firstSeen)}</dd></div>
          <div><dt className="text-xs text-muted">{t.last}</dt><dd className="font-medium">{d(s.lastSeen)}</dd></div>
          {!stopped && <div><dt className="text-xs text-muted">{t.nextCharge}</dt><dd className="font-medium">{d(s.nextCharge)}</dd></div>}
          <div><dt className="text-xs text-muted">{t.paidSoFar}</dt><dd className="tabular font-medium">{$(s.totalPaid)}</dd></div>
        </dl>
        {changes.length > 0 && <p className="text-ink-2">{t.priceChanged} {changes.map((p) => t.priceStep($(p.from), $(p.to), d(p.date))).join("; ")}</p>}
        {s.bundle && <p className="text-ink-2">{t.bundle} {s.bundle.join(", ")}</p>}
        {s.cancelledOn && <p className="text-ink-2">{t.cancelledOn(d(s.cancelledOn), s.endsOn ? d(s.endsOn) : undefined)}</p>}
        {!stopped && (
          <div className="rounded-2xl bg-surface-2 p-4">
            <p className="font-medium">{t.howToCancel}</p>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-ink-2">
              {cancellationSteps(s.channel, s.serviceName, locale).map((step) => <li key={step}>{step}</li>)}
            </ol>
            {s.cancellationUrl ? (
              <a href={s.cancellationUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1 font-medium text-brand">
                {t.accountPage(s.serviceName)} <Icon name="arrow" className="h-4 w-4 -rotate-45" />
              </a>
            ) : (
              <p className="mt-2 text-muted">{t.noLink}</p>
            )}
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-muted">
            {t.confidence}
            <span className="h-1.5 w-20 overflow-hidden rounded-full bg-surface-2">
              <span className="block h-full rounded-full bg-brand" style={{ width: `${Math.round(s.confidence * 100)}%` }} />
            </span>
            {Math.round(s.confidence * 100)}{locale === "fr" ? " %" : "%"}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {!stopped && s.usage !== "stopped" && <ReminderButton reminder={renewalReminder(s.serviceName, s.nextCharge, $(s.currentAmount), s.cancellationUrl, locale)} label={t.remindBefore} />}
            {(!stopped || s.usage === "stopped") && <StoppedButton labelKey={s.key} stopped={s.usage === "stopped"} />}
          </div>
        </div>
      </div>
    </details>
  );
}

/**
 * The next 30 days as a strip of days (a dot where money goes out, bigger for more money), then
 * the list. Buttons only on each subscription's first charge.
 */
function Agenda({ charges, currency, today, m, locale }: { charges: UpcomingCharge[]; currency: string; today: string; m: Messages; locale: Locale }) {
  if (charges.length === 0) return null;
  const t = m.report;
  const total = charges.reduce((sum, c) => sum + c.amount, 0);
  const byDay = new Map<number, number>();
  for (const c of charges) {
    const i = daysBetween(today, c.date);
    byDay.set(i, (byDay.get(i) ?? 0) + c.amount);
  }
  const max = Math.max(...byDay.values());
  return (
    <Card className="space-y-4">
      <SectionTitle eyebrow={m.ui.agenda} title={t.next30} aside={<span className="tabular font-display text-xl font-semibold">{money(total, currency, locale)}</span>} />
      <div className="grid grid-cols-[repeat(30,minmax(0,1fr))] items-end gap-[3px]" aria-hidden>
        {Array.from({ length: 30 }, (_, i) => {
          const v = byDay.get(i) ?? 0;
          return (
            <div key={i} className="flex flex-col items-center gap-1">
              <div className="grow-y w-full rounded-full" style={{ height: v ? `${8 + (v / max) * 40}px` : "4px", background: v ? "var(--leak)" : "var(--line)", opacity: v ? 0.55 + (v / max) * 0.45 : 1, animationDelay: `${i * 18}ms` }} />
            </div>
          );
        })}
      </div>
      <ul className="divide-y divide-line">
        {charges.map((c, i) => {
          const first = charges.findIndex((x) => x.key === c.key) === i;
          return (
            <li key={`${c.key}:${c.date}`} className="flex items-center gap-3 py-2.5 text-sm">
              <span className="w-[4.5rem] shrink-0 text-xs text-muted">{formatDate(c.date, locale, true)}</span>
              <ServiceIcon name={c.serviceName} size="sm" />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{c.serviceName}</span>
                {c.kind !== "renewal" ? (
                  <span className={`text-xs ${c.kind === "trial" ? "text-ink-2" : "text-leak"}`}>{c.kind === "trial" ? t.trialEnds : t.newPrice}</span>
                ) : first && c.cancellationUrl ? (
                  <a href={c.cancellationUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-brand">{t.cancel}</a>
                ) : null}
              </span>
              <span className="tabular font-semibold">{money(c.amount, c.currency, locale)}</span>
              {first ? (
                <ReminderButton compact reminder={renewalReminder(c.serviceName, c.date, money(c.amount, c.currency, locale), c.cancellationUrl, locale)} label={t.remindMe} />
              ) : (
                <span className="w-8" />
              )}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

/** The next move and the steps to a solved case: one clear thing to do, and progress to see. */
function NextMove({ steps, next, m, locale, currency }: { steps: Mission[]; next?: Mission; m: Messages; locale: Locale; currency: string }) {
  const u = m.ui;
  const label = (x: Mission) =>
    x.id === "bank" ? u.missionBank
    : x.id === "mail" ? u.missionMail
    : x.id === "name" ? u.missionName(x.count ?? 0)
    : x.id === "answer" ? u.missionAnswer(x.count ?? 0)
    : x.id === "idle" ? u.missionIdle(x.count ?? 0, money(x.amount ?? 0, currency, locale))
    : u.missionWatch;
  return (
    <Card className="space-y-4">
      <SectionTitle eyebrow={u.nextAction} title={next ? label(next) : u.missionDone} aside={next && <Link href={next.href} className={`${buttonClass.small} pulse`}>{u.go} <Icon name="arrow" className="h-4 w-4" /></Link>} />
      <ol className="grid gap-2 sm:grid-cols-2">
        {steps.map((x, i) => (
          <li key={x.id} className={`rise flex items-center gap-3 rounded-2xl px-3 py-2 text-sm ${x === next ? "bg-brand-soft font-medium text-ink" : "text-muted"}`} style={{ animationDelay: `${i * 70}ms` }}>
            <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${x.done ? "bg-save text-white" : x === next ? "bg-brand text-white" : "border border-line"}`}>
              {x.done ? <Icon name="check" className="h-3.5 w-3.5" /> : <span className="text-[11px]">{i + 1}</span>}
            </span>
            <span className={x.done ? "line-through decoration-line" : ""}>{label(x)}</span>
          </li>
        ))}
      </ol>
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
  const $ = (n: number, d = 0) => new Intl.NumberFormat(locale === "fr" ? "fr-FR" : "en-GB", { style: "currency", currency, maximumFractionDigits: d, minimumFractionDigits: d }).format(n);
  const card = (x: Insight): { big: string; text: string; tone: string } => {
    switch (x.kind) {
      case "daily": return { big: $(x.amount, 2), text: u.insightDaily($(x.amount, 2)), tone: "text-leak" };
      case "lifetime": return { big: $(x.amount), text: u.insightLifetime($(x.amount), formatDate(x.since, locale)), tone: "text-ink" };
      case "rises": return { big: `+${$(x.amount)}`, text: u.insightRises($(x.amount), x.count), tone: "text-leak" };
      case "overlap": return { big: `${x.count} × ${u.categories[x.category] ?? x.category}`, text: u.insightOverlap(x.count, u.categories[x.category] ?? x.category, $(x.amount)), tone: "text-brand" };
      case "oldest": return { big: `${x.months} ${locale === "fr" ? "mois" : "months"}`, text: u.insightOldest(x.name, x.months), tone: "text-brand" };
      case "renewal": return { big: $(x.amount), text: u.insightRenewal(x.name, $(x.amount, 2), formatDate(x.date, locale)), tone: "text-leak" };
      case "fiveYears": return { big: $(x.amount), text: u.insightFiveYears($(x.amount)), tone: "text-save" };
    }
  };
  return (
    <section className="space-y-3">
      <SectionTitle eyebrow={u.reveals} title={u.reveals} />
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
function CategoryBars({ rows, m, locale, currency }: { rows: { category: string; amount: number; count: number }[]; m: Messages; locale: Locale; currency: string }) {
  if (rows.length === 0) return null;
  const top = rows.slice(0, 6);
  const rest = rows.slice(6).reduce((t, r) => ({ amount: t.amount + r.amount, count: t.count + r.count }), { amount: 0, count: 0 });
  const shown = rest.count ? [...top, { category: "other", ...rest }] : top;
  const max = Math.max(...shown.map((r) => r.amount));
  return (
    <Card className="space-y-4">
      <SectionTitle eyebrow={m.ui.byCategory} title={m.ui.byCategory} />
      <ul className="space-y-3">
        {shown.map((r, i) => (
          <li key={r.category} className="space-y-1">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="font-medium first-letter:uppercase">{m.ui.categories[r.category] ?? r.category} <span className="font-normal text-muted">· {r.count}</span></span>
              <span className="tabular font-semibold">{money(Math.round(r.amount), currency, locale).replace(/[.,]00(?=\D*$)/, "")}</span>
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

function Section({ id, title, subs, note, m, locale, eyebrow }: { id?: string; title: string; subs: StoredSubscription[]; note?: string; m: Messages; locale: Locale; eyebrow?: string }) {
  if (subs.length === 0) return null;
  return (
    <section id={id} className="scroll-mt-24 space-y-3">
      <SectionTitle eyebrow={eyebrow} title={<>{title} <span className="text-muted">{subs.length}</span></>} />
      {note && <p className="text-sm text-muted">{note}</p>}
      <div className="space-y-2.5">
        {subs.map((s, i) => (
          <div key={s.id} className="rise" style={{ animationDelay: `${Math.min(i, 8) * 60}ms` }}>
            <CaseFile s={s} m={m} locale={locale} />
          </div>
        ))}
      </div>
    </section>
  );
}

export default async function Report({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const pay = (await searchParams).pay;
  const { m, locale } = await getMessages();
  const t = m.report;
  const u = m.ui;
  const sessionId = await getSessionId();
  const [report, doubts, alerts, sources, connections, watches] = sessionId
    ? await Promise.all([getReport(sessionId), getDoubts(sessionId, locale), listAlerts(sessionId), getSources(sessionId), getConnections(sessionId), listWatches(sessionId)])
    : [null, [], [], [], null, []];
  if (!report || report.uploads === 0) {
    return (
      <section className="spotlight grain relative overflow-hidden rounded-[28px] px-6 py-12 text-center text-white">
        <Icon name="lens" className="mx-auto h-10 w-10 text-white/80" />
        <p className="mx-auto mt-4 max-w-md text-lg">{t.empty}</p>
        <Link href="/" className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 font-semibold text-night">
          {t.emptyLink} <Icon name="arrow" className="h-4 w-4" />
        </Link>
      </section>
    );
  }
  // Filtered on one way of paying: every section, total and upcoming charge follows.
  const shown = pay ? report.subscriptions.filter((s) => s.paidWith?.includes(pay)) : report.subscriptions;
  const r = pay ? { ...report, ...buildReport(shown) } : report;
  const live = shown.filter((s) => s.status !== "cancelled");
  const recent = [...r.forgotten, ...r.active, ...r.idle].filter((s) => s.isNew && s.usage !== "yes");
  const unanswered = [...r.forgotten, ...r.active].filter((s) => !s.usage).length;
  const today = new Date().toISOString().slice(0, 10);
  const all = report.subscriptions.filter((s) => s.usage !== "stopped");
  const mission = missions({
    banks: connections?.banks.length ?? 0,
    mailboxes: connections?.mailboxes.length ?? 0,
    unnamed: all.filter((s) => s.needsLabel && s.status !== "cancelled").length,
    unanswered: all.filter((s) => s.status !== "cancelled" && !s.usage).length,
    idle: all.filter((s) => s.status === "idle"),
    watching: watches.length > 0,
  });
  const revealed = insights(shown, today);
  return (
    <div className="space-y-6">
      <section className="spotlight grain sweep relative overflow-hidden rounded-[28px] px-6 py-7 text-white sm:px-10 sm:py-10">
        <div className="relative flex flex-wrap items-center justify-between gap-6">
          <div className="rise">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60">{u.caseFile}{pay ? ` · ${payName(pay, m)}` : ""}</p>
            <p className="mt-2 font-display text-5xl font-semibold tracking-tight sm:text-7xl">
              <CountUp id={`yearly-${pay ?? "all"}`} value={Math.round(r.totalYearly)} locale={locale} currency={r.currency} />
            </p>
            <p className="mt-1 text-white/75">{u.perYear} · {u.perMonth(money(r.totalYearly / 12, r.currency, locale))} · {u.perDay(money(r.totalYearly / 365, r.currency, locale))}</p>
            <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm text-white/85">
              <Icon name="spark" className="h-4 w-4" />{u.activeCount(live.filter((s) => s.usage !== "stopped").length)}
            </p>
          </div>
          <div className="rise flex w-full items-center gap-5 rounded-3xl border border-white/10 bg-white/[0.07] p-5 backdrop-blur sm:w-auto" style={{ animationDelay: "120ms" }}>
            <ScoreRing value={mission.score} label={u.mastery} />
            <div className="space-y-3">
              <div>
                <p className="text-xs text-white/60">{u.saved}</p>
                <p className="font-display text-2xl font-semibold text-[#5ef2b8]"><CountUp id="saved" value={Math.round(r.savedYearly)} locale={locale} currency={r.currency} /></p>
              </div>
              <div>
                <p className="text-xs text-white/60">{t.savings}</p>
                <p className="font-display text-2xl font-semibold"><CountUp id={`savings-${pay ?? "all"}`} value={Math.round(r.potentialSavings)} locale={locale} currency={r.currency} /></p>
                {unanswered > 0 && (
                  <Link href="/review" className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-white/85 underline decoration-white/30 underline-offset-4">
                    {u.savingsHint(unanswered)} <Icon name="arrow" className="h-3.5 w-3.5" />
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
        <p className="relative mt-5 text-sm text-white/70">{u.masteryTitle(mission.score)}</p>
      </section>

      {!pay && <NextMove steps={mission.steps} next={mission.next} m={m} locale={locale} currency={r.currency} />}

      <AlertsPanel lines={alerts.map((a) => ({ id: a.id, text: alertLine(a.change, locale), date: formatDate(a.createdAt, locale) }))} />
      <Doubts doubts={doubts} gmail={gmailConfigured()} outlook={outlookConfigured()} banking={bankingConfigured()} />

      <Reveals items={revealed} m={m} locale={locale} currency={r.currency} />

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2 [&>*]:min-w-0">
        <PaySplit subs={report.subscriptions} active={pay} m={m} locale={locale} />
        <CategoryBars rows={byCategory(shown)} m={m} locale={locale} currency={r.currency} />
      </div>

      {recent.length > 0 && (
        <p className="flex gap-3 rounded-3xl border border-leak/30 bg-leak-soft p-4 text-sm text-ink">
          <Icon name="bell" className="h-5 w-5 shrink-0 text-leak" />
          <span>
            <strong>{t.recently}</strong> {recent.map((s) => `${s.serviceName} (${money(s.currentAmount, s.currency, locale)} ${m.per[s.frequency]})`).join(", ")}. {t.recentlyWarn(recent.length > 1)}
          </span>
        </p>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-start">
        <div className="min-w-0 space-y-6">
          <Section id="idle" title={t.idle} subs={r.idle} note={t.idleNote} m={m} locale={locale} />
          <Section title={t.forgotten} subs={r.forgotten} m={m} locale={locale} />
          <Section title={t.active} subs={r.active} m={m} locale={locale} />
          <Section title={u.stoppedTitle} subs={r.stopped} note={u.stoppedNote} m={m} locale={locale} />
          <Section title={t.stopped} subs={r.cancelled} note={t.stoppedNote} m={m} locale={locale} />
        </div>
        <aside className="min-w-0 space-y-6 lg:sticky lg:top-20">
          <Agenda charges={upcomingCharges([...r.forgotten, ...r.active, ...r.idle], r.trials, today)} currency={r.currency} today={today} m={m} locale={locale} />
          <TrialList trials={r.trials} />
          {sources.length > 0 && (
            <Card className="space-y-5">
              <SectionTitle title={u.coverage} />
              <p className="text-sm text-muted">{u.coverageIntro}</p>
              <CoverageTimeline sources={sources} m={m} locale={locale} />
              <div className="space-y-4">
                {sources.map((x) => <CoverageLine key={`${x.kind}:${x.name}`} s={x} m={m} locale={locale} />)}
              </div>
            </Card>
          )}
        </aside>
      </div>

      <DeleteEverythingButton />
    </div>
  );
}
