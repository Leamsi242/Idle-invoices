import Link from "next/link";
import { getSessionId } from "@/lib/session";
import { getDoubts, getReport, type StoredSubscription } from "@/lib/store";
import { Doubts } from "@/components/Doubts";
import { gmailConfigured } from "@/lib/gmail";
import { outlookConfigured } from "@/lib/outlook";
import { bankingConfigured } from "@/lib/banking";
import { DeleteEverythingButton } from "@/components/Questions";
import { ReminderButton } from "@/components/Reminders";
import { TrialList } from "@/components/TrialList";
import { renewalReminder } from "@/lib/ics";
import { cancellationSteps } from "@/lib/cancel-guide";
import { upcomingCharges, type UpcomingCharge } from "@/lib/upcoming";
import { getMessages } from "@/lib/locale";
import { formatDate, money, translateReason, type Locale, type Messages } from "@/lib/i18n";

export const dynamic = "force-dynamic";

function Card({ s, m, locale }: { s: StoredSubscription; m: Messages; locale: Locale }) {
  const t = m.report;
  const $ = (n: number) => money(n, s.currency, locale);
  const d = (iso: string) => formatDate(iso, locale);
  const unmasked = s.matchedSources.filter((x) => x !== "bank").map((x) => t.sources[x]);
  // Currency conversion moves a price by a few cents every month: only real changes are shown.
  const changes = s.priceChanges.filter((p) => Math.abs(p.to - p.from) / p.from >= 0.02);
  return (
    <article className="space-y-2 rounded-xl bg-white p-4 shadow-sm">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="font-medium">{s.serviceName}</h3>
        <span className="whitespace-nowrap font-semibold">{$(s.yearlyCost)}{m.perYearShort}</span>
      </div>
      <p className="text-sm text-slate-600">
        {$(s.currentAmount)} {m.per[s.frequency]} · {t.since} {d(s.firstSeen)} · {t.last} {d(s.lastSeen)}
        {unmasked.length > 0 && <> · {t.unmasked} {unmasked.join(", ")}</>}
      </p>
      {s.status !== "cancelled" && (
        <p className="text-sm text-slate-600">
          {t.nextCharge} <strong>{d(s.nextCharge)}</strong> · {t.paidSoFar} {$(s.totalPaid)}
        </p>
      )}
      {changes.length > 0 && (
        <p className="text-sm text-amber-700">
          {t.priceChanged} {changes.map((p) => t.priceStep($(p.from), $(p.to), d(p.date))).join("; ")}
        </p>
      )}
      {s.bundle && <p className="text-sm text-slate-600">{t.bundle} {s.bundle.join(", ")}</p>}
      {s.cancelledOn && <p className="text-sm text-slate-600">{t.cancelledOn(d(s.cancelledOn), s.endsOn ? d(s.endsOn) : undefined)}</p>}
      {s.forgottenReasons.length > 0 && (
        <ul className="flex flex-wrap gap-1">
          {s.forgottenReasons.map((r) => <li key={r} className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">{translateReason(r, locale)}</li>)}
        </ul>
      )}
      {s.status !== "cancelled" && (
        <details className="rounded-lg bg-slate-50 p-3 text-sm">
          <summary className="cursor-pointer font-medium text-brand">{t.howToCancel}</summary>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-slate-700">
            {cancellationSteps(s.channel, s.serviceName, locale).map((step) => <li key={step}>{step}</li>)}
          </ol>
          {s.cancellationUrl ? (
            <a href={s.cancellationUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block font-medium text-brand underline">{t.accountPage(s.serviceName)}</a>
          ) : (
            <p className="mt-2 text-slate-500">{t.noLink}</p>
          )}
        </details>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="text-slate-500">{t.confidence} {Math.round(s.confidence * 100)}{locale === "fr" ? " %" : "%"}</span>
        {s.status !== "cancelled" && (
          <ReminderButton reminder={renewalReminder(s.serviceName, s.nextCharge, $(s.currentAmount), s.cancellationUrl, locale)} label={t.remindBefore} />
        )}
      </div>
    </article>
  );
}

/** The charges due in the next 30 days: what the user can still stop. */
function NextCharges({ charges, currency, m, locale }: { charges: UpcomingCharge[]; currency: string; m: Messages; locale: Locale }) {
  if (charges.length === 0) return null;
  const t = m.report;
  const total = charges.reduce((sum, c) => sum + c.amount, 0);
  return (
    <section className="space-y-2 rounded-xl bg-white p-4 shadow-sm">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="font-semibold">{t.next30}</h2>
        <span className="font-semibold">{money(total, currency, locale)}</span>
      </div>
      <ul className="divide-y divide-slate-100">
        {charges.map((c, i) => (
          <li key={`${c.key}:${c.date}`} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
            <span className="w-24 shrink-0 text-slate-500">{formatDate(c.date, locale, true)}</span>
            <span className="min-w-0 flex-1 font-medium">
              {c.serviceName}
              {c.kind === "trial" && <span className="ml-1 text-xs text-amber-700">{t.trialEnds}</span>}
              {c.kind === "price-increase" && <span className="ml-1 text-xs text-amber-700">{t.newPrice}</span>}
            </span>
            <span className="whitespace-nowrap">{money(c.amount, c.currency, locale)}</span>
            {/* Buttons on the first charge of each subscription only: a weekly plan shows four times. */}
            {charges.findIndex((x) => x.key === c.key) === i && (
              <span className="flex w-full items-center justify-end gap-3 sm:w-auto">
                {c.cancellationUrl && <a href={c.cancellationUrl} target="_blank" rel="noopener noreferrer" className="text-brand underline">{t.cancel}</a>}
                <ReminderButton reminder={renewalReminder(c.serviceName, c.date, money(c.amount, c.currency, locale), c.cancellationUrl, locale)} label={t.remindMe} />
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function Section({ title, subs, note, m, locale }: { title: string; subs: StoredSubscription[]; note?: string; m: Messages; locale: Locale }) {
  if (subs.length === 0) return null;
  return (
    <section className="space-y-3">
      <h2 className="font-semibold">{title} <span className="text-slate-400">({subs.length})</span></h2>
      {note && <p className="text-sm text-slate-600">{note}</p>}
      {subs.map((s) => <Card key={s.id} s={s} m={m} locale={locale} />)}
    </section>
  );
}

export default async function Report() {
  const { m, locale } = await getMessages();
  const t = m.report;
  const sessionId = await getSessionId();
  const [report, doubts] = sessionId ? await Promise.all([getReport(sessionId), getDoubts(sessionId, locale)]) : [null, []];
  if (!report || report.uploads === 0) {
    return (
      <p className="rounded-xl bg-white p-6 text-center">
        {t.empty} <Link href="/" className="text-brand underline">{t.emptyLink}</Link> {t.emptyEnd}
      </p>
    );
  }
  const r = report;
  const recent = [...r.forgotten, ...r.active, ...r.idle].filter((s) => s.isNew && s.usage !== "yes");
  const unanswered = [...r.forgotten, ...r.active].filter((s) => !s.usage).length;
  const today = new Date().toISOString().slice(0, 10);
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t.title}</h1>
      <Doubts doubts={doubts} gmail={gmailConfigured()} outlook={outlookConfigured()} banking={bankingConfigured()} />
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-600">{t.yearly}</p>
          <p className="text-2xl font-bold">{money(r.totalYearly, r.currency, locale)}</p>
        </div>
        <div className="rounded-xl bg-emerald-50 p-4 shadow-sm">
          <p className="text-sm text-emerald-800">{t.savings}</p>
          <p className="text-2xl font-bold text-emerald-800">{money(r.potentialSavings, r.currency, locale)}</p>
        </div>
      </div>
      <NextCharges charges={upcomingCharges([...r.forgotten, ...r.active, ...r.idle], r.trials, today)} currency={r.currency} m={m} locale={locale} />
      {unanswered > 0 && (
        <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
          {t.unanswered(unanswered)} <Link href="/review" className="underline">{t.answerNow}</Link> {t.answerEnd}
        </p>
      )}
      {recent.length > 0 && (
        <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <strong>{t.recently}</strong> {recent.map((s) => `${s.serviceName} (${money(s.currentAmount, s.currency, locale)} ${m.per[s.frequency]})`).join(", ")}.{" "}
          {t.recentlyWarn(recent.length > 1)}
        </p>
      )}
      <TrialList trials={r.trials} />
      <Section title={t.idle} subs={r.idle} note={t.idleNote} m={m} locale={locale} />
      <Section title={t.forgotten} subs={r.forgotten} m={m} locale={locale} />
      <Section title={t.active} subs={r.active} m={m} locale={locale} />
      <Section title={t.stopped} subs={r.cancelled} note={t.stoppedNote} m={m} locale={locale} />
      <DeleteEverythingButton />
    </div>
  );
}
