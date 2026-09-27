"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import type { AttentionItem } from "@/lib/engagements";

const KEY = "sd_snoozed";
const WEEK = 7 * 86_400_000;

function readSnoozed(): Record<string, number> {
  try {
    const all = JSON.parse(localStorage.getItem(KEY) ?? "{}") as Record<string, number>;
    return Object.fromEntries(Object.entries(all).filter(([, until]) => until > Date.now()));
  } catch {
    return {};
  }
}

/**
 * Three priorities at most. "In 7 days" puts one off on this device, and the next one moves up:
 * the user is never faced with a long to-do list.
 */
export function Attention({ items, icons, t }: { items: AttentionItem[]; icons: Record<string, ReactNode>; t: { title: string; hint: string; empty: string; snooze: string; see: string; tags: Record<string, string> } }) {
  const [snoozed, setSnoozed] = useState<Record<string, number>>({});
  useEffect(() => setSnoozed(readSnoozed()), []);
  const shown = items.filter((i) => !snoozed[i.id]).slice(0, 3);
  const snooze = (id: string) => {
    const next = { ...readSnoozed(), [id]: Date.now() + WEEK };
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {}
    setSnoozed(next);
  };
  const tone: Record<string, string> = { trial: "bg-warn-soft text-ink-2", renewal: "bg-brand-soft text-brand", price: "bg-leak-soft text-leak", todo: "bg-warn-soft text-ink-2", setup: "bg-surface-2 text-ink-2" };
  return (
    <section className="space-y-4 rounded-3xl border border-line bg-surface p-5 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-display text-xl font-semibold tracking-tight">
            {t.title}
            {shown.length > 0 && <span className="tabular rounded-lg bg-warn-soft px-2 text-sm text-ink-2">{shown.length}</span>}
          </h2>
          <p className="text-sm text-muted">{t.hint}</p>
        </div>
      </div>
      {shown.length === 0 ? (
        <p className="rounded-2xl bg-save-soft px-4 py-3 text-sm text-ink-2">{t.empty}</p>
      ) : (
        <ul className="grid gap-3 md:grid-cols-3">
          {shown.map((i, n) => (
            <li key={i.id} className="rise flex flex-col gap-3 rounded-2xl border border-line bg-surface-2 p-4" style={{ animationDelay: `${n * 80}ms` }}>
              <div className="flex items-center gap-3">
                {i.name && icons[i.name]}
                <div className="min-w-0">
                  {i.name && <p className="truncate font-semibold">{i.name}</p>}
                  <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${tone[i.tag]}`}>{t.tags[i.tag]}</span>
                </div>
              </div>
              <p className="text-sm text-ink-2">{i.text}</p>
              <div className="mt-auto flex flex-wrap gap-2">
                <Link href={i.href} className="rounded-full bg-brand px-3.5 py-1.5 text-sm font-semibold text-white transition hover:opacity-90">{t.see}</Link>
                <button type="button" onClick={() => snooze(i.id)} className="rounded-full border border-line bg-surface px-3.5 py-1.5 text-sm font-medium text-ink-2 hover:border-ink">
                  {t.snooze}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
