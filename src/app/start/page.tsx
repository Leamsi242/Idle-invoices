import Link from "next/link";
import { getSessionId } from "@/lib/session";
import { getOnboarding } from "@/lib/store";
import { gmailConfigured } from "@/lib/gmail";
import { EMPTY_ANSWERS, gdprRequest, progress } from "@/lib/onboarding";
import { Checklist, OnboardingQuestions } from "@/components/Onboarding";

export const dynamic = "force-dynamic";
export const metadata = { title: "Import checklist · Subscription Detective" };

export default async function Start({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const q = await searchParams;
  const sessionId = await getSessionId();
  const { answers, plan } = await getOnboarding(sessionId);

  if (!answers || q.edit !== undefined) {
    return (
      <div className="space-y-6">
        <section className="space-y-2">
          <h1 className="text-2xl font-bold leading-tight">Advanced: what to import by hand</h1>
          <p className="text-slate-600">
            Only needed when a bank or mailbox cannot be connected. Four questions about how you pay give a checklist of files to add, with
            the steps for each one. No password, no account number.
          </p>
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
        <h1 className="text-2xl font-bold leading-tight">Your import checklist</h1>
        <p className="text-slate-600">
          The more sources you add, the more hidden charges we can name. Items are ticked automatically when the matching file is read.
        </p>
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <div className="flex items-baseline justify-between text-sm">
            <span className="font-medium">{done} of {total} sources added</span>
            <span className="text-slate-500">{percent}%</span>
          </div>
          <div className="mt-2 h-2 rounded-full bg-slate-200" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-2 rounded-full bg-brand" style={{ width: `${percent}%` }} />
          </div>
          {detected.length > 0 && (
            <p className="mt-3 text-sm text-amber-800">
              Your statements point to {detected.length === 1 ? "a source" : "sources"} you did not mention: {detected.map((i) => i.title.split(":")[0]).join(", ")}.
            </p>
          )}
        </div>
      </section>
      <Checklist plan={plan} ticked={answers.done} gmail={gmailConfigured()} gdpr={gdprRequest("PayPal", "the opening of my account")} />
      <div className="flex flex-wrap gap-3 text-sm">
        <Link href="/advanced#upload" className="rounded-xl bg-brand px-4 py-3 font-semibold text-white">Add files</Link>
        <Link href="/report" className="rounded-xl border border-slate-300 px-4 py-3 font-semibold">See my report</Link>
        <Link href="/start?edit" className="px-2 py-3 text-slate-600 underline">Change my answers</Link>
      </div>
    </div>
  );
}
