import type { NormalizedTransaction } from "../types";
import { parseAmount } from "../amount";
import { makeTx } from "./common";

/**
 * American Express France statements. Extracted as text, each page gives three separate
 * blocks in the same order: the dates ("8 juil 8 juil", "CR" under or after a credit), the
 * descriptions, and the amounts in euros. Two layouts exist:
 * - since 2022: descriptions follow the "Page k / n" line and the N last euro amounts of the
 *   page belong to its N date lines (the first page also shows the balance);
 * - before: the amounts come first, above the Amex address (payments received, "Opérations
 *   pour <name>", "Autres transactions"), and the descriptions follow the direct debit notice
 *   ("au minimum 3 ou 4 jours ...").
 * Checked against the statement header "previous - credits + debits = new balance".
 */
const MONTHS: Record<string, number> = { jan: 1, janv: 1, fév: 2, févr: 2, fev: 2, mars: 3, avr: 4, mai: 5, juin: 6, juil: 7, août: 8, aout: 8, sept: 9, oct: 10, nov: 11, déc: 12, dec: 12 };
const DATE_LINE = /^(\d{1,2}) ([a-zéû]+)\.? (\d{1,2}) ([a-zéû]+)\.?( CR)?$/i;
const EUR_AMOUNT = /^\d{1,3}(?: \d{3})*,\d{2}$/;
const BOILERPLATE = /^(?:page \d+ \/ \d+|\d{2} \d{2} \d{2} \d{2} \d{2},?|7j\/7|le règlement de votre relevé|en cas de rejet|prélèvement au minimum|\.)/i;

export function isAmexStatement(text: string): boolean {
  return /american express/i.test(text) && /Relevé de compte|Opérations pour/i.test(text);
}

export interface AmexCheck { statementDate: string; expectedDebits: number; parsedDebits: number }

export function parseAmexStatementText(text: string): { transactions: NormalizedTransaction[]; check?: AmexCheck } {
  const header = text.match(/(\d{2})\/(\d{2})\/(\d{2}) \d{2}\/\d{2}\/\d{2}/);
  if (!header) return { transactions: [] };
  const stmtYear = 2000 + +header[3];
  const stmtMonth = +header[2];
  const totals = text.match(/([\d ]+,\d{2}) - ([\d ]+,\d{2}) \+ ([\d ]+,\d{2}) = ([\d ]+,\d{2})/);

  const out: NormalizedTransaction[] = [];
  for (const page of text.split(/-- \d+ of \d+ --/)) {
    const lines = page.split(/\r?\n/).map((l) => l.replace(/\s+/g, " ").trim()).filter(Boolean);
    const dates: { day: number; month: number; credit: boolean }[] = [];
    let lastDateIdx = -1;
    lines.forEach((l, i) => {
      const m = l.match(DATE_LINE);
      if (m && MONTHS[m[2].toLowerCase()]) {
        dates.push({ day: +m[1], month: MONTHS[m[2].toLowerCase()], credit: !!m[5] });
        lastDateIdx = i;
      } else if (l === "CR" && dates.length && i === lastDateIdx + 1) {
        dates[dates.length - 1].credit = true;
      }
    });
    if (dates.length === 0) continue;

    const n = dates.length;
    let descriptions: string[] = [];
    let amounts: string[] = [];
    const addressLine = lines.findIndex((l) => /^AMERICAN EXPRESS CARTE FRANCE$/.test(l));
    const noticeLine = lines.findIndex((l) => /^au minimum \d/i.test(l));
    const topAmounts = addressLine > 0 ? lines.slice(0, addressLine).filter((l) => EUR_AMOUNT.test(l)) : [];
    if (noticeLine >= 0 && topAmounts.length === n) {
      // Older layout: amounts above the address block, descriptions after the notice.
      amounts = topAmounts;
      descriptions = lines.slice(noticeLine + 1).filter((l) => !BOILERPLATE.test(l)).slice(0, n);
    } else {
      // Descriptions: the first lines after the page's boilerplate that follows the date block.
      const pageLine = lines.findIndex((l, i) => i > lastDateIdx && /^page \d+ \/ \d+$/i.test(l));
      for (let i = pageLine + 1; i < lines.length && descriptions.length < n; i++) {
        if (BOILERPLATE.test(lines[i])) continue;
        descriptions.push(lines[i]);
      }
      amounts = lines.slice(pageLine + 1).filter((l) => EUR_AMOUNT.test(l)).slice(-n);
    }
    if (descriptions.length !== n || amounts.length !== n) continue;

    dates.forEach((d, i) => {
      const year = d.month > stmtMonth ? stmtYear - 1 : stmtYear;
      const value = parseAmount(amounts[i]) ?? 0;
      out.push(makeTx({
        date: `${year}-${String(d.month).padStart(2, "0")}-${String(d.day).padStart(2, "0")}`,
        amount: d.credit ? -value : value,
        currency: "EUR",
        rawLabel: `AMEX ${descriptions[i]}`,
        source: "bank",
      }));
    });
  }
  const parsedDebits = Math.round(out.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0) * 100) / 100;
  const check = totals ? { statementDate: `${stmtYear}-${header[2]}-${header[1]}`, expectedDebits: parseAmount(totals[3]) ?? 0, parsedDebits } : undefined;
  return { transactions: out, check };
}
