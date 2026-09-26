import Link from "next/link";
import { getSessionId } from "@/lib/session";
import { getDoubts, getReport, getSources, listAlerts, PAID_WITH_FILE, PAID_WITH_RECEIPTS, type StoredSubscription } from "@/lib/store";
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
import { buttonClass, Card, Eyebrow, Icon, payColor, Pill, SectionTitle } from "@/components/ui";
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
  const sum = rows.reduce((t, [, v]) => t + v, 0);
  if (rows.length === 0) return null;
  const currency = subs[0]?.currency ?? "EUR";
  return (
    <Card className="space-y-4">
      <SectionTitle eyebrow={m.ui.split} title={m.ui.splitHint} />
      <div className="flex h-3 overflow-hidden rounded-full bg-surface-2">
        {rows.map(([name, v], i) => (
          <div key={name} style={{ width: `${(v / sum) * 100}%`, background: payColor(name, i), opacity: active && active !== name ? 0.25 : 1 }} />
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <Link href="/report" className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${!active ? "border-ink bg-ink text-bg" : "border-line bg-surface text-ink-2 hover:border-ink"}`}>
          {m.report.filterAll}
        </Link>
        {rows.map(([name, v], i) => (
          <Link
            key={name}
            href={active === name ? "/report" : `/report?pay=${encodeURIComponent(name)}`}
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition ${active === name ? "border-ink bg-ink text-bg" : "border-line bg-surface text-ink-2 hover:border-ink"}`}
          >
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: payColor(name, i) }} />
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
    <details className={`group rounded-3xl border border-line bg-surface shadow-card transition open:shadow-lg ${stopped ? "opacity-70" : ""}`}>
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
          {!stopped && <ReminderButton reminder={renewalReminder(s.serviceName, s.nextCharge, $(s.currentAmount), s.cancellationUrl, locale)} label={t.remindBefore} />}
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
              <div className="w-full rounded-full" style={{ height: v ? `${8 + (v / max) * 40}px` : "4px", background: v ? "var(--leak)" : "var(--line)", opacity: v ? 0.55 + (v / max) * 0.45 : 1 }} />
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

function Section({ title, subs, note, m, locale, eyebrow }: { title: string; subs: StoredSubscription[]; note?: string; m: Messages; locale: Locale; eyebrow?: string }) {
  if (subs.length === 0) return null;
  return (
    <section className="space-y-3">
      <SectionTitle eyebrow={eyebrow} title={<>{title} <span className="text-muted">{subs.length}</span></>} />
      {note && <p className="text-sm text-muted">{note}</p>}
      <div className="space-y-2.5">
        {subs.map((s) => <CaseFile key={s.id} s={s} m={m} locale={locale} />)}
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
  const [report, doubts, alerts, sources] = sessionId
    ? await Promise.all([getReport(sessionId), getDoubts(sessionId, locale), listAlerts(sessionId), getSources(sessionId)])
    : [null, [], [], []];
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
  return (
    <div className="space-y-6">
      <section className="spotlight grain relative overflow-hidden rounded-[28px] px-6 py-7 text-white sm:px-10 sm:py-10">
        <div className="relative flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60">{u.caseFile}{pay ? ` · ${payName(pay, m)}` : ""}</p>
            <p className="mt-2 text-5xl sm:text-7xl"><BigMoney amount={r.totalYearly} currency={r.currency} locale={locale} /></p>
            <p className="mt-1 text-white/75">{u.perYear} · {u.perMonth(money(r.totalYearly / 12, r.currency, locale))}</p>
            <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm text-white/85">
              <Icon name="spark" className="h-4 w-4" />{u.activeCount(live.length)}
            </p>
          </div>
          <div className="w-full rounded-3xl border border-white/10 bg-white/[0.07] p-5 backdrop-blur sm:w-72">
            <p className="text-sm text-white/70">{t.savings}</p>
            <p className="mt-1 text-4xl text-[#5ef2b8]"><BigMoney amount={r.potentialSavings} currency={r.currency} locale={locale} /></p>
            {unanswered > 0 ? (
              <Link href="/review" className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-white underline decoration-white/30 underline-offset-4">
                {u.savingsHint(unanswered)} <Icon name="arrow" className="h-4 w-4" />
              </Link>
            ) : (
              <p className="mt-3 text-sm text-white/70">{u.savingsFound}</p>
            )}
          </div>
        </div>
      </section>

      <AlertsPanel lines={alerts.map((a) => ({ id: a.id, text: alertLine(a.change, locale), date: formatDate(a.createdAt, locale) }))} />
      <Doubts doubts={doubts} gmail={gmailConfigured()} outlook={outlookConfigured()} banking={bankingConfigured()} />

      <PaySplit subs={report.subscriptions} active={pay} m={m} locale={locale} />

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
          <Section title={t.idle} subs={r.idle} note={t.idleNote} m={m} locale={locale} />
          <Section title={t.forgotten} subs={r.forgotten} m={m} locale={locale} />
          <Section title={t.active} subs={r.active} m={m} locale={locale} />
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
