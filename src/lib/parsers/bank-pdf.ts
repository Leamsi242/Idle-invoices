import type { NormalizedTransaction } from "../types";
import { detectCurrency, parseAmount } from "../amount";
import { parseDate } from "../dates";
import { makeTx } from "./common";
import { isAmexStatement, parseAmexStatementText } from "./amex-pdf";

// "06/10/2025  [07/10/2025]  PRLV SEPA CANAL+   -34,99 [EUR]"
// Thousands are groups of three digits ("1 234,56"): a long reference right before the amount
// ("PLVT automatique 6219204490115 54,84") stays in the label.
// A tab is a column break (Crédit Mutuel: "VIR CPAM 77<tab>613,80"): it is kept as "¦" so the
// digits before it stay in the label.
const LINE = /^(\d{2}[/.-]\d{2}[/.-]\d{2,4})\s+(?:¦\s*)?(?:\d{2}[/.-]\d{2}[/.-]\d{2,4}\s+(?:¦\s*)?)?(.+?)\s+(?:¦\s*)?([+\-−]?\s?\d{1,3}(?:[ .]\d{3})*[.,]\d{2})\s?(-|€|EUR|USD|GBP)?$/;
// Loan and revolving credit statements: instalments, interest and borrower insurance, never a
// subscription (the instalment itself shows on the current account and is left out there).
const LOAN_STATEMENT = /cr[ée]dit renouvelable|montant restant d[uû]|remboursable en \d+ mensualit[ée]s|tableau d'amortissement/i;
// Lines that close a transaction block: headers, balances, page breaks.
const NOT_CONTINUATION = /^(?:date\b|solde|total|page\b|<<|--|relev|sous réserve|\(g[ed]\)|information|www\.|remarque|titulaire|c\/c |ht\.|x \d)/i;
// Credits when the statement has a single unsigned amount column (Crédit Mutuel, CIC).
const CREDIT_LABEL = /^(?:VIR(?:EMENT)?\b(?!.*\bVERS\b)|VIR INST|REMISE|REMB\w*|AVOIR|INTERETS|RETROCESSION|ANNULATION|DEBLOCAGE)/i;
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
    const line = rawLine.replace(/\t+/g, " ¦ ").replace(/[^\S\n]+/g, " ").trim();
    const m = line.match(LINE);
    if (m) {
      const date = parseDate(m[1], "DMY");
      const value = parseAmount(m[3]);
      open = false;
      if (!date || value === null || value === 0) continue;
      const signed = m[3].trim().startsWith("+") ? -1 : m[3].trim().startsWith("-") ? 1 : 0;
      const label = m[2].replace(/\s*¦\s*/g, " ").replace(FOREIGN_AMOUNT, "").trim();
      const credit = signed === -1 || (signed === 0 && CREDIT_LABEL.test(label));
      out.push({ date, amount: credit ? -Math.abs(value) : Math.abs(value), label, continued: false });
      open = true;
      continue;
    }
    if (open && line && !NOT_CONTINUATION.test(line) && !/^\d{2}[/.-]\d{2}/.test(line)) {
      const last = out.at(-1)!;
      const text = line.replace(/\s*¦\s*/g, " ").trim();
      if (!last.continued && !last.label.includes(text.split(" ").slice(0, 2).join(" "))) last.label = `${last.label} ${text}`;
      last.continued = true;
    } else if (!line || NOT_CONTINUATION.test(line)) {
      open = false;
    }
  }
  return out.map((t) => makeTx({ date: t.date, amount: t.amount, currency, rawLabel: t.label, source: "bank" }));
}

/** Text of any PDF statement: American Express has its own layout; loan statements are skipped. */
export function parseStatementText(text: string): NormalizedTransaction[] {
  if (isAmexStatement(text)) return parseAmexStatementText(text).transactions;
  if (LOAN_STATEMENT.test(text) && !/extrait de comptes?|relev[ée] de compte courant/i.test(text)) return [];
  return parseBankStatementText(text);
}

export async function parseBankPdf(data: Uint8Array): Promise<NormalizedTransaction[]> {
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data });
  try {
    const { text } = await parser.getText();
    return parseStatementText(text);
  } finally {
    await parser.destroy();
  }
}
