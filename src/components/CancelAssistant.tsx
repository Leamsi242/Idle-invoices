"use client";

import { useEffect, useMemo, useState } from "react";
import type { Channel } from "@/lib/types";
import type { Locale } from "@/lib/i18n";
import { formatDate, money } from "@/lib/i18n";
import { ASSISTANT_DICTS, buildLetter, checkReminder, letterFits, mailtoLink, refundable, type CancelReason } from "@/lib/cancel-letter";
import { ReminderButton } from "./Reminders";

const NAME_KEY = "sd-cancel-name";

/**
 * The cancellation assistant, under "How to cancel": a ready letter to copy or open in the user's
 * mail app, and a reminder to check the charges stop. Built in the browser only.
 */
export function CancelAssistant({ serviceName, channel, locale, today, currency, charges, cancellationUrl, nextCharge }: {
  serviceName: string;
  channel: Channel;
  locale: Locale;
  today: string;
  currency: string;
  charges?: { date: string; amount: number }[];
  cancellationUrl?: string;
  nextCharge?: string;
}) {
  const t = ASSISTANT_DICTS[locale];
  const recent = refundable(charges, today);
  const [name, setName] = useState("");
  const [reference, setReference] = useState("");
  const [reason, setReason] = useState<CancelReason>("unused");
  // Pre-ticked only for a charge of the last week: an older one is the user's call.
  const [askRefund, setAskRefund] = useState(!!recent && Date.parse(today) - Date.parse(recent.date) <= 7 * 86_400_000);
  const [edited, setEdited] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // The name is remembered in this browser only, for the next letter.
  useEffect(() => {
    try { setName(localStorage.getItem(NAME_KEY) ?? ""); } catch { /* storage unavailable */ }
  }, []);
  const saveName = (v: string) => {
    setName(v);
    setEdited(null);
    try { localStorage.setItem(NAME_KEY, v); } catch { /* storage unavailable */ }
  };

  const letter = useMemo(
    () => buildLetter({ serviceName, channel, locale, today, name, reference, reason, refund: askRefund && recent ? { ...recent, currency } : undefined }),
    [serviceName, channel, locale, today, name, reference, reason, askRefund, recent, currency],
  );
  const body = edited ?? letter.body;

  if (!letterFits(channel)) return <p className="mt-3 rounded-2xl bg-surface p-3 text-ink-2">{t.store(serviceName)}</p>;

  const field = "w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-brand";
  return (
    <section className="mt-4 space-y-3 border-t border-line pt-4" aria-label={t.title}>
      <p className="font-semibold text-ink">{t.title}</p>
      <p className="text-xs text-muted">{t.intro}</p>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="space-y-1 text-xs font-medium text-ink-2">
          {t.name}
          <input className={field} value={name} onChange={(e) => saveName(e.target.value)} autoComplete="name" />
        </label>
        <label className="space-y-1 text-xs font-medium text-ink-2">
          {t.reason}
          <select className={field} value={reason} onChange={(e) => { setReason(e.target.value as CancelReason); setEdited(null); }}>
            {(Object.keys(t.reasons) as CancelReason[]).map((r) => <option key={r} value={r}>{t.reasons[r]}</option>)}
          </select>
        </label>
        <label className="space-y-1 text-xs font-medium text-ink-2 sm:col-span-2">
          {t.reference}
          <input className={field} value={reference} onChange={(e) => { setReference(e.target.value); setEdited(null); }} />
        </label>
      </div>
      {recent && (
        <label className="flex items-start gap-2 text-sm text-ink-2">
          <input type="checkbox" className="mt-1" checked={askRefund} onChange={(e) => { setAskRefund(e.target.checked); setEdited(null); }} />
          <span>
            {t.refund(formatDate(recent.date, locale), money(recent.amount, currency, locale))}
            <span className="block text-xs text-muted">{t.refundNote}</span>
          </span>
        </label>
      )}
      <label className="block space-y-1 text-xs font-medium text-ink-2">
        {t.preview}
        <textarea className={`${field} min-h-64 leading-relaxed`} value={body} onChange={(e) => setEdited(e.target.value)} />
      </label>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-full bg-brand px-4 py-2 text-sm font-semibold text-on-accent hover:opacity-90"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(`${letter.subject}\n\n${body}`);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            } catch { /* clipboard refused: the text stays selectable */ }
          }}
        >
          {copied ? t.copied : t.copy}
        </button>
        <a href={mailtoLink({ subject: letter.subject, body })} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium text-ink-2 hover:border-brand hover:text-brand">
          {t.mail}
        </a>
        {cancellationUrl && (
          <a href={cancellationUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium text-ink-2 hover:border-brand hover:text-brand">
            {t.page(serviceName)}
          </a>
        )}
      </div>
      {channel === "direct-debit" && <p className="rounded-2xl bg-warn-soft p-3 text-xs text-ink-2">{t.sepa}</p>}
      {nextCharge && <ReminderButton reminder={checkReminder(serviceName, nextCharge, locale)} label={t.remind} />}
      <p className="text-xs text-muted">{t.after}</p>
    </section>
  );
}
