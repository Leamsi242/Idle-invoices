/**
 * Masks IBANs, card numbers and account numbers. Runs inside every parser,
 * before anything is stored (SPEC.md, "Privacy and security").
 */
const IBAN = /\b[A-Z]{2}\d{2}(?:[ -]?[A-Z0-9]{4}){2,7}(?:[ -]?[A-Z0-9]{1,3})?\b/g;
// 13 to 19 digits, optionally grouped by spaces or dashes (card numbers).
const CARD = /\b\d(?:[ -]?\d){12,18}\b/g;
// Already partly masked card numbers such as "XXXX XXXX XXXX 1234" or "**** 1234".
const PARTIAL_CARD = /(?:[X*•]{4}[ -]?){1,3}(\d{4})\b/gi;
// Any remaining long digit run (account numbers, references with 8+ digits).
const ACCOUNT = /\b\d{8,}\b/g;

const last4 = (s: string) => s.replace(/[^A-Z0-9]/gi, "").slice(-4);

export function maskSensitive(text: string): string {
  if (!text) return text;
  return text
    .replace(IBAN, (m) => (/\d{6,}/.test(m.replace(/[ -]/g, "")) ? `IBAN ••••${last4(m)}` : m))
    .replace(CARD, (m) => `CARD ••••${last4(m)}`)
    .replace(PARTIAL_CARD, (_m, d: string) => `••••${d}`)
    .replace(ACCOUNT, (m) => `••••${last4(m)}`);
}
