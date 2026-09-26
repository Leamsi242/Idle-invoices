import Link from "next/link";
import { getSessionId } from "@/lib/session";
import { getDoubts, getReport, type StoredSubscription } from "@/lib/store";
import { Doubts } from "@/components/Doubts";
import { gmailConfigured } from "@/lib/gmail";
import { outlookConfigured } from "@/lib/outlook";
import { bankingConfigured } from "@/lib/banking";
import { money, FREQUENCY_LABEL } from "@/lib/format";
import { DeleteEverythingButton } from "@/components/Questions";
import { ReminderButton } from "@/components/Reminders";
import { TrialList } from "@/components/TrialList";
import { renewalReminder } from "@/lib/ics";
import { cancellationSteps } from "@/lib/cancel-guide";

export const dynamic = "force-dynamic";

const SOURCE_LABEL: Record<string, string> = { paypal: "PayPal", apple: "Apple", google: "Google Play", email: "receipt" };

function Card({ s }: { s: StoredSubscription }) {
  const unmasked = s.matchedSources.filter((x) => x !== "bank").map((x) => SOURCE_LABEL[x]);
  return (
    <article className="space-y-2 rounded-xl bg-white p-4 shadow-sm">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="font-medium">{s.serviceName}</h3>
        <span className="whitespace-nowrap font-semibold">{money(s.yearlyCost, s.currency)}/yr</span>
      </div>
      <p className="text-sm text-slate-600">
        {money(s.currentAmount, s.currency)} {FREQUENCY_LABEL[s.frequency]} · since {s.firstSeen} · last {s.lastSeen}
        {unmasked.length > 0 && <> · unmasked via {unmasked.join(", ")}</>}
      </p>
      {s.status !== "cancelled" && (
        <p className="text-sm text-slate-600">
          Next charge around <strong>{s.nextCharge}</strong> · paid so far {money(s.totalPaid, s.currency)}
        </p>
      )}
      {s.priceChanges.length > 0 && (
        <p className="text-sm text-amber-700">
          Price went up: {s.priceChanges.map((p) => `${money(p.from, s.currency)} to ${money(p.to, s.currency)} on ${p.date}`).join("; ")}
        </p>
      )}
      {s.bundle && <p className="text-sm text-slate-600">Bundle, counted once: {s.bundle.join(", ")}</p>}
      {s.cancelledOn && (
        <p className="text-sm text-slate-600">Cancelled on {s.cancelledOn}{s.endsOn ? `, access ends on ${s.endsOn}` : ""}.</p>
      )}
      {s.forgottenReasons.length > 0 && (
        <ul className="flex flex-wrap gap-1">
          {s.forgottenReasons.map((r) => <li key={r} className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">{r}</li>)}
        </ul>
      )}
      {s.status !== "cancelled" && (
        <details className="rounded-lg bg-slate-50 p-3 text-sm">
          <summary className="cursor-pointer font-medium text-brand">How to cancel</summary>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-slate-700">
            {cancellationSteps(s.channel, s.serviceName).map((step) => <li key={step}>{step}</li>)}
          </ol>
          {s.cancellationUrl ? (
            <a href={s.cancellationUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block font-medium text-brand underline">{s.serviceName} account page ↗</a>
          ) : (
            <p className="mt-2 text-slate-500">No cancellation link for this service yet.</p>
          )}
        </details>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="text-slate-500">Confidence {Math.round(s.confidence * 100)}%</span>
        {s.status !== "cancelled" && (
          <ReminderButton reminder={renewalReminder(s.serviceName, s.nextCharge, money(s.currentAmount, s.currency), s.cancellationUrl)} label="Remind me before it renews" />
        )}
      </div>
    </article>
  );
}

function Section({ title, subs, note }: { title: string; subs: StoredSubscription[]; note?: string }) {
  if (subs.length === 0) return null;
  return (
    <section className="space-y-3">
      <h2 className="font-semibold">{title} <span className="text-slate-400">({subs.length})</span></h2>
      {note && <p className="text-sm text-slate-600">{note}</p>}
      {subs.map((s) => <Card key={s.id} s={s} />)}
    </section>
  );
}

export default async function Report() {
  const sessionId = await getSessionId();
  const [report, doubts] = sessionId ? await Promise.all([getReport(sessionId), getDoubts(sessionId)]) : [null, []];
  if (!report || report.uploads === 0) {
    return (
      <p className="rounded-xl bg-white p-6 text-center">
        Nothing to report yet. <Link href="/" className="text-brand underline">Connect your bank and your mailbox</Link> to start.
      </p>
    );
  }
  const r = report;
  const recent = [...r.forgotten, ...r.active, ...r.idle].filter((s) => s.isNew && s.usage !== "yes");
  const unanswered = [...r.forgotten, ...r.active].filter((s) => !s.usage).length;
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Your forgotten subscriptions report</h1>
      <Doubts doubts={doubts} gmail={gmailConfigured()} outlook={outlookConfigured()} banking={bankingConfigured()} />
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-600">Yearly spend on subscriptions</p>
          <p className="text-2xl font-bold">{money(r.totalYearly, r.currency)}</p>
        </div>
        <div className="rounded-xl bg-emerald-50 p-4 shadow-sm">
          <p className="text-sm text-emerald-800">Potential savings per year</p>
          <p className="text-2xl font-bold text-emerald-800">{money(r.potentialSavings, r.currency)}</p>
        </div>
      </div>
      {unanswered > 0 && (
        <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
          {unanswered} subscriptions still need a &quot;Still using this?&quot; answer. <Link href="/review" className="underline">Answer now</Link> to see your full savings.
        </p>
      )}
      {recent.length > 0 && (
        <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <strong>Started recently:</strong> {recent.map((s) => `${s.serviceName} (${money(s.currentAmount, s.currency)} ${FREQUENCY_LABEL[s.frequency]})`).join(", ")}.
          Trials often turn into paid plans without warning: check you meant to keep {recent.length > 1 ? "them" : "it"}.
        </p>
      )}
      <TrialList trials={r.trials} />
      <Section title="Idle: you said you don't use these" subs={r.idle} note="Cancelling these is your potential saving." />
      <Section title="Possibly forgotten" subs={r.forgotten} />
      <Section title="Active" subs={r.active} />
      <Section title="Stopped (no recent charge)" subs={r.cancelled} note="Not counted in the yearly total." />
      <DeleteEverythingButton />
    </div>
  );
}
