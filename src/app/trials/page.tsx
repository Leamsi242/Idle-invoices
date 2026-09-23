import { getSessionId } from "@/lib/session";
import { listTrackedTrials } from "@/lib/store";
import { TrialForm } from "@/components/Reminders";
import { TrialList } from "@/components/TrialList";

export const dynamic = "force-dynamic";
export const metadata = { title: "Free trials · Subscription Detective" };

export default async function Trials() {
  const sessionId = await getSessionId();
  const today = new Date().toISOString().slice(0, 10);
  const trials = sessionId ? (await listTrackedTrials(sessionId)).filter((t) => t.startsCharging >= today) : [];
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Free trials</h1>
      <p className="text-slate-600">
        Most forgotten subscriptions start as a free trial. Note it here when you sign up, and add a reminder to your calendar so the first
        charge never surprises you.
      </p>
      <TrialForm />
      <TrialList trials={trials} />
    </div>
  );
}
