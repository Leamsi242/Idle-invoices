"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ColumnMapping } from "@/lib/parsers/bank-csv";
import { useI18n } from "./I18n";
import { formatDate } from "@/lib/i18n";
import { filterMboxStream } from "@/lib/mbox";

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
  const { m, locale } = useI18n();
  const u = m.upload;
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

  const [mboxNote, setMboxNote] = useState<string | null>(null);

  /** A Google Takeout mailbox (.mbox) is filtered here: only the receipts leave the browser. */
  async function receiptsOnly(file: File): Promise<File> {
    setMboxNote(u.mboxReading(file.name));
    const reader = file.stream().pipeThrough(new TextDecoderStream()).getReader();
    const chunks = (async function* () {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) return;
        yield value;
      }
    })();
    const r = await filterMboxStream(chunks);
    setMboxNote(`${u.mboxDone(r.kept, r.scanned)}${r.truncated ? ` ${u.mboxCut}` : ""}`);
    return new File([r.mbox], file.name.replace(/\.mbox$/i, "") + "-recus.mbox", { type: "application/mbox" });
  }

  /**
   * PayPal's personal data download (.xlsx) holds every movement of the account, with balances,
   * IP addresses and account numbers: only the payments sent leave the browser, as a small CSV.
   */
  async function paypalPaymentsOnly(file: File): Promise<File> {
    setMboxNote(u.xlsxReading(file.name));
    const [{ readXlsxRows }, { looksLikePaypalLog, paypalLogToCsv }] = await Promise.all([import("@/lib/xlsx"), import("@/lib/paypal-log")]);
    const rows = await readXlsxRows(new Uint8Array(await file.arrayBuffer()));
    if (!rows.length || !looksLikePaypalLog(rows[0])) throw new Error(u.xlsxUnknown(file.name));
    const r = paypalLogToCsv(rows);
    const day = (d?: string) => (d ? formatDate(d, locale) : "");
    setMboxNote(u.xlsxDone(r.kept, r.scanned, day(r.from), day(r.to)));
    return new File([r.csv], file.name.replace(/\.xlsx$/i, "") + "-paiements.csv", { type: "text/csv" });
  }

  async function send(selected: File[], mappings: Record<string, ColumnMapping> = {}, text?: string) {
    setBusy(true);
    setError(null);
    try {
      selected = await Promise.all(selected.map((f) => (/\.mbox$/i.test(f.name) ? receiptsOnly(f) : /\.xlsx$/i.test(f.name) ? paypalPaymentsOnly(f) : f)));
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
      if (!res.ok) throw new Error(json.error ?? u.failed);
      setResponse((prev) => ({
        results: [...(prev?.results ?? []), ...json.results],
        needsMapping: json.needsMapping,
        errors: json.errors,
        subscriptions: json.subscriptions,
      }));
      setFiles([]);
      setPasted("");
    } catch (e) {
      setError(e instanceof Error ? e.message : u.failed);
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
          className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-line bg-surface p-6 text-center hover:border-brand"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            addFiles(e.dataTransfer.files);
          }}
        >
          <span className="text-3xl" aria-hidden>📄</span>
          <span className="font-medium">{u.drop}</span>
          <span className="text-sm text-muted">{u.kinds}</span>
          <input
            type="file"
            multiple
            accept=".csv,.xlsx,.pdf,.eml,.mbox,.txt,image/png,image/jpeg,image/webp"
            className="sr-only"
            onChange={(e) => addFiles(e.target.files)}
          />
        </label>

        {files.length > 0 && (
          <ul className="divide-y divide-line rounded-2xl bg-surface text-sm">
            {files.map((f) => (
              <li key={f.name} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2">
                <span className="truncate">{f.name}</span>
                <span className="flex items-center gap-2">
                  {needsHint(f) && (
                    <select
                      aria-label={u.sourceOf(f.name)}
                      className="rounded border border-line px-2 py-1"
                      value={hints[f.name] ?? "apple"}
                      onChange={(e) => setHints({ ...hints, [f.name]: e.target.value as Hint })}
                    >
                      <option value="apple">{u.appleSubs}</option>
                      <option value="google">{u.googleSubs}</option>
                      <option value="email">{u.receipt}</option>
                    </select>
                  )}
                  <button type="button" className="text-muted hover:text-leak" onClick={() => setFiles(files.filter((x) => x !== f))} aria-label={u.remove(f.name)}>
                    ✕
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}

        <details className="rounded-2xl bg-surface p-4">
          <summary className="cursor-pointer font-medium">{u.paste}</summary>
          <p className="mt-2 text-sm text-muted">{u.pasteHelp}</p>
          <select className="mt-3 w-full rounded border border-line px-2 py-2 text-sm" value={pastedHint} onChange={(e) => setPastedHint(e.target.value as Hint)} aria-label={u.pastedAria}>
            <option value="apple">{u.appleList}</option>
            <option value="google">{u.googleList}</option>
            <option value="email">{u.receiptEmail}</option>
          </select>
          <textarea
            className="mt-2 h-32 w-full rounded border border-line p-2 text-sm"
            value={pasted}
            onChange={(e) => setPasted(e.target.value)}
            placeholder={"Apple One\nIndividual (Monthly)\n€19.95/month\nRenews 17 October 2026"}
          />
        </details>

        <button
          type="submit"
          disabled={busy || (files.length === 0 && !pasted.trim())}
          className="w-full rounded-2xl bg-brand px-4 py-3 font-semibold text-on-accent disabled:opacity-40"
        >
          {busy ? u.reading : u.find}
        </button>
      </form>

      {mboxNote && <p className="rounded-2xl bg-surface-2 p-4 text-sm text-ink-2" role="status">{mboxNote}</p>}
      {error && <p className="rounded-2xl bg-leak-soft p-4 text-sm text-leak">{error}</p>}

      {response && (
        <section className="space-y-4 rounded-2xl bg-surface p-4">
          <h2 className="font-semibold">{u.filesRead}</h2>
          <ul className="space-y-1 text-sm">
            {response.results.map((r, i) => (
              <li key={i}>✅ {r.fileName} : {u.records(r.count, r.source)}</li>
            ))}
            {response.errors.map((r, i) => (
              <li key={`e${i}`} className="text-leak">⚠️ {r.fileName}: {r.error}</li>
            ))}
          </ul>
          {response.needsMapping.map((m) => (
            <ColumnMapper key={m.fileName} info={m} busy={busy} onSubmit={(file, mapping) => send([file], { [file.name]: mapping })} />
          ))}
          {response.results.length > 0 && (
            <a href="/start" className="block text-sm text-brand underline">{u.missing}</a>
          )}
          {response.results.length > 0 && response.needsMapping.length === 0 && (
            <button onClick={() => router.push("/subscriptions?f=todo")} className="w-full rounded-2xl bg-brand px-4 py-3 font-semibold text-on-accent">
              {u.continue(response.subscriptions ?? 0)}
            </button>
          )}
        </section>
      )}
    </div>
  );
}

const MAPPER = {
  en: {
    intro: (f: string) => <>We don&apos;t know the layout of <strong>{f}</strong> yet. Tell us which column is which.</>,
    date: "Date", description: "Description (one or more)", amounts: "Amounts", single: "One amount column", split: "Separate debit and credit columns",
    amount: "Amount", negative: "Payments are negative numbers", debit: "Debit", credit: "Credit", dateFormat: "Date format",
    dmy: "Day/Month/Year", mdy: "Month/Day/Year", ymd: "Year-Month-Day", currency: "Currency",
    again: (f: string) => `Select ${f} again (we deleted it after the first read)`,
  },
  fr: {
    intro: (f: string) => <>Nous ne connaissons pas encore la présentation de <strong>{f}</strong>. Indiquez-nous le rôle de chaque colonne.</>,
    date: "Date", description: "Libellé (une ou plusieurs colonnes)", amounts: "Montants", single: "Une seule colonne de montant", split: "Colonnes débit et crédit séparées",
    amount: "Montant", negative: "Les paiements sont en négatif", debit: "Débit", credit: "Crédit", dateFormat: "Format de date",
    dmy: "Jour/Mois/Année", mdy: "Mois/Jour/Année", ymd: "Année-Mois-Jour", currency: "Devise",
    again: (f: string) => `Sélectionnez à nouveau ${f} (nous l\u2019avons supprimé après la première lecture)`,
  },
};

/** Manual column mapping for a bank CSV layout we don't know. The user re-selects the file: we never kept it. */
function ColumnMapper({ info, busy, onSubmit }: { info: NeedsMapping; busy: boolean; onSubmit: (file: File, m: ColumnMapping) => void }) {
  const { m } = useI18n();
  const t = MAPPER[m.lang];
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
      <span className="text-muted">{name}</span>
      <select className="mt-1 w-full rounded border border-line px-2 py-2" value={value} onChange={(e) => set(e.target.value)}>
        {h.map((x) => <option key={x}>{x}</option>)}
      </select>
    </label>
  );

  return (
    <div className="space-y-3 rounded-lg border border-warn/40 bg-warn-soft p-4">
      <p className="text-sm">
        {t.intro(info.fileName)}
      </p>
      <div className="overflow-x-auto">
        <table className="text-xs">
          <thead><tr>{h.map((x) => <th key={x} className="px-2 text-left">{x}</th>)}</tr></thead>
          <tbody>{info.preview.slice(0, 3).map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} className="px-2">{c}</td>)}</tr>)}</tbody>
        </table>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {select(date, setDate, t.date)}
        <label className="block text-sm">
          <span className="text-muted">{t.description}</span>
          <select multiple className="mt-1 w-full rounded border border-line px-2 py-1" value={label} onChange={(e) => setLabel(Array.from(e.target.selectedOptions).map((o) => o.value))}>
            {h.map((x) => <option key={x}>{x}</option>)}
          </select>
        </label>
        <label className="block text-sm">
          <span className="text-muted">{t.amounts}</span>
          <select className="mt-1 w-full rounded border border-line px-2 py-2" value={mode} onChange={(e) => setMode(e.target.value as "single" | "split")}>
            <option value="single">{t.single}</option>
            <option value="split">{t.split}</option>
          </select>
        </label>
        {mode === "single" ? (
          <>
            {select(amount, setAmount, t.amount)}
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={negative} onChange={(e) => setNegative(e.target.checked)} /> {t.negative}
            </label>
          </>
        ) : (
          <>
            {select(debit, setDebit, t.debit)}
            {select(credit, setCredit, t.credit)}
          </>
        )}
        <label className="block text-sm">
          <span className="text-muted">{t.dateFormat}</span>
          <select className="mt-1 w-full rounded border border-line px-2 py-2" value={dateOrder} onChange={(e) => setDateOrder(e.target.value as "DMY")}>
            <option value="DMY">{t.dmy}</option>
            <option value="MDY">{t.mdy}</option>
            <option value="YMD">{t.ymd}</option>
          </select>
        </label>
        <label className="block text-sm">
          <span className="text-muted">{t.currency}</span>
          <input className="mt-1 w-full rounded border border-line px-2 py-2" value={currency} maxLength={3} onChange={(e) => setCurrency(e.target.value.toUpperCase())} />
        </label>
      </div>
      <label className="block text-sm">
        <span className="text-muted">{t.again(info.fileName)}</span>
        <input type="file" accept=".csv" className="mt-1 block w-full text-sm" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      </label>
      <button
        disabled={busy || !file || label.length === 0}
        className="w-full rounded-lg bg-brand px-4 py-2 font-semibold text-on-accent disabled:opacity-40"
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
