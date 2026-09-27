import Link from "next/link";
import { getSessionId } from "@/lib/session";
import { getReport, PAID_WITH_FILE, PAID_WITH_RECEIPTS, type StoredSubscription } from "@/lib/store";
import { getMessages } from "@/lib/locale";
import { v3, type V3 } from "@/lib/i18n-v3";
import { formatDate, money, translateReason, type Locale, type Messages } from "@/lib/i18n";
import { monthly, refOf, statusOf, typeOf } from "@/lib/engagements";
import { cancellationSteps } from "@/lib/cancel-guide";
import { renewalReminder } from "@/lib/ics";
import { projectedNext } from "@/lib/upcoming";
import { ServiceIcon } from "@/components/ServiceIcon";
import { SubsTable, type SubRow } from "@/components/SubsTable";
import { Decisions, LabelQuestion } from "@/components/Questions";
import { ReminderButton } from "@/components/Reminders";
import { Drawer } from "@/components/Drawer";
import { Icon, Pill } from "@/components/ui";

export const dynamic = "force-dynamic";

const payName = (p: string, m: Messages) => (p === PAID_WITH_FILE ? m.report.viaFile : p === PAID_WITH_RECEIPTS ? m.report.viaReceipts : p);

/** The detail of one subscription, as a panel over the table: the proof, then the decision. */
function Detail({ s, m, w, locale, today }: { s: StoredSubscription; m: Messages; w: V3; locale: Locale; today: string }) {
  const t = m.report;
  const $ = (n: number) => money(n, s.currency, locale);
  const status = statusOf(s);
  const ended = s.status === "cancelled";
  const source = (x: string) => m.report.sources[x] ?? x;
  const next = projectedNext(s, today);
  const confirmed = s.nextConfirmed && next === s.nextCharge;
  return (
    <Drawer closeHref="/subscriptions" label={s.serviceName} closeLabel={w.close}>
        <div className="flex items-start justify-between gap-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">{w.nav.subs}</p>
          <Link href="/subscriptions" scroll={false} className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-ink-2 hover:border-ink" aria-label={w.close}><span aria-hidden>✕</span></Link>
        </div>
        <div className="flex items-center gap-4">
          <ServiceIcon name={s.serviceName} size="lg" />
          <div className="min-w-0">
            <h2 className="truncate font-display text-2xl font-semibold tracking-tight">{s.serviceName}</h2>
            <p className="text-sm text-muted">{w.types[typeOf(s)]}{s.paidWith?.length ? ` · ${s.paidWith.map((p) => payName(p, m)).join(" + ")}` : ""}</p>
          </div>
        </div>
        <p>
          <span className="tabular font-display text-4xl font-semibold tracking-tight">{$(monthly(s))}</span>
          <span className="text-sm text-muted"> {w.perMonth} · {$(s.yearlyCost)} {m.ui.aYear}</span>
        </p>
        <dl className="grid grid-cols-2 gap-2 text-sm">
          {[
            [w.status, w.statuses[status]],
            [w.nextDue, ended ? w.statuses[status] : formatDate(next, locale)],
            [w.dateKind, ended ? w.statuses[status] : confirmed ? w.confirmed : w.estimated],
            [w.detection, `${Math.round(s.confidence * 100)}${locale === "fr" ? " %" : "%"}`],
          ].map(([k, v]) => (
            <div key={k} className="rounded-2xl border border-line p-3">
              <dt className="text-[10px] font-semibold uppercase tracking-widest text-muted">{k}</dt>
              <dd className="mt-1 font-medium">{v}</dd>
            </div>
          ))}
        </dl>

        <section className="space-y-3 rounded-3xl bg-brand-soft/60 p-4">
          <p className="flex items-center gap-2 font-semibold"><Icon name="shield" className="h-4 w-4 text-brand" />{w.why}</p>
          <p className="text-sm text-ink-2">{w.whyText(s.chargeCount, m.doubts.every[s.frequency])}</p>
          {(s.matchedSources.some((x) => x !== "bank") || s.forgottenReasons.length > 0) && (
            <div className="flex flex-wrap gap-1.5">
              {s.matchedSources.filter((x) => x !== "bank").map((x) => <Pill key={x} tone="brand"><Icon name="eye" className="h-3.5 w-3.5" />{t.unmasked} {source(x)}</Pill>)}
              {s.forgottenReasons.map((r) => <Pill key={r} tone="warn">{translateReason(r, locale)}</Pill>)}
            </div>
          )}
          {!!s.charges?.length && (
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-muted">{w.lastPayments}</p>
              <ul className="divide-y divide-line/70 text-sm">
                {s.charges.slice(0, 6).map((c) => (
                  <li key={`${c.date}:${c.amount}:${c.source}`} className="flex items-center justify-between py-1.5">
                    <span className="tabular">{formatDate(c.date, locale)} <span className="text-xs text-muted">· {source(c.source)}</span></span>
                    <span className="tabular font-medium">{$(c.amount)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {s.needsLabel && (
          <section className="space-y-2">
            <p className="font-semibold">{w.nameIt}</p>
            <LabelQuestion labelKey={s.key} amount={`${$(s.currentAmount)} ${m.per[s.frequency]}`} />
          </section>
        )}

        <section className="space-y-3">
          <p className="font-semibold">{w.decide}</p>
          <Decisions labelKey={s.key} usage={s.usage} t={{ keep: w.keep, notUsed: w.notUsed, cancelled: w.cancelled, notSub: w.notSub, undo: w.undo }} />
        </section>

        {!ended && s.usage !== "notsub" && (
          <details className="rounded-2xl bg-surface-2 p-4 text-sm">
            <summary className="flex items-center gap-1 font-medium"><Icon name="chevron" className="chev h-4 w-4" />{t.howToCancel}</summary>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-ink-2">
              {cancellationSteps(s.channel, s.serviceName, locale).map((step) => <li key={step}>{step}</li>)}
            </ol>
            {s.cancellationUrl && (
              <a href={s.cancellationUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1 font-medium text-brand">
                {t.accountPage(s.serviceName)} <Icon name="arrow" className="h-4 w-4 -rotate-45" />
              </a>
            )}
          </details>
        )}
        {!ended && s.usage !== "stopped" && s.usage !== "notsub" && (
          <ReminderButton reminder={renewalReminder(s.serviceName, next, $(s.currentAmount), s.cancellationUrl, locale)} label={t.remindBefore} />
        )}
        <p className="mt-auto text-xs text-muted">{w.legal}</p>
    </Drawer>
  );
}

export default async function Subscriptions({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const q = await searchParams;
  const { m, locale } = await getMessages();
  const w = v3(locale);
  const sessionId = await getSessionId();
  const report = sessionId ? await getReport(sessionId) : null;
  const subs = report?.subscriptions ?? [];
  const today = new Date().toISOString().slice(0, 10);
  const rows: SubRow[] = subs.map((s) => {
    const status = statusOf(s);
    const next = projectedNext(s, today);
    const ended = status === "ended" || status === "stopped" || status === "hidden";
    return {
      id: refOf(s),
      name: s.serviceName,
      sub: `${money(s.currentAmount, s.currency, locale)} ${m.per[s.frequency]}${s.paidWith?.length ? ` · ${s.paidWith.map((p) => payName(p, m)).join(" + ")}` : ""}`,
      icon: <ServiceIcon name={s.serviceName} />,
      type: w.types[typeOf(s)],
      status,
      statusLabel: w.statuses[status],
      monthly: monthly(s),
      monthlyText: money(monthly(s), s.currency, locale),
      yearlyText: money(s.yearlyCost, s.currency, locale),
      next: ended ? undefined : next,
      nextText: ended ? undefined : formatDate(next, locale),
      nextKind: ended ? undefined : s.nextConfirmed && next === s.nextCharge ? w.confirmed : w.estimated,
      paidWith: (s.paidWith ?? []).map((p) => payName(p, m)),
    };
  });
  const open = q.open ? subs.find((s) => refOf(s) === q.open) : undefined;
  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">{w.nav.subs}</p>
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">{w.subsTitle}</h1>
        <p className="text-muted">{w.subsIntro}</p>
      </section>
      {subs.length === 0 ? (
        <p className="rounded-3xl border border-line bg-surface p-8 text-center shadow-card">
          {m.review.empty} <Link href="/" className="font-medium text-brand">{m.review.emptyLink}</Link>.
        </p>
      ) : (
        <SubsTable rows={rows} t={{ search: w.search, paidWith: m.report.paidWith, allWays: w.allWays, filters: w.filters, sorts: w.sorts, sortBy: w.sortBy, cols: w.cols, noMatch: w.noMatch, perMonth: w.perMonth }} />
      )}
      {open && <Detail s={open} m={m} w={w} locale={locale} today={today} />}
    </div>
  );
}
