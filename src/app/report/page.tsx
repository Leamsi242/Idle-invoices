import Link from "next/link";
import { getSessionId } from "@/lib/session";
import { getReport, type StoredSubscription } from "@/lib/store";
import { money, FREQUENCY_LABEL } from "@/lib/format";
import { DeleteEverythingButton } from "@/components/Questions";

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
      {s.priceChanges.length > 0 && (
        <p className="text-sm text-amber-700">
          Price went up: {s.priceChanges.map((p) => `${money(p.from, s.currency)} to ${money(p.to, s.currency)} on ${p.date}`).join("; ")}
        </p>
      )}
      {s.bundle && <p className="text-sm text-slate-600">Bundle, counted once: {s.bundle.join(", ")}</p>}
      {s.forgottenReasons.length > 0 && (
        <ul className="flex flex-wrap gap-1">
          {s.forgottenReasons.map((r) => <li key={r} className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">{r}</li>)}
        </ul>
      )}
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-500">Confidence {Math.round(s.confidence * 100)}%</span>
        {s.cancellationUrl ? (
          <a href={s.cancellationUrl} target="_blank" rel="noopener noreferrer" className="font-medium text-brand underline">How to cancel ↗</a>
        ) : (
          <span className="text-slate-400">No cancellation link yet</span>
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
  const report = sessionId ? await getReport(sessionId) : null;
  if (!report || report.uploads === 0) {
    return (
      <p className="rounded-xl bg-white p-6 text-center">
        Nothing to report yet. <Link href="/" className="text-brand underline">Upload your statements</Link>.
      </p>
    );
  }
  const r = report;
  const unanswered = [...r.forgotten, ...r.active].filter((s) => !s.usage).length;
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Your forgotten subscriptions report</h1>
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
      <Section title="Idle: you said you don't use these" subs={r.idle} note="Cancelling these is your potential saving." />
      <Section title="Possibly forgotten" subs={r.forgotten} />
      <Section title="Active" subs={r.active} />
      <Section title="Stopped (no recent charge)" subs={r.cancelled} note="Not counted in the yearly total." />
      <DeleteEverythingButton />
    </div>
  );
}
