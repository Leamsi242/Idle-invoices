"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Usage } from "@/lib/types";
import { useI18n } from "./I18n";

const OPTIONS: Usage[] = ["yes", "rarely", "no"];

export function UsageQuestion({ labelKey, current }: { labelKey: string; current?: Usage }) {
  const { m } = useI18n();
  const q = m.questions;
  const router = useRouter();
  const [pending, start] = useTransition();
  const [value, setValue] = useState(current);
  const tone: Record<Usage, string> = { yes: "bg-save text-white", rarely: "bg-warn text-night", no: "bg-leak text-white" };
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
      <input required value={name} onChange={(e) => setName(e.target.value)} placeholder={q.namePh} className="w-full rounded-xl border border-line px-3 py-2.5 text-sm" />
      <input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder={q.urlPh} className="w-full rounded-xl border border-line px-3 py-2.5 text-sm" />
      <button disabled={pending || !name.trim()} className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">{q.save}</button>
    </form>
  );
}

export function DeleteEverythingButton() {
  const { m } = useI18n();
  const q = m.questions;
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      disabled={pending}
      className="w-full rounded-2xl border border-leak/30 bg-surface px-4 py-3 font-semibold text-leak hover:bg-leak-soft"
      onClick={() => {
        if (!confirm(q.deleteConfirm)) return;
        start(async () => {
          await fetch("/api/data", { method: "DELETE" });
          router.push("/");
          router.refresh();
        });
      }}
    >
      {pending ? q.deleting : q.deleteAll}
    </button>
  );
}
