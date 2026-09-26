"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "./I18n";
import { formatDate } from "@/lib/i18n";

export interface WatchView { id: string; institution: string; validUntil: string; lastReadAt: string; hasEmail: boolean }

/** A watched bank: until when, last check, stop, and the optional alert email. */
export function WatchControls({ watch, emailEnabled }: { watch: WatchView; emailEnabled: boolean }) {
  const { m, locale } = useI18n();
  const w = m.watch;
  const router = useRouter();
  const [pending, start] = useTransition();
  const [email, setEmail] = useState("");
  const [saved, setSaved] = useState(false);
  return (
    <div className="space-y-2 rounded-xl border border-teal-200 bg-teal-50 p-3 text-sm">
      <p>
        <span className="font-medium">👁 {w.active(watch.institution, formatDate(watch.validUntil, locale))}</span>
        <span className="text-slate-600"> · {w.lastRead(formatDate(watch.lastReadAt, locale))}</span>
      </p>
      {emailEnabled ? (
        <form
          className="flex flex-wrap items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              const res = await fetch("/api/watch", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: watch.id, email }) });
              setSaved(res.ok);
              router.refresh();
            });
          }}
        >
          <label className="w-full text-xs text-slate-600" htmlFor={`email-${watch.id}`}>{w.emailLabel}</label>
          <input id={`email-${watch.id}`} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={watch.hasEmail ? "••••" : w.emailPlaceholder} className="min-w-0 flex-1 rounded-lg border border-slate-300 px-2 py-1" />
          <button disabled={pending} className="rounded-lg bg-brand px-3 py-1 font-medium text-white disabled:opacity-40">{saved ? w.emailSaved : w.emailSave}</button>
        </form>
      ) : (
        <p className="text-xs text-slate-500">{w.emailOff}</p>
      )}
      <button
        type="button"
        disabled={pending}
        className="text-xs text-slate-600 underline"
        onClick={() => {
          if (!confirm(w.stopConfirm)) return;
          start(async () => {
            await fetch(`/api/watch?id=${encodeURIComponent(watch.id)}`, { method: "DELETE" });
            router.refresh();
          });
        }}
      >
        {w.stop}
      </button>
    </div>
  );
}

/** "New since your last visit", with a button that marks them as seen. */
export function AlertsPanel({ lines }: { lines: { id: string; text: string; date: string }[] }) {
  const { m } = useI18n();
  const router = useRouter();
  const [pending, start] = useTransition();
  if (lines.length === 0) return null;
  return (
    <section className="space-y-2 rounded-xl border border-red-200 bg-red-50 p-4">
      <h2 className="font-semibold text-red-900">🔔 {m.alerts.title}</h2>
      <ul className="space-y-1 text-sm text-red-900">
        {lines.map((l) => (
          <li key={l.id}>
            {l.text} <span className="text-xs text-red-700">({l.date})</span>
          </li>
        ))}
      </ul>
      <button
        type="button"
        disabled={pending}
        className="rounded-full border border-red-300 bg-white px-3 py-1 text-sm"
        onClick={() => start(async () => {
          await fetch("/api/alerts", { method: "POST" });
          router.refresh();
        })}
      >
        {m.alerts.dismiss}
      </button>
    </section>
  );
}
