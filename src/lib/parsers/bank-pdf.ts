import type { NormalizedTransaction } from "../types";
import { detectCurrency, parseAmount } from "../amount";
import { parseDate } from "../dates";
import { makeTx } from "./common";

// "06/10/2025  [07/10/2025]  PRLV SEPA CANAL+   -34,99 [EUR]"
const LINE = /^(\d{2}[/.-]\d{2}[/.-]\d{2,4})\s+(?:\d{2}[/.-]\d{2}[/.-]\d{2,4}\s+)?(.+?)\s+([+-−]?\s?\d[\d\s.,]*[.,]\d{2})\s?(-|€|EUR|USD|GBP)?$/;

/** Turns the text of a PDF statement into transactions. Charges are "-x" or unsigned; credits are "+x". */
export function parseBankStatementText(text: string): NormalizedTransaction[] {
  const currency = detectCurrency(text);
  const out: NormalizedTransaction[] = [];
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/\s+/g, " ").trim();
    const m = line.match(LINE);
    if (!m) continue;
    const date = parseDate(m[1], "DMY");
    const value = parseAmount(m[3]);
    if (!date || value === null || value === 0) continue;
    const isCredit = m[3].trim().startsWith("+");
    const amount = isCredit ? -Math.abs(value) : Math.abs(value);
    out.push(makeTx({ date, amount, currency, rawLabel: m[2], source: "bank" }));
  }
  return out;
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
