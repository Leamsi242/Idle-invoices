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
  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label={q.stillUsing}>
      <span className="text-sm text-slate-600">{q.stillUsing}</span>
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
          className={`rounded-full border px-3 py-1 text-sm ${value === o ? "border-brand bg-brand text-white" : "border-slate-300 bg-white"}`}
        >
          {q[o]}
        </button>
      ))}
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
      className="space-y-2 rounded-xl border border-amber-300 bg-amber-50 p-4"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          await fetch("/api/labels", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ labelKey, serviceName: name, cancellationUrl: url || undefined }) });
          router.refresh();
        });
      }}
    >
      <p className="text-sm">
        {q.whatIs} <code className="rounded bg-white px-1">{labelKey}</code> ({amount}){m.lang === "fr" ? " ?" : "?"} {q.remember}
      </p>
      <input required value={name} onChange={(e) => setName(e.target.value)} placeholder={q.namePh} className="w-full rounded border border-slate-300 px-3 py-2 text-sm" />
      <input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder={q.urlPh} className="w-full rounded border border-slate-300 px-3 py-2 text-sm" />
      <button disabled={pending || !name.trim()} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">{q.save}</button>
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
      className="w-full rounded-xl border border-red-300 bg-white px-4 py-3 font-semibold text-red-700 hover:bg-red-50"
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
