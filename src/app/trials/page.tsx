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
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{m.trials.pageTitle}</h1>
      <p className="text-slate-600">{m.trials.pageIntro}</p>
      <TrialForm />
      <TrialList trials={trials} />
    </div>
  );
}
