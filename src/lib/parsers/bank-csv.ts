import Papa from "papaparse";
import type { NormalizedTransaction } from "../types";
import { parseAmount } from "../amount";
import { parseDate, type DateOrder } from "../dates";
import { makeTx } from "./common";

/**
 * Tells the parser which columns hold what. Used by the built-in layouts and by the
 * manual column-mapping screen for any other bank.
 */
export interface ColumnMapping {
  date: string;
  label: string[]; // joined with a space, e.g. payee + reference
  amount?: string; // single signed column
  debit?: string; // or separate debit and credit columns
  credit?: string;
  currency?: string; // column holding the currency
  defaultCurrency?: string;
  dateOrder?: DateOrder;
  /** For a single amount column: are charges negative (most banks) or positive? */
  chargesAreNegative?: boolean;
  /** Column whose value tells us the row is a transfer (ignored by the engine). */
  typeColumn?: string;
}

export interface BankLayout {
  id: string;
  name: string;
  required: string[]; // header names that identify the layout
  mapping: ColumnMapping;
}

export const BANK_LAYOUTS: BankLayout[] = [
  {
    id: "n26",
    name: "N26",
    required: ["Date", "Payee", "Amount (EUR)"],
    mapping: { date: "Date", label: ["Payee", "Payment reference"], amount: "Amount (EUR)", defaultCurrency: "EUR", dateOrder: "YMD", chargesAreNegative: true, typeColumn: "Transaction type" },
  },
  {
    id: "revolut",
    name: "Revolut",
    required: ["Started Date", "Description", "Amount", "Currency"],
    mapping: { date: "Started Date", label: ["Description"], amount: "Amount", currency: "Currency", dateOrder: "YMD", chargesAreNegative: true, typeColumn: "Type" },
  },
  {
    id: "fr-debit-credit",
    name: "French bank (Débit / Crédit)",
    required: ["Date opération", "Libellé", "Débit", "Crédit"],
    mapping: { date: "Date opération", label: ["Libellé"], debit: "Débit", credit: "Crédit", defaultCurrency: "EUR", dateOrder: "DMY" },
  },
  {
    id: "uk-debit-credit",
    name: "UK bank (Debit / Credit Amount)",
    required: ["Transaction Date", "Transaction Description", "Debit Amount", "Credit Amount"],
    mapping: { date: "Transaction Date", label: ["Transaction Description"], debit: "Debit Amount", credit: "Credit Amount", defaultCurrency: "GBP", dateOrder: "DMY" },
  },
];

/** Thrown when no built-in layout fits: the UI shows the column-mapping screen. */
export class NeedsMappingError extends Error {
  constructor(public headers: string[], public preview: string[][]) {
    super("Unknown bank CSV layout: please map the columns.");
    this.name = "NeedsMappingError";
  }
}

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();

function readRows(text: string): string[][] {
  const { data } = Papa.parse<string[]>(text.replace(/^﻿/, ""), { skipEmptyLines: "greedy" });
  return data.map((r) => r.map((c) => (c ?? "").trim()));
}

function findLayout(row: string[]): BankLayout | undefined {
  const cells = new Set(row.map(norm));
  return BANK_LAYOUTS.find((l) => l.required.every((h) => cells.has(norm(h))));
}

/**
 * Recognises the usual column names of any other bank ("Date", "Libellé", "Débit", "Crédit";
 * "Booking date", "Description", "Amount") so that most exports need no mapping screen.
 */
function guessLayout(row: string[], data: string[][]): BankLayout | undefined {
  const heads = row.map(norm);
  const find = (re: RegExp, not?: RegExp) => row.find((_, i) => re.test(heads[i]) && !(not && not.test(heads[i])));
  const date =
    find(/^date.*(operation|transaction|achat|booking)|^(operation|transaction|booking) date/) ?? find(/^date\b|\bdate$/, /valeur|value|comptab/);
  const label = find(/libell|description|intitule|detail|payee|beneficiaire|merchant|commercant|wording|^label$|^narrative$/);
  const debit = find(/^(debit|montant debit|debit amount|paid out|money out)\b/);
  const credit = find(/^(credit|montant credit|credit amount|paid in|money in)\b/);
  const amount = debit && credit ? undefined : find(/^(montant|amount|somme)\b/);
  if (!date || !label || !(amount || (debit && credit))) return undefined;
  const values = data.map((r) => r[row.indexOf(date)] ?? "").filter(Boolean);
  const dateOrder: DateOrder = values.some((v) => /^\d{4}[-/]/.test(v)) ? "YMD" : values.some((v) => /^\d{1,2}[/.-](1[3-9]|2\d|3[01])[/.-]/.test(v)) ? "MDY" : "DMY";
  const amounts = amount ? data.map((r) => parseAmount(r[row.indexOf(amount)] ?? "")).filter((a): a is number => a !== null && a !== 0) : [];
  const currency = find(/^(devise|currency)$/);
  return {
    id: "guessed",
    name: "Bank statement",
    required: [],
    mapping: { date, label: [label], amount, debit, credit, currency, defaultCurrency: "EUR", dateOrder, chargesAreNegative: !amount || amounts.some((a) => a < 0) },
  };
}

/** Finds the header row, skipping preamble lines such as "Account: ..." that some banks add. */
function locateHeader(rows: string[][]): { index: number; layout?: BankLayout } {
  for (let i = 0; i < Math.min(rows.length, 20); i++) {
    const layout = findLayout(rows[i]);
    if (layout) return { index: i, layout };
  }
  for (let i = 0; i < Math.min(rows.length, 20); i++) {
    const layout = guessLayout(rows[i], rows.slice(i + 1, i + 30));
    if (layout) return { index: i, layout };
  }
  const index = rows.findIndex((r) => r.filter(Boolean).length >= 3 && r.every((c) => !/^-?[\d\s.,]+$/.test(c) || !c));
  return { index: Math.max(index, 0) };
}

export function looksLikeBankCsv(text: string): boolean {
  const rows = readRows(text).slice(0, 20);
  return rows.some((r, i) => findLayout(r) || guessLayout(r, rows.slice(i + 1)));
}

export function parseBankCsv(text: string, mapping?: ColumnMapping): NormalizedTransaction[] {
  const rows = readRows(text);
  const { index, layout } = locateHeader(rows);
  const headers = rows[index] ?? [];
  const map = mapping ?? layout?.mapping;
  if (!map) throw new NeedsMappingError(headers, rows.slice(index + 1, index + 6));

  const col = (name?: string) => (name ? headers.findIndex((h) => norm(h) === norm(name)) : -1);
  const iDate = col(map.date);
  const iLabels = map.label.map(col).filter((i) => i >= 0);
  const iAmount = col(map.amount);
  const iDebit = col(map.debit);
  const iCredit = col(map.credit);
  const iCurrency = col(map.currency);
  const iType = col(map.typeColumn);
  if (iDate < 0 || iLabels.length === 0 || (iAmount < 0 && iDebit < 0)) {
    throw new NeedsMappingError(headers, rows.slice(index + 1, index + 6));
  }

  const out: NormalizedTransaction[] = [];
  for (const row of rows.slice(index + 1)) {
    const date = parseDate(row[iDate] ?? "", map.dateOrder ?? "DMY");
    if (!date) continue;
    let amount: number | null;
    if (iAmount >= 0) {
      const raw = parseAmount(row[iAmount]);
      amount = raw === null ? null : map.chargesAreNegative === false ? raw : -raw;
    } else {
      const debit = parseAmount(row[iDebit]);
      const credit = parseAmount(row[iCredit]);
      amount = debit ? Math.abs(debit) : credit ? -Math.abs(credit) : null;
    }
    if (amount === null || amount === 0) continue;
    let label = iLabels.map((i) => row[i]).filter(Boolean).join(" ");
    if (iType >= 0 && /transfer|virement|topup|top-up|exchange/i.test(row[iType] ?? "")) label = `TRANSFER ${label}`;
    out.push(makeTx({ date, amount, currency: (iCurrency >= 0 && row[iCurrency]) || map.defaultCurrency || "EUR", rawLabel: label, source: "bank" }));
  }
  return out;
}

/** Headers and a few rows, for the column-mapping screen. */
export function previewCsv(text: string): { headers: string[]; preview: string[][] } {
  const rows = readRows(text);
  const { index } = locateHeader(rows);
  return { headers: rows[index] ?? [], preview: rows.slice(index + 1, index + 6) };
}
