"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Doubt } from "@/lib/doubts";
import { useI18n } from "./I18n";

function NameAnswer({ labelKey, store }: { labelKey: string; store?: "apple" | "google" }) {
  const { m } = useI18n();
  const t = m.doubts;
  const router = useRouter();
  const [name, setName] = useState("");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const saveName = () =>
    start(async () => {
      const res = await fetch("/api/labels", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ labelKey, serviceName: name }) });
      if (!res.ok) return setError(t.saveError);
      router.refresh();
    });

  const sendScreenshot = (file: File) =>
    start(async () => {
      const body = new FormData();
      body.append("files", file);
      body.append("hints", JSON.stringify({ [file.name]: store }));
      body.append("mappings", "{}");
      const res = await fetch("/api/upload", { method: "POST", body });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.errors?.length) return setError(json.errors?.[0]?.error ?? json.error ?? t.readError);
      router.refresh();
    });

  return (
    <div className="space-y-2">
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) saveName();
        }}
      >
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t.namePlaceholder} aria-label={t.nameAria} className="min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm" />
        <button type="submit" disabled={pending || !name.trim()} className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">{t.save}</button>
      </form>
      {store && (
        <label className="block cursor-pointer text-sm text-brand underline">
          {pending ? t.reading : t.screenshot(t.storeName[store])}
          <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => e.target.files?.[0] && sendScreenshot(e.target.files[0])} />
        </label>
      )}
      {error && <p className="text-sm text-red-700">{error}</p>}
    </div>
  );
}

/** The few points the automatic analysis could not settle, each with one small action. */
export function Doubts({ doubts, gmail, outlook, banking }: { doubts: Doubt[]; gmail: boolean; outlook: boolean; banking: boolean }) {
  const { m } = useI18n();
  const t = m.doubts;
  if (doubts.length === 0) return null;
  return (
    <section className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
      <div>
        <h2 className="font-semibold text-amber-900">{t.help(doubts.length)}</h2>
        <p className="text-sm text-amber-900">{t.everythingElse}</p>
      </div>
      <ul className="space-y-3">
        {doubts.map((d) => (
          <li key={d.id} className="space-y-2 rounded-xl bg-white p-4 shadow-sm">
            <h3 className="font-medium">{d.title}</h3>
            <p className="text-sm text-slate-600">{d.detail}</p>
            {d.kind === "mail" && (
              <div className="flex flex-wrap gap-2">
                {gmail && <a href="/api/gmail/start" className="rounded-full bg-brand px-3 py-1 text-sm font-medium text-white">{t.connectGmail}</a>}
                {outlook && <a href="/api/outlook/start" className="rounded-full bg-brand px-3 py-1 text-sm font-medium text-white">{t.connectOutlook}</a>}
                {!gmail && !outlook && <span className="text-sm text-slate-500">{t.mailNotSetUp}</span>}
              </div>
            )}
            {d.kind === "card" && banking && (
              <a href={`/?bank=${encodeURIComponent(d.bank)}#bank`} className="inline-block rounded-full bg-brand px-3 py-1 text-sm font-medium text-white">{t.connectCard(d.bank)}</a>
            )}
            {d.kind === "name" && <NameAnswer labelKey={d.labelKey} store={d.store} />}
          </li>
        ))}
      </ul>
    </section>
  );
}
