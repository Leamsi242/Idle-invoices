import type { NormalizedTransaction } from "../types";
import { detectCurrency, parseAmount } from "../amount";
import { parseDate } from "../dates";
import { makeTx } from "./common";

// "06/10/2025  [07/10/2025]  PRLV SEPA CANAL+   -34,99 [EUR]"
const LINE = /^(\d{2}[/.-]\d{2}[/.-]\d{2,4})\s+(?:\d{2}[/.-]\d{2}[/.-]\d{2,4}\s+)?(.+?)\s+([+\-−]?\s?\d[\d\s.,]*[.,]\d{2})\s?(-|€|EUR|USD|GBP)?$/;
// Lines that close a transaction block: headers, balances, page breaks.
const NOT_CONTINUATION = /^(?:date\b|solde|total|page\b|<<|--|relev|sous réserve|\(g[ed]\)|information|www\.|remarque|titulaire|c\/c |ht\.|x \d)/i;
// Credits when the statement has a single unsigned amount column (Crédit Mutuel, CIC).
const CREDIT_LABEL = /^(?:VIR(?:EMENT)?\b(?!.*\bVERS\b)|VIR INST|REMISE|REMB\w*|AVOIR|INTERETS|RETROCESSION|ANNULATION)/i;
// "PAIEMENT MOB 2906 9,54 USD": the original foreign amount is not part of the label.
const FOREIGN_AMOUNT = /\s+\d[\d.,]*[.,]\d{2}\s+(?:USD|GBP|CHF|CAD|JPY|MAD|XOF)$/;

/**
 * Turns the text of a PDF statement into transactions. Charges are "-x" or unsigned; credits
 * are "+x" or, on statements without signs, recognised by their label. A line without a date
 * right after a transaction continues its label (card payments put the merchant there).
 */
export function parseBankStatementText(text: string): NormalizedTransaction[] {
  const currency = detectCurrency(text);
  const out: { date: string; amount: number; label: string; continued: boolean }[] = [];
  let open = false;
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/\s+/g, " ").trim();
    const m = line.match(LINE);
    if (m) {
      const date = parseDate(m[1], "DMY");
      const value = parseAmount(m[3]);
      open = false;
      if (!date || value === null || value === 0) continue;
      const signed = m[3].trim().startsWith("+") ? -1 : m[3].trim().startsWith("-") ? 1 : 0;
      const label = m[2].replace(FOREIGN_AMOUNT, "").trim();
      const credit = signed === -1 || (signed === 0 && CREDIT_LABEL.test(label));
      out.push({ date, amount: credit ? -Math.abs(value) : Math.abs(value), label, continued: false });
      open = true;
      continue;
    }
    if (open && line && !NOT_CONTINUATION.test(line) && !/^\d{2}[/.-]\d{2}/.test(line)) {
      const last = out.at(-1)!;
      if (!last.continued && !last.label.includes(line.split(" ").slice(0, 2).join(" "))) last.label = `${last.label} ${line}`;
      last.continued = true;
    } else if (!line || NOT_CONTINUATION.test(line)) {
      open = false;
    }
  }
  return out.map((t) => makeTx({ date: t.date, amount: t.amount, currency, rawLabel: t.label, source: "bank" }));
}

export async function parseBankPdf(data: Uint8Array): Promise<NormalizedTransaction[]> {
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data });
  try {
    const { text } = await parser.getText();
    return parseBankStatementText(text);
  } finally {
    await parser.destroy();
  }
}
