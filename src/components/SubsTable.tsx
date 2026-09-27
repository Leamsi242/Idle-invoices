"use client";

import { useMemo, useState, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Icon } from "./ui";

export interface SubRow {
  id: string;
  name: string;
  sub: string;
  icon: ReactNode;
  type: string;
  status: string;
  statusLabel: string;
  monthly: number;
  monthlyText: string;
  yearlyText: string;
  next?: string;
  nextText?: string;
  nextKind?: string;
  paidWith: string[];
}

const STATUS_TONE: Record<string, string> = {
  active: "bg-save-soft text-save",
  todo: "bg-warn-soft text-ink-2",
  idle: "bg-leak-soft text-leak",
  ended: "bg-surface-2 text-muted",
  stopped: "bg-brand-soft text-brand",
  hidden: "bg-surface-2 text-muted",
};

// Which statuses each filter shows.
const FILTERS: Record<string, string[]> = {
  all: ["active", "todo", "idle"],
  todo: ["todo", "idle"],
  active: ["active"],
  ended: ["ended"],
  stopped: ["stopped"],
  hidden: ["hidden"],
};

/**
 * Every subscription in one table: search as you type, filter by state or way of paying, sort.
 * A row opens its detail (the proof and the decisions) without leaving the page.
 */
export function SubsTable({ rows, t }: { rows: SubRow[]; t: { search: string; filters: Record<string, string>; sorts: Record<string, string>; sortBy: string; cols: { service: string; type: string; status: string; amount: string; next: string }; noMatch: string; perMonth: string } }) {
  const router = useRouter();
  const path = usePathname();
  const params = useSearchParams();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState(params.get("f") && FILTERS[params.get("f")!] ? params.get("f")! : "all");
  const [sort, setSort] = useState("amount");
  const [pay, setPay] = useState("");
  const ways = useMemo(() => [...new Set(rows.flatMap((r) => r.paidWith))].sort(), [rows]);
  const counts = useMemo(() => Object.fromEntries(Object.entries(FILTERS).map(([k, st]) => [k, rows.filter((r) => st.includes(r.status)).length])), [rows]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    return rows
      .filter((r) => FILTERS[filter].includes(r.status))
      .filter((r) => !pay || r.paidWith.includes(pay))
      .filter((r) => !q || r.name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").includes(q))
      .sort((a, b) => (sort === "name" ? a.name.localeCompare(b.name) : sort === "next" ? (a.next ?? "9").localeCompare(b.next ?? "9") : b.monthly - a.monthly));
  }, [rows, filter, pay, query, sort]);

  const open = (id: string) => {
    const next = new URLSearchParams(params.toString());
    next.set("open", id);
    router.push(`${path}?${next}`, { scroll: false });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <label className="relative flex-1">
          <Icon name="lens" className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t.search} aria-label={t.search} className="w-full rounded-2xl border border-line py-2.5 pl-10 pr-3 text-sm" />
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex w-full overflow-x-auto rounded-2xl bg-surface-2 p-1 lg:w-auto">
            {Object.keys(FILTERS).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setFilter(k)}
                className={`whitespace-nowrap rounded-xl px-3 py-1.5 text-sm font-medium transition ${filter === k ? "bg-surface text-ink shadow-card" : "text-muted hover:text-ink"}`}
              >
                {t.filters[k]} <span className="tabular text-xs opacity-60">{counts[k]}</span>
              </button>
            ))}
          </div>
          {ways.length > 1 && (
            <select value={pay} onChange={(e) => setPay(e.target.value)} aria-label="Paid with" className="min-w-0 flex-1 rounded-2xl border border-line px-3 py-2 text-sm lg:flex-none">
              <option value="">{t.filters.all}</option>
              {ways.map((w) => <option key={w} value={w}>{w}</option>)}
            </select>
          )}
          <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label={t.sortBy} className="min-w-0 flex-1 rounded-2xl border border-line px-3 py-2 text-sm lg:flex-none">
            {Object.entries(t.sorts).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-line bg-surface shadow-card">
        <div className="hidden grid-cols-[minmax(0,2.2fr)_1fr_0.9fr_1fr_1.1fr_2rem] gap-3 border-b border-line px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted md:grid">
          <span>{t.cols.service}</span><span>{t.cols.type}</span><span>{t.cols.status}</span><span>{t.cols.amount}</span><span>{t.cols.next}</span><span />
        </div>
        {shown.length === 0 && <p className="px-5 py-10 text-center text-sm text-muted">{t.noMatch}</p>}
        <ul className="divide-y divide-line">
          {shown.map((r, i) => (
            <li key={r.id} className="rise" style={{ animationDelay: `${Math.min(i, 10) * 35}ms` }}>
              <button type="button" onClick={() => open(r.id)} className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 text-left transition hover:bg-surface-2 md:grid-cols-[minmax(0,2.2fr)_1fr_0.9fr_1fr_1.1fr_2rem] md:px-5">
                <span className="flex min-w-0 items-center gap-3">
                  {r.icon}
                  <span className="min-w-0">
                    <span className="block truncate font-semibold tracking-tight">{r.name}</span>
                    <span className="block truncate text-xs text-muted">{r.sub}</span>
                  </span>
                </span>
                <span className="hidden text-sm text-ink-2 md:block">{r.type}</span>
                <span className="hidden md:block"><span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_TONE[r.status]}`}>{r.statusLabel}</span></span>
                <span className="text-right md:text-left">
                  <span className="tabular block font-semibold">{r.monthlyText}<span className="text-xs font-normal text-muted"> {t.perMonth}</span></span>
                  <span className={`text-xs md:hidden ${STATUS_TONE[r.status]} rounded-full px-2 py-0.5`}>{r.statusLabel}</span>
                </span>
                <span className="hidden text-sm md:block">
                  {r.nextText && <><span className="block">{r.nextText}</span><span className="text-xs text-muted">{r.nextKind}</span></>}
                </span>
                <Icon name="chevron" className="hidden h-5 w-5 text-muted md:block" />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
