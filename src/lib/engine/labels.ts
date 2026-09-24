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

/**
 * Transfers, cash withdrawals and card top-ups are recurring sometimes, but never subscriptions.
 * Neither are loan instalments, taxes, co-ownership charges or the monthly settlement of a
 * credit card (its own charges are on the card statement).
 */
export function isExcludedLabel(cleaned: string): boolean {
  return (
    /^(TRANSFER|VIR|VIREMENT|RETRAIT|ATM|CASH|REMISE|TOP-?UP|ECH PRET|ECHEANCE PRET|COTIS ASS PRET)\b/.test(cleaned) ||
    /\b(DGFIP|FINANCES PUBLIQ\w*|IMPOTS?|TRESOR PUBLIC|TIMBRE FISCAL|SDC|SYNDIC|AMERICAN EXPRESS|AMEX|FRANFINANCE|COFIDIS|CETELEM|SOFINCO|IMPAYE)\b/.test(cleaned) ||
    // Instalment plans (buy now, pay later) repeat monthly but are one purchase: PayPal's "4X" is
    // debited as "PAYPAL (EUROPE) S.A R", card payments as "PAYPAL *PAIEMENT".
    /PAYPAL EUROPE S\.A R\b|PAYPAL \*PAIEMENT|\b(ONEY|ALMA|FLOA|PAIEMENT EN \dX|\dX CB)\b/.test(cleaned)
  );
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

// Cities that card payments put before the merchant ("LUXEMBOURG PAYPAL *JOTFORM", "DUBLIN GOOGLE YOUTUBE").
const BILLING_CITIES = /^(?:LUXEMBOURG|DUBLIN|CORK|AMSTERDAM|LONDON|LONDRES|PARIS|BORDEAUX CEDE\w*|BERLIN|BARCELONA|MADRID|STOCKHOLM|SAN FRANCISCO|INTERNET|WWW)\s+/;

/** A readable name for an unknown label: "LUXEMBOURG PAYPAL *JOTFORM" gives "JOTFORM". */
export function displayLabel(cleaned: string): string {
  const s = cleaned.replace(BILLING_CITIES, "").replace(/^PAIEMENTS?\s+/, "");
  const behind = s.match(/^(?:PAYPAL|GOOGLE|APPLE\.COM\/BILL|PADDLE\.NET|STRIPE)\s*\*\s*(.+)$/);
  return (behind ? behind[1] : s).replace(/\.(?:COM|NET|C|N)$/, "").trim() || cleaned;
}
