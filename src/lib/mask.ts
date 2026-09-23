/**
 * Masks IBANs, card numbers and account numbers. Runs inside every parser,
 * before anything is stored (SPEC.md, "Privacy and security").
 */
const IBAN = /\b[A-Z]{2}\d{2}(?:[ -]?[A-Z0-9]{4}){2,7}(?:[ -]?[A-Z0-9]{1,3})?\b/g;
// Card numbers written in groups of four ("4970 1012 3456 7890").
const GROUPED_CARD = /\b\d{4}([ -])\d{4}\1\d{4}\1\d{1,7}\b/g;
// Unseparated 13 to 19 digits that pass the Luhn check.
const CARD = /\b\d{13,19}\b/g;
// Already partly masked card numbers such as "XXXX XXXX XXXX 1234" or "**** 1234".
const PARTIAL_CARD = /(?:[X*•]{4}[ -]?){1,3}(\d{4})\b/gi;
// Any remaining long digit run (account numbers, references with 8+ digits).
const ACCOUNT = /\b\d{8,}\b/g;

const last4 = (s: string) => s.replace(/[^A-Z0-9]/gi, "").slice(-4);

function luhn(digits: string): boolean {
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let d = Number(digits[digits.length - 1 - i]);
    if (i % 2 === 1) d = d * 2 > 9 ? d * 2 - 9 : d * 2;
    sum += d;
  }
  return sum % 10 === 0;
}

export function maskSensitive(text: string): string {
  if (!text) return text;
  return text
    .replace(IBAN, (m) => (/\d{6,}/.test(m.replace(/[ -]/g, "")) ? `IBAN ••••${last4(m)}` : m))
    .replace(GROUPED_CARD, (m) => `CARD ••••${last4(m)}`)
    .replace(CARD, (m) => (luhn(m) ? `CARD ••••${last4(m)}` : m))
    .replace(PARTIAL_CARD, (_m, d: string) => `••••${d}`)
    .replace(ACCOUNT, (m) => `••••${last4(m)}`);
}
