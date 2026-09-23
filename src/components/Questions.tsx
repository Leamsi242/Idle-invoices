"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Usage } from "@/lib/types";

const OPTIONS: { value: Usage; label: string }[] = [
  { value: "yes", label: "Yes" },
  { value: "rarely", label: "Rarely" },
  { value: "no", label: "No" },
];

export function UsageQuestion({ labelKey, current }: { labelKey: string; current?: Usage }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [value, setValue] = useState(current);
  return (
    <div className="flex items-center gap-2" role="group" aria-label="Still using this?">
      <span className="text-sm text-slate-600">Still using this?</span>
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          disabled={pending}
          aria-pressed={value === o.value}
          onClick={() =>
            start(async () => {
              setValue(o.value);
              await fetch("/api/usage", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ labelKey, usage: o.value }) });
              router.refresh();
            })
          }
          className={`rounded-full border px-3 py-1 text-sm ${value === o.value ? "border-brand bg-brand text-white" : "border-slate-300 bg-white"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function LabelQuestion({ labelKey, amount }: { labelKey: string; amount: string }) {
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
        What is <code className="rounded bg-white px-1">{labelKey}</code> ({amount})? We&apos;ll remember your answer.
      </p>
      <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Service name, e.g. FocusFlow" className="w-full rounded border border-slate-300 px-3 py-2 text-sm" />
      <input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Cancellation page (optional, https://…)" className="w-full rounded border border-slate-300 px-3 py-2 text-sm" />
      <button disabled={pending || !name.trim()} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">Save</button>
    </form>
  );
}

export function DeleteEverythingButton() {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      disabled={pending}
      className="w-full rounded-xl border border-red-300 bg-white px-4 py-3 font-semibold text-red-700 hover:bg-red-50"
      onClick={() => {
        if (!confirm("Delete all your uploaded data and results? This cannot be undone.")) return;
        start(async () => {
          await fetch("/api/data", { method: "DELETE" });
          router.push("/");
          router.refresh();
        });
      }}
    >
      {pending ? "Deleting…" : "🗑 Delete everything"}
    </button>
  );
}
