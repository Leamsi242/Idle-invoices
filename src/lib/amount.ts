/**
 * Parses "1 234,56", "1,234.56", "-12.99", "12,99 €", "€9.99", "(12.00)".
 * Guesses the decimal separator from the last separator followed by 1 or 2 digits.
 */
export function parseAmount(input: string | number | null | undefined): number | null {
  if (input === null || input === undefined) return null;
  if (typeof input === "number") return Number.isFinite(input) ? input : null;
  let s = input.trim();
  if (!s) return null;
  const negative = /^\(.*\)$/.test(s) || /^-|-\s*$|^−/.test(s.replace(/[€$£\s]|EUR|USD|GBP/g, ""));
  s = s.replace(/[^\d.,]/g, "");
  if (!s) return null;
  const lastSep = Math.max(s.lastIndexOf(","), s.lastIndexOf("."));
  let value: number;
  if (lastSep >= 0 && s.length - lastSep - 1 <= 2 && s.length - lastSep - 1 > 0) {
    const intPart = s.slice(0, lastSep).replace(/[.,]/g, "");
    value = Number(`${intPart}.${s.slice(lastSep + 1)}`);
  } else {
    value = Number(s.replace(/[.,]/g, ""));
  }
  if (!Number.isFinite(value)) return null;
  return negative ? -value : value;
}

export const round2 = (n: number) => Math.round(n * 100) / 100;

export function detectCurrency(text: string, fallback = "EUR"): string {
  if (/€|\bEUR(?:OS?)?\b|\beuros?\b/i.test(text)) return "EUR";
  if (/£|\bGBP\b/i.test(text)) return "GBP";
  if (/\$|\bUSD\b/i.test(text)) return "USD";
  if (/\bCHF\b/i.test(text)) return "CHF";
  return fallback;
}
