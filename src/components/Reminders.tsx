"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { buildIcs, type Reminder } from "@/lib/ics";
import { useI18n } from "./I18n";

/** Downloads a calendar reminder; the phone opens it in its calendar app. */
export function ReminderButton({ reminder, label, compact = false }: { reminder: Reminder; label?: string; compact?: boolean }) {
  const { m } = useI18n();
  const text = label ?? m.report.remindMe;
  return (
    <button
      type="button"
      aria-label={text}
      title={text}
      className={
        compact
          ? "inline-flex h-8 w-8 items-center justify-center rounded-full border border-line bg-surface text-ink-2 transition hover:border-brand hover:text-brand"
          : "inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3.5 py-1.5 text-sm font-medium text-ink-2 transition hover:border-brand hover:text-brand"
      }
      onClick={() => {
        const blob = new Blob([buildIcs(reminder)], { type: "text/calendar;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${reminder.uid}.ics`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="h-4 w-4">
        <path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z" />
        <path d="M10 20.5a2 2 0 0 0 4 0" />
      </svg>
      {!compact && text}
    </button>
  );
}

export function TrialForm() {
  const { m } = useI18n();
  const t = m.trials;
  const router = useRouter();
  const [pending, start] = useTransition();
  const [serviceName, setServiceName] = useState("");
  const [endsOn, setEndsOn] = useState("");
  const [price, setPrice] = useState("");
  const [frequency, setFrequency] = useState("monthly");
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      className="space-y-3 rounded-2xl bg-surface p-4 shadow-card"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          setError(null);
          const res = await fetch("/api/trials", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ serviceName, endsOn, priceAfter: price ? Number(price.replace(",", ".")) : undefined, frequency }),
          });
          if (!res.ok) return setError(t.couldNotSave);
          setServiceName("");
          setEndsOn("");
          setPrice("");
          router.refresh();
        });
      }}
    >
      <h3 className="font-semibold">{t.formTitle}</h3>
      <p className="text-sm text-muted">{t.formIntro}</p>
      <input required value={serviceName} onChange={(e) => setServiceName(e.target.value)} placeholder={t.servicePh} aria-label={t.servicePh} className="w-full rounded border border-line px-3 py-2 text-sm" />
      <div className="grid grid-cols-2 gap-2">
        <label className="text-sm">
          <span className="text-muted">{t.endsOn}</span>
          <input required type="date" value={endsOn} onChange={(e) => setEndsOn(e.target.value)} className="mt-1 w-full rounded border border-line px-3 py-2" />
        </label>
        <label className="text-sm">
          <span className="text-muted">{t.thenCosts}</span>
          <input inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} placeholder={m.lang === "fr" ? "9,99" : "9.99"} className="mt-1 w-full rounded border border-line px-3 py-2" />
        </label>
      </div>
      <select value={frequency} onChange={(e) => setFrequency(e.target.value)} className="w-full rounded border border-line px-2 py-2 text-sm" aria-label={t.periodAria}>
        <option value="weekly">{m.per.weekly}</option>
        <option value="monthly">{m.per.monthly}</option>
        <option value="yearly">{m.per.yearly}</option>
      </select>
      {error && <p className="text-sm text-leak">{error}</p>}
      <button disabled={pending} className="w-full rounded-lg bg-brand px-4 py-2 font-semibold text-on-accent disabled:opacity-40">{t.track}</button>
    </form>
  );
}

export function RemoveTrialButton({ id }: { id: string }) {
  const { m } = useI18n();
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      disabled={pending}
      className="text-sm text-muted underline"
      onClick={() => start(async () => {
        await fetch(`/api/trials?id=${encodeURIComponent(id)}`, { method: "DELETE" });
        router.refresh();
      })}
    >
      {m.trials.remove}
    </button>
  );
}
