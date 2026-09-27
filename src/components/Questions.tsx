"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Usage } from "@/lib/types";
import { useI18n } from "./I18n";

const OPTIONS = ["yes", "rarely", "no"] as const;

export function UsageQuestion({ labelKey, current }: { labelKey: string; current?: Usage }) {
  const { m } = useI18n();
  const q = m.questions;
  const router = useRouter();
  const [pending, start] = useTransition();
  const [value, setValue] = useState(current);
  const tone: Record<(typeof OPTIONS)[number], string> = { yes: "bg-save text-white", rarely: "bg-warn text-night", no: "bg-leak text-white" };
  return (
    <div className="space-y-2" role="group" aria-label={q.stillUsing}>
      <p className="text-xs font-medium text-muted">{q.stillUsing}</p>
      <div className="grid grid-cols-3 gap-1 rounded-2xl bg-surface-2 p-1">
        {OPTIONS.map((o) => (
          <button
            key={o}
            disabled={pending}
            aria-pressed={value === o}
            onClick={() =>
              start(async () => {
                setValue(o);
                await fetch("/api/usage", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ labelKey, usage: o }) });
                router.refresh();
              })
            }
            className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${value === o ? `${tone[o]} shadow-card` : "text-ink-2 hover:bg-surface"}`}
          >
            {q[o]}
          </button>
        ))}
      </div>
    </div>
  );
}

export function LabelQuestion({ labelKey, amount }: { labelKey: string; amount: string }) {
  const { m } = useI18n();
  const q = m.questions;
  const router = useRouter();
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [pending, start] = useTransition();
  return (
    <form
      className="space-y-3 rounded-3xl border border-line bg-surface p-5 shadow-card"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          await fetch("/api/labels", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ labelKey, serviceName: name, cancellationUrl: url || undefined }) });
          router.refresh();
        });
      }}
    >
      <p className="text-sm">
        {q.whatIs} <code className="rounded-lg bg-surface-2 px-1.5 py-0.5 text-xs">{labelKey}</code> ({amount}){m.lang === "fr" ? " ?" : "?"} {q.remember}
      </p>
      <input required value={name} onChange={(e) => setName(e.target.value)} placeholder={q.namePh} aria-label={q.namePh} className="w-full rounded-xl border border-line px-3 py-2.5 text-sm" />
      <input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder={q.urlPh} aria-label={q.urlPh} className="w-full rounded-xl border border-line px-3 py-2.5 text-sm" />
      <button disabled={pending || !name.trim()} className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">{q.save}</button>
    </form>
  );
}

export function DeleteEverythingButton({ compact = false, label }: { compact?: boolean; label?: string }) {
  const { m } = useI18n();
  const q = m.questions;
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      disabled={pending}
      className={
        compact
          ? "inline-flex items-center gap-2 rounded-full border border-leak/30 bg-surface px-3.5 py-1.5 text-sm font-medium text-leak transition hover:bg-leak-soft disabled:opacity-40"
          : "w-full rounded-2xl border border-leak/30 bg-surface px-4 py-3 font-semibold text-leak hover:bg-leak-soft"
      }
      onClick={() => {
        if (!confirm(q.deleteConfirm)) return;
        start(async () => {
          await fetch("/api/data", { method: "DELETE" });
          router.push("/");
          router.refresh();
        });
      }}
    >
      {pending ? q.deleting : label ?? q.deleteAll}
    </button>
  );
}

/** "I cancelled it": the subscription moves to the savings, and back if tapped again. */
export function StoppedButton({ labelKey, stopped }: { labelKey: string; stopped: boolean }) {
  const { m } = useI18n();
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await fetch("/api/usage", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ labelKey, usage: stopped ? "yes" : "stopped" }) });
          router.refresh();
        })
      }
      className={
        stopped
          ? "inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3.5 py-1.5 text-sm font-medium text-ink-2 transition hover:border-ink disabled:opacity-40"
          : "inline-flex items-center gap-1.5 rounded-full bg-save px-3.5 py-1.5 text-sm font-semibold text-white shadow-card transition hover:opacity-90 active:scale-95 disabled:opacity-40"
      }
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="h-4 w-4">
        <path d={stopped ? "M9 14 4 9l5-5M4 9h11a5 5 0 0 1 0 10h-1" : "m5 12.5 4.5 4.5L19 7.5"} />
      </svg>
      {stopped ? m.questions.undoStopped : m.questions.stopped}
    </button>
  );
}

/**
 * The decisions on one subscription: keep it, no longer used, cancelled, or not a subscription.
 * The chosen one is highlighted; "undo" puts it back among those to decide.
 */
export function Decisions({ labelKey, usage, t }: { labelKey: string; usage?: Usage; t: { keep: string; notUsed: string; cancelled: string; notSub: string; undo: string } }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const send = (value: Usage | "clear") =>
    start(async () => {
      await fetch("/api/usage", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ labelKey, usage: value }) });
      router.refresh();
    });
  const options: [Usage, string, string][] = [
    ["yes", t.keep, "bg-brand text-white"],
    ["no", t.notUsed, "bg-leak text-white"],
    ["stopped", t.cancelled, "bg-save text-white"],
    ["notsub", t.notSub, "bg-ink text-bg"],
  ];
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {options.map(([value, label, on]) => (
          <button
            key={value}
            type="button"
            disabled={pending}
            aria-pressed={usage === value}
            onClick={() => send(value)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition active:scale-95 disabled:opacity-40 ${usage === value || (value === "no" && usage === "rarely") ? on : "border border-line bg-surface text-ink-2 hover:border-ink"}`}
          >
            {label}
          </button>
        ))}
      </div>
      {usage && (
        <button type="button" disabled={pending} onClick={() => send("clear")} className="text-xs text-muted underline underline-offset-4">
          {t.undo}
        </button>
      )}
    </div>
  );
}
