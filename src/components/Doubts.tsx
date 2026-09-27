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
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t.namePlaceholder} aria-label={t.nameAria} className="min-w-0 flex-1 rounded-2xl border border-line px-3 py-2 text-sm" />
        <button type="submit" disabled={pending || !name.trim()} className="rounded-2xl bg-brand px-4 py-2 text-sm font-semibold text-on-accent disabled:opacity-40">{t.save}</button>
      </form>
      {store && (
        <label className="block cursor-pointer text-sm text-brand underline">
          {pending ? t.reading : t.screenshot(t.storeName[store])}
          <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => e.target.files?.[0] && sendScreenshot(e.target.files[0])} />
        </label>
      )}
      {error && <p className="text-sm text-leak">{error}</p>}
    </div>
  );
}

/** The few points the automatic analysis could not settle, each with one small action. */
export function Doubts({ doubts, gmail, outlook, banking }: { doubts: Doubt[]; gmail: boolean; outlook: boolean; banking: boolean }) {
  const { m } = useI18n();
  const t = m.doubts;
  if (doubts.length === 0) return null;
  const button = "inline-flex items-center gap-1.5 rounded-full bg-brand px-3.5 py-1.5 text-sm font-semibold text-on-accent transition hover:opacity-90";
  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-leak">{m.ui.missingClues}</p>
          <h2 className="font-display text-xl font-semibold tracking-tight">{t.help(doubts.length)}</h2>
          <p className="text-sm text-muted">{t.everythingElse}</p>
        </div>
      </div>
      {/* Clue cards: swiped on a phone, side by side on a large screen. */}
      <ul className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0">
        {doubts.map((d, i) => (
          <li key={d.id} className="relative flex w-[85%] shrink-0 snap-start flex-col gap-3 rounded-3xl border border-line bg-surface p-5 shadow-card sm:w-auto">
            <span className="inline-flex w-fit items-center gap-2 rounded-full bg-leak-soft px-2.5 py-0.5 text-xs font-semibold text-leak">
              {i + 1} / {doubts.length}
            </span>
            <h3 className="font-semibold leading-snug tracking-tight">{d.title}</h3>
            <p className="text-sm text-muted">{d.detail}</p>
            <div className="mt-auto">
              {d.kind === "mail" && (
                <div className="flex flex-wrap gap-2">
                  {gmail && <a href="/api/gmail/start" className={button}>{t.connectGmail}</a>}
                  {outlook && <a href="/api/outlook/start" className={button}>{t.connectOutlook}</a>}
                  {!gmail && !outlook && <span className="text-sm text-muted">{t.mailNotSetUp}</span>}
                </div>
              )}
              {(d.kind === "card" || d.kind === "paypal") && banking && (
                <a href={`/?bank=${encodeURIComponent(d.bank)}#bank`} className={button}>{t.connectCard(d.bank)}</a>
              )}
              {d.kind === "name" && <NameAnswer labelKey={d.labelKey} store={d.store} />}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
