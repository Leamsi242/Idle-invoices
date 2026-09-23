"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ColumnMapping } from "@/lib/parsers/bank-csv";

interface NeedsMapping { fileName: string; headers: string[]; preview: string[][] }
interface UploadResponse {
  results: { fileName: string; source: string; count: number }[];
  needsMapping: NeedsMapping[];
  errors: { fileName: string; error: string }[];
  subscriptions?: number;
}

type Hint = "apple" | "google" | "email";
const needsHint = (f: File) => f.type.startsWith("image/") || f.name.toLowerCase().endsWith(".txt");

export default function UploadForm() {
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [hints, setHints] = useState<Record<string, Hint>>({});
  const [pasted, setPasted] = useState("");
  const [pastedHint, setPastedHint] = useState<Hint>("apple");
  const [busy, setBusy] = useState(false);
  const [response, setResponse] = useState<UploadResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    setFiles((prev) => [...prev, ...Array.from(list).filter((f) => !prev.some((p) => p.name === f.name && p.size === f.size))]);
  };

  async function send(selected: File[], mappings: Record<string, ColumnMapping> = {}, text?: string) {
    setBusy(true);
    setError(null);
    try {
      const body = new FormData();
      selected.forEach((f) => body.append("files", f));
      body.append("hints", JSON.stringify(hints));
      body.append("mappings", JSON.stringify(mappings));
      if (text?.trim()) {
        body.append("pastedText", text);
        body.append("pastedHint", pastedHint);
      }
      const res = await fetch("/api/upload", { method: "POST", body });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Upload failed");
      setResponse((prev) => ({
        results: [...(prev?.results ?? []), ...json.results],
        needsMapping: json.needsMapping,
        errors: json.errors,
        subscriptions: json.subscriptions,
      }));
      setFiles([]);
      setPasted("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          send(files, {}, pasted);
        }}
      >
        <label
          className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-white p-6 text-center hover:border-brand"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            addFiles(e.dataTransfer.files);
          }}
        >
          <span className="text-3xl" aria-hidden>📄</span>
          <span className="font-medium">Drop files here or tap to choose</span>
          <span className="text-sm text-slate-500">Bank statements (CSV, PDF), PayPal activity (CSV), receipts (.eml), app store screenshots</span>
          <input
            type="file"
            multiple
            accept=".csv,.pdf,.eml,.txt,image/png,image/jpeg,image/webp"
            className="sr-only"
            onChange={(e) => addFiles(e.target.files)}
          />
        </label>

        {files.length > 0 && (
          <ul className="divide-y divide-slate-200 rounded-xl bg-white text-sm">
            {files.map((f) => (
              <li key={f.name} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2">
                <span className="truncate">{f.name}</span>
                <span className="flex items-center gap-2">
                  {needsHint(f) && (
                    <select
                      aria-label={`Source of ${f.name}`}
                      className="rounded border border-slate-300 px-2 py-1"
                      value={hints[f.name] ?? "apple"}
                      onChange={(e) => setHints({ ...hints, [f.name]: e.target.value as Hint })}
                    >
                      <option value="apple">Apple subscriptions</option>
                      <option value="google">Google Play subscriptions</option>
                      <option value="email">Receipt</option>
                    </select>
                  )}
                  <button type="button" className="text-slate-400 hover:text-red-600" onClick={() => setFiles(files.filter((x) => x !== f))} aria-label={`Remove ${f.name}`}>
                    ✕
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}

        <details className="rounded-xl bg-white p-4">
          <summary className="cursor-pointer font-medium">Paste an app store list or a receipt</summary>
          <p className="mt-2 text-sm text-slate-500">
            iPhone: Settings, your name, Subscriptions. Android: Play Store, Payments &amp; subscriptions. Copy the list and paste it here.
          </p>
          <select className="mt-3 w-full rounded border border-slate-300 px-2 py-2 text-sm" value={pastedHint} onChange={(e) => setPastedHint(e.target.value as Hint)} aria-label="Pasted text source">
            <option value="apple">Apple subscriptions list</option>
            <option value="google">Google Play subscriptions list</option>
            <option value="email">Receipt email</option>
          </select>
          <textarea
            className="mt-2 h-32 w-full rounded border border-slate-300 p-2 text-sm"
            value={pasted}
            onChange={(e) => setPasted(e.target.value)}
            placeholder={"Apple One\nIndividual (Monthly)\n€19.95/month\nRenews 17 October 2026"}
          />
        </details>

        <button
          type="submit"
          disabled={busy || (files.length === 0 && !pasted.trim())}
          className="w-full rounded-xl bg-brand px-4 py-3 font-semibold text-white disabled:opacity-40"
        >
          {busy ? "Reading your files…" : "Find my subscriptions"}
        </button>
      </form>

      {error && <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}

      {response && (
        <section className="space-y-4 rounded-xl bg-white p-4">
          <h2 className="font-semibold">Files read</h2>
          <ul className="space-y-1 text-sm">
            {response.results.map((r, i) => (
              <li key={i}>✅ {r.fileName}: {r.count} {r.source} records</li>
            ))}
            {response.errors.map((r, i) => (
              <li key={`e${i}`} className="text-red-700">⚠️ {r.fileName}: {r.error}</li>
            ))}
          </ul>
          {response.needsMapping.map((m) => (
            <ColumnMapper key={m.fileName} info={m} busy={busy} onSubmit={(file, mapping) => send([file], { [file.name]: mapping })} />
          ))}
          {response.results.length > 0 && response.needsMapping.length === 0 && (
            <button onClick={() => router.push("/review")} className="w-full rounded-xl bg-brand px-4 py-3 font-semibold text-white">
              Continue: {response.subscriptions ?? 0} subscriptions found
            </button>
          )}
        </section>
      )}
    </div>
  );
}

/** Manual column mapping for a bank CSV layout we don't know. The user re-selects the file: we never kept it. */
function ColumnMapper({ info, busy, onSubmit }: { info: NeedsMapping; busy: boolean; onSubmit: (file: File, m: ColumnMapping) => void }) {
  const h = info.headers;
  const [date, setDate] = useState(h[0] ?? "");
  const [label, setLabel] = useState<string[]>(h[1] ? [h[1]] : []);
  const [mode, setMode] = useState<"single" | "split">("single");
  const [amount, setAmount] = useState(h[2] ?? "");
  const [debit, setDebit] = useState(h[2] ?? "");
  const [credit, setCredit] = useState(h[3] ?? "");
  const [negative, setNegative] = useState(true);
  const [dateOrder, setDateOrder] = useState<"DMY" | "MDY" | "YMD">("DMY");
  const [currency, setCurrency] = useState("EUR");
  const [file, setFile] = useState<File | null>(null);

  const select = (value: string, set: (v: string) => void, name: string) => (
    <label className="block text-sm">
      <span className="text-slate-600">{name}</span>
      <select className="mt-1 w-full rounded border border-slate-300 px-2 py-2" value={value} onChange={(e) => set(e.target.value)}>
        {h.map((x) => <option key={x}>{x}</option>)}
      </select>
    </label>
  );

  return (
    <div className="space-y-3 rounded-lg border border-amber-300 bg-amber-50 p-4">
      <p className="text-sm">
        We don&apos;t know the layout of <strong>{info.fileName}</strong> yet. Tell us which column is which.
      </p>
      <div className="overflow-x-auto">
        <table className="text-xs">
          <thead><tr>{h.map((x) => <th key={x} className="px-2 text-left">{x}</th>)}</tr></thead>
          <tbody>{info.preview.slice(0, 3).map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} className="px-2">{c}</td>)}</tr>)}</tbody>
        </table>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {select(date, setDate, "Date")}
        <label className="block text-sm">
          <span className="text-slate-600">Description (one or more)</span>
          <select multiple className="mt-1 w-full rounded border border-slate-300 px-2 py-1" value={label} onChange={(e) => setLabel(Array.from(e.target.selectedOptions).map((o) => o.value))}>
            {h.map((x) => <option key={x}>{x}</option>)}
          </select>
        </label>
        <label className="block text-sm">
          <span className="text-slate-600">Amounts</span>
          <select className="mt-1 w-full rounded border border-slate-300 px-2 py-2" value={mode} onChange={(e) => setMode(e.target.value as "single" | "split")}>
            <option value="single">One amount column</option>
            <option value="split">Separate debit and credit columns</option>
          </select>
        </label>
        {mode === "single" ? (
          <>
            {select(amount, setAmount, "Amount")}
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={negative} onChange={(e) => setNegative(e.target.checked)} /> Payments are negative numbers
            </label>
          </>
        ) : (
          <>
            {select(debit, setDebit, "Debit")}
            {select(credit, setCredit, "Credit")}
          </>
        )}
        <label className="block text-sm">
          <span className="text-slate-600">Date format</span>
          <select className="mt-1 w-full rounded border border-slate-300 px-2 py-2" value={dateOrder} onChange={(e) => setDateOrder(e.target.value as "DMY")}>
            <option value="DMY">Day/Month/Year</option>
            <option value="MDY">Month/Day/Year</option>
            <option value="YMD">Year-Month-Day</option>
          </select>
        </label>
        <label className="block text-sm">
          <span className="text-slate-600">Currency</span>
          <input className="mt-1 w-full rounded border border-slate-300 px-2 py-2" value={currency} maxLength={3} onChange={(e) => setCurrency(e.target.value.toUpperCase())} />
        </label>
      </div>
      <label className="block text-sm">
        <span className="text-slate-600">Select {info.fileName} again (we deleted it after the first read)</span>
        <input type="file" accept=".csv" className="mt-1 block w-full text-sm" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      </label>
      <button
        disabled={busy || !file || label.length === 0}
        className="w-full rounded-lg bg-brand px-4 py-2 font-semibold text-white disabled:opacity-40"
        onClick={() =>
          file &&
          onSubmit(new File([file], info.fileName, { type: file.type }), {
            date,
            label,
            ...(mode === "single" ? { amount, chargesAreNegative: negative } : { debit, credit }),
            dateOrder,
            defaultCurrency: currency || "EUR",
          })
        }
      >
        Read this file
      </button>
    </div>
  );
}
