import Link from "next/link";
import { getSessionId } from "@/lib/session";
import { listSubscriptions } from "@/lib/store";
import { money } from "@/lib/i18n";
import { getMessages } from "@/lib/locale";
import { LabelQuestion, UsageQuestion } from "@/components/Questions";
import { ServiceIcon } from "@/components/ServiceIcon";
import { buttonClass, Icon, SectionTitle } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function Review() {
  const { m, locale } = await getMessages();
  const t = m.review;
  const sessionId = await getSessionId();
  const subs = sessionId ? (await listSubscriptions(sessionId)).filter((s) => s.status !== "cancelled") : [];
  if (subs.length === 0) {
    return (
      <p className="rounded-3xl border border-line bg-surface p-8 text-center shadow-card">
        {t.empty} <Link href="/" className="font-medium text-brand">{t.emptyLink}</Link>.
      </p>
    );
  }
  const unknown = subs.filter((s) => s.needsLabel);
  const answered = subs.filter((s) => s.usage).length;
  const pct = Math.round((answered / subs.length) * 100);
  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <section className="space-y-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">{m.nav.review}</p>
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">{t.found(subs.length)}</h1>
        <div className="space-y-1.5">
          <div className="h-2 overflow-hidden rounded-full bg-surface-2">
            <div className="h-full rounded-full bg-gradient-to-r from-brand to-brand-2 transition-all" style={{ width: `${pct}%` }} />
          </div>
          <p className="tabular text-sm text-muted">{answered} / {subs.length}</p>
        </div>
      </section>
      {unknown.length > 0 && (
        <section className="space-y-3">
          <SectionTitle title={t.nameFirst(unknown.length)} />
          {unknown.map((s) => <LabelQuestion key={s.id} labelKey={s.key} amount={`${money(s.currentAmount, s.currency, locale)} ${m.per[s.frequency]}`} />)}
        </section>
      )}
      <section className="space-y-3">
        <SectionTitle title={t.stillUsingThem} />
        {subs.map((s) => (
          <article key={s.id} className={`space-y-4 rounded-3xl border bg-surface p-5 shadow-card ${s.usage ? "border-line opacity-80" : "border-line"}`}>
            <div className="flex items-center gap-3">
              <ServiceIcon name={s.serviceName} size="lg" />
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-lg font-semibold tracking-tight">{s.serviceName}</h3>
                <p className="tabular text-sm text-muted">{money(s.currentAmount, s.currency, locale)} {m.per[s.frequency]} · {money(s.yearlyCost, s.currency, locale)} {m.ui.aYear}</p>
              </div>
              {s.usage && <Icon name="check" className="h-5 w-5 text-save" />}
            </div>
            {s.bundle && <p className="text-xs text-muted">{t.includes} {s.bundle.join(", ")}</p>}
            <UsageQuestion labelKey={s.key} current={s.usage} />
          </article>
        ))}
      </section>
      <Link href="/report" className={`${buttonClass.primary} w-full py-4`}>{t.seeReport} <Icon name="arrow" className="h-5 w-5" /></Link>
    </div>
  );
}
