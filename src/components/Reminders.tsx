"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { buildIcs, type Reminder } from "@/lib/ics";

/** Downloads a calendar reminder; the phone opens it in its calendar app. */
export function ReminderButton({ reminder, label = "Remind me" }: { reminder: Reminder; label?: string }) {
  return (
    <button
      type="button"
      className="rounded-full border border-slate-300 bg-white px-3 py-1 text-sm hover:border-brand"
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
      🔔 {label}
    </button>
  );
}

export function TrialForm() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [serviceName, setServiceName] = useState("");
  const [endsOn, setEndsOn] = useState("");
  const [price, setPrice] = useState("");
  const [frequency, setFrequency] = useState("monthly");
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      className="space-y-3 rounded-xl bg-white p-4 shadow-sm"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          setError(null);
          const res = await fetch("/api/trials", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ serviceName, endsOn, priceAfter: price ? Number(price.replace(",", ".")) : undefined, frequency }),
          });
          if (!res.ok) return setError((await res.json()).error ?? "Could not save");
          setServiceName("");
          setEndsOn("");
          setPrice("");
          router.refresh();
        });
      }}
    >
      <h2 className="font-semibold">Just started a free trial?</h2>
      <p className="text-sm text-slate-600">Tell us when it ends. We&apos;ll show it here and you can add a reminder to your calendar two days before.</p>
      <input required value={serviceName} onChange={(e) => setServiceName(e.target.value)} placeholder="Service, e.g. WeTransfer" className="w-full rounded border border-slate-300 px-3 py-2 text-sm" />
      <div className="grid grid-cols-2 gap-2">
        <label className="text-sm">
          <span className="text-slate-600">Trial ends on</span>
          <input required type="date" value={endsOn} onChange={(e) => setEndsOn(e.target.value)} className="mt-1 w-full rounded border border-slate-300 px-3 py-2" />
        </label>
        <label className="text-sm">
          <span className="text-slate-600">Then costs (€)</span>
          <input inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="9.99" className="mt-1 w-full rounded border border-slate-300 px-3 py-2" />
        </label>
      </div>
      <select value={frequency} onChange={(e) => setFrequency(e.target.value)} className="w-full rounded border border-slate-300 px-2 py-2 text-sm" aria-label="Billing period after the trial">
        <option value="weekly">per week</option>
        <option value="monthly">per month</option>
        <option value="yearly">per year</option>
      </select>
      {error && <p className="text-sm text-red-700">{error}</p>}
      <button disabled={pending} className="w-full rounded-lg bg-brand px-4 py-2 font-semibold text-white disabled:opacity-40">Track this trial</button>
    </form>
  );
}

export function RemoveTrialButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      disabled={pending}
      className="text-sm text-slate-500 underline"
      onClick={() => start(async () => {
        await fetch(`/api/trials?id=${encodeURIComponent(id)}`, { method: "DELETE" });
        router.refresh();
      })}
    >
      Done, remove
    </button>
  );
}
