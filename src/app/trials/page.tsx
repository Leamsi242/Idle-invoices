import type { Metadata } from "next";
import { getSessionId } from "@/lib/session";
import { listTrackedTrials } from "@/lib/store";
import { getMessages } from "@/lib/locale";
import { TrialForm } from "@/components/Reminders";
import { TrialList } from "@/components/TrialList";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { m } = await getMessages();
  return { title: `${m.trials.pageTitle} · Subscription Detective` };
}

export default async function Trials() {
  const { m } = await getMessages();
  const sessionId = await getSessionId();
  const today = new Date().toISOString().slice(0, 10);
  const trials = sessionId ? (await listTrackedTrials(sessionId)).filter((t) => t.startsCharging >= today) : [];
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <section className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">{m.nav.trials}</p>
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">{m.trials.pageTitle}</h1>
        <p className="text-muted">{m.trials.pageIntro}</p>
      </section>
      <TrialForm />
      <TrialList trials={trials} />
    </div>
  );
}
