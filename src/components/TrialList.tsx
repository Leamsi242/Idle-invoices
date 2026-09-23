import type { ReportTrial } from "@/lib/store";
import { money, FREQUENCY_LABEL } from "@/lib/format";
import { trialReminder } from "@/lib/ics";
import { ReminderButton, RemoveTrialButton } from "./Reminders";

const daysLeft = (date: string) => Math.ceil((Date.parse(date) - Date.now()) / 86_400_000);

export function TrialList({ trials }: { trials: ReportTrial[] }) {
  if (trials.length === 0) return null;
  return (
    <section className="space-y-3">
      <h2 className="font-semibold">Coming up: trials ending and prices going up <span className="text-slate-400">({trials.length})</span></h2>
      {trials.map((t) => {
        const price = t.amount ? `${money(t.amount, t.currency)}${t.frequency ? ` ${FREQUENCY_LABEL[t.frequency]}` : ""}` : undefined;
        const left = daysLeft(t.startsCharging);
        return (
          <article key={`${t.serviceName}-${t.startsCharging}`} className="space-y-2 rounded-xl border border-amber-300 bg-amber-50 p-4">
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="font-medium">{t.serviceName}</h3>
              {price && <span className="whitespace-nowrap font-semibold">{price}</span>}
            </div>
            <p className="text-sm text-amber-900">
              {t.kind === "price-increase"
                ? `Price goes up from ${money(t.previousAmount ?? 0, t.currency)} to ${price} on ${t.startsCharging}`
                : `Trial ends on ${t.startsCharging}`}
              {left >= 0 ? ` (${left === 0 ? "today" : `in ${left} day${left > 1 ? "s" : ""}`})` : ""}. Cancel before then if you don&apos;t want it.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <ReminderButton reminder={trialReminder(t.serviceName, t.startsCharging, price, t.cancellationUrl)} label="Add reminder" />
              {t.cancellationUrl && <a href={t.cancellationUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-brand underline">How to cancel ↗</a>}
              {t.tracked && t.id && <RemoveTrialButton id={t.id} />}
            </div>
          </article>
        );
      })}
    </section>
  );
}
