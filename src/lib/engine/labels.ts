import type { Source } from "../types";

const PREFIXES = /^(CB|CARTE|ACHAT CB|PAIEMENT PAR CARTE|PAIEMENT CB|PRLV SEPA|PRLV|PRELEVEMENT|PRÉLÈVEMENT|DD|POS|CARD PAYMENT TO|CARD PAYMENT|DIRECT DEBIT)\s+/;

/**
 * Cleans a bank label so that the same merchant always gives the same key:
 * uppercase, no payment-method prefix, no references, dates or masked numbers.
 */
export function cleanLabel(raw: string): string {
  let s = raw.toUpperCase().replace(/\s+/g, " ").trim();
  for (let i = 0; i < 3 && PREFIXES.test(s); i++) s = s.replace(PREFIXES, "");
  return s
    .split(" ")
    .filter((tok) => !/\d|•/.test(tok)) // references, dates, masked numbers
    .filter((tok) => !/^(PRLV|SEPA|PRELEVEMENT|CB|CARTE)$/.test(tok))
    .join(" ")
    .replace(/[^A-Z*.&+/' -]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Transfers, cash withdrawals and card top-ups are recurring sometimes, but never subscriptions. */
export function isExcludedLabel(cleaned: string): boolean {
  return /^(TRANSFER|VIR|VIREMENT|RETRAIT|ATM|CASH|REMISE|TOP-?UP)\b/.test(cleaned);
}

export interface Intermediary { id: string; pattern: RegExp; sources: Source[] }

/** Payment intermediaries that hide the real merchant (SPEC.md, "Reconcile intermediaries"). */
export const INTERMEDIARIES: Intermediary[] = [
  { id: "paypal", pattern: /PAYPAL/, sources: ["paypal", "email"] },
  { id: "apple", pattern: /APPLE\.COM|ITUNES/, sources: ["apple", "email"] },
  { id: "google", pattern: /GOOGLE/, sources: ["google", "email"] },
  { id: "stripe", pattern: /STRIPE/, sources: ["email", "paypal"] },
  { id: "paddle", pattern: /PADDLE/, sources: ["email"] },
  { id: "klarna", pattern: /KLARNA/, sources: ["email", "paypal"] },
];

export const findIntermediary = (cleaned: string) => INTERMEDIARIES.find((i) => i.pattern.test(cleaned));

/** Word-level key used to compare merchant names: "Disney Plus" and "DISNEY PLUS*" give "DISNEY PLUS". */
export const nameKey = (s: string) => s.toUpperCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Z0-9]+/g, " ").trim();

/** True when one name contains the other as whole words. */
export function sameName(a: string, b: string): boolean {
  const x = ` ${nameKey(a)} `;
  const y = ` ${nameKey(b)} `;
  if (x.trim() === "" || y.trim() === "") return false;
  return x.includes(y) || y.includes(x);
}
