"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Usage } from "@/lib/types";
import { useI18n } from "./I18n";

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
        {q.whatIs} <code className="rounded-lg bg-surface-2 px-1.5 py-0.5 text-xs">{labelKey}</code> ({amount}){m.lang === "fr" ? "\u202f?" : "?"} {q.remember}
      </p>
      <input required value={name} onChange={(e) => setName(e.target.value)} placeholder={q.namePh} aria-label={q.namePh} className="w-full rounded-xl border border-line px-3 py-2.5 text-sm" />
      <input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder={q.urlPh} aria-label={q.urlPh} className="w-full rounded-xl border border-line px-3 py-2.5 text-sm" />
      <button disabled={pending || !name.trim()} className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-on-accent disabled:opacity-40">{q.save}</button>
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

/**
 * The decisions on one subscription: keep it, no longer used, cancelled, or not a subscription.
 * The chosen one is highlighted; "undo" puts it back among those to decide.
 */
export function Decisions({ labelKey, frequency, usage, t }: { labelKey: string; frequency?: string; usage?: Usage; t: { keep: string; notUsed: string; cancelled: string; notSub: string; undo: string } }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const send = (value: Usage | "clear") =>
    start(async () => {
      await fetch("/api/usage", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ labelKey, frequency, usage: value }) });
      router.refresh();
    });
  const options: [Usage, string, string][] = [
    ["yes", t.keep, "bg-brand text-on-accent"],
    ["no", t.notUsed, "bg-leak text-on-accent"],
    ["stopped", t.cancelled, "bg-save text-on-accent"],
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
            aria-pressed={usage === value || (value === "no" && usage === "rarely")}
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
