import Link from "next/link";
import { getSessionId } from "@/lib/session";
import { getOnboarding } from "@/lib/store";
import { gmailConfigured } from "@/lib/gmail";
import { buildPlan, EMPTY_ANSWERS, gdprRequest, progress } from "@/lib/onboarding";
import { Checklist, OnboardingQuestions } from "@/components/Onboarding";
import { bankingConfigured } from "@/lib/banking";
import { getLocale } from "@/lib/locale";
import { onboardingText } from "@/lib/i18n-onboarding";

export const dynamic = "force-dynamic";
export async function generateMetadata() {
  return { title: onboardingText(await getLocale()).page.metaTitle };
}

export default async function Start({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const q = await searchParams;
  const sessionId = await getSessionId();
  const locale = await getLocale();
  const t = onboardingText(locale).page;
  const { answers, facts } = await getOnboarding(sessionId);
  // getOnboarding builds the plan in English: rebuild it in the page's language.
  const plan = buildPlan(answers ?? EMPTY_ANSWERS, facts, { canConnect: bankingConfigured(), locale });

  if (!answers || q.edit !== undefined) {
    return (
      <div className="space-y-6">
        <section className="space-y-2">
          <h1 className="text-2xl font-bold leading-tight">{t.askTitle}</h1>
          <p className="text-muted">{t.askIntro}</p>
        </section>
        <OnboardingQuestions initial={answers ?? EMPTY_ANSWERS} />
      </div>
    );
  }

  const { done, total } = progress(plan);
  const percent = total ? Math.round((done / total) * 100) : 100;
  const detected = plan.filter((i) => i.detected && i.status !== "done");
  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <h1 className="text-2xl font-bold leading-tight">{t.listTitle}</h1>
        <p className="text-muted">{t.listIntro}</p>
        <div className="rounded-2xl bg-surface p-4 shadow-card">
          <div className="flex items-baseline justify-between text-sm">
            <span className="font-medium">{t.progress(done, total)}</span>
            <span className="text-muted">{percent}%</span>
          </div>
          <div className="mt-2 h-2 rounded-full bg-line" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-2 rounded-full bg-brand" style={{ width: `${percent}%` }} />
          </div>
          {detected.length > 0 && (
            <p className="mt-3 text-sm text-ink-2">
              {t.pointsTo(detected.length, detected.map((i) => i.short).join(", "))}
            </p>
          )}
        </div>
      </section>
      <Checklist plan={plan} ticked={answers.done} gmail={gmailConfigured()} gdpr={gdprRequest("PayPal", t.gdprSince, locale)} banking={bankingConfigured()} />
      <div className="flex flex-wrap gap-3 text-sm">
        <Link href="/advanced#upload" className="rounded-2xl bg-brand px-4 py-3 font-semibold text-on-accent">{t.addFiles}</Link>
        <Link href="/report" className="rounded-2xl border border-line px-4 py-3 font-semibold">{t.seeReport}</Link>
        <Link href="/start?edit" className="px-2 py-3 text-muted underline">{t.changeAnswers}</Link>
      </div>
    </div>
  );
}
