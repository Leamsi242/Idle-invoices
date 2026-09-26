import type { ReportTrial } from "@/lib/store";
import { formatDate, money } from "@/lib/i18n";
import { getMessages } from "@/lib/locale";
import { trialReminder } from "@/lib/ics";
import { ReminderButton, RemoveTrialButton } from "./Reminders";

const daysLeft = (date: string) => Math.ceil((Date.parse(date) - Date.now()) / 86_400_000);

export async function TrialList({ trials }: { trials: ReportTrial[] }) {
  if (trials.length === 0) return null;
  const { m, locale } = await getMessages();
  const t = m.trials;
  return (
    <section className="space-y-3">
      <h2 className="font-semibold">{t.listTitle} <span className="text-slate-400">({trials.length})</span></h2>
      {trials.map((trial) => {
        const price = trial.amount ? `${money(trial.amount, trial.currency, locale)}${trial.frequency ? ` ${m.per[trial.frequency]}` : ""}` : undefined;
        const left = daysLeft(trial.startsCharging);
        const date = formatDate(trial.startsCharging, locale);
        return (
          <article key={`${trial.serviceName}-${trial.startsCharging}`} className="space-y-2 rounded-xl border border-amber-300 bg-amber-50 p-4">
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="font-medium">{trial.serviceName}</h3>
              {price && <span className="whitespace-nowrap font-semibold">{price}</span>}
            </div>
            <p className="text-sm text-amber-900">
              {trial.kind === "price-increase" ? t.priceUp(money(trial.previousAmount ?? 0, trial.currency, locale), price ?? "", date) : t.trialEnds(date)}
              {left >= 0 ? ` (${left === 0 ? t.today : t.inDays(left)})` : ""}. {t.cancelBefore}
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <ReminderButton reminder={trialReminder(trial.serviceName, trial.startsCharging, price, trial.cancellationUrl, locale)} label={t.addReminder} />
              {trial.cancellationUrl && <a href={trial.cancellationUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-brand underline">{t.howToCancel}</a>}
              {trial.tracked && trial.id && <RemoveTrialButton id={trial.id} />}
            </div>
          </article>
        );
      })}
    </section>
  );
}
