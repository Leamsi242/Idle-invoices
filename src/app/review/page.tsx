import Link from "next/link";
import { getSessionId } from "@/lib/session";
import { listSubscriptions } from "@/lib/store";
import { money } from "@/lib/i18n";
import { getMessages } from "@/lib/locale";
import { LabelQuestion, UsageQuestion } from "@/components/Questions";

export const dynamic = "force-dynamic";

export default async function Review() {
  const { m, locale } = await getMessages();
  const t = m.review;
  const sessionId = await getSessionId();
  const subs = sessionId ? (await listSubscriptions(sessionId)).filter((s) => s.status !== "cancelled") : [];
  if (subs.length === 0) {
    return (
      <p className="rounded-xl bg-white p-6 text-center">
        {t.empty} <Link href="/" className="text-brand underline">{t.emptyLink}</Link>.
      </p>
    );
  }
  const unknown = subs.filter((s) => s.needsLabel);
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t.found(subs.length)}</h1>
      {unknown.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-semibold">{t.nameFirst(unknown.length)}</h2>
          {unknown.map((s) => <LabelQuestion key={s.id} labelKey={s.key} amount={`${money(s.currentAmount, s.currency, locale)} ${m.per[s.frequency]}`} />)}
        </section>
      )}
      <section className="space-y-3">
        <h2 className="font-semibold">{t.stillUsingThem}</h2>
        {subs.map((s) => (
          <article key={s.key} className="space-y-2 rounded-xl bg-white p-4 shadow-sm">
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="font-medium">{s.serviceName}</h3>
              <span className="whitespace-nowrap text-sm text-slate-600">{money(s.currentAmount, s.currency, locale)} {m.per[s.frequency]}</span>
            </div>
            {s.bundle && <p className="text-xs text-slate-500">{t.includes} {s.bundle.join(", ")}</p>}
            <UsageQuestion labelKey={s.key} current={s.usage} />
          </article>
        ))}
      </section>
      <Link href="/report" className="block w-full rounded-xl bg-brand px-4 py-3 text-center font-semibold text-white">{t.seeReport}</Link>
    </div>
  );
}
