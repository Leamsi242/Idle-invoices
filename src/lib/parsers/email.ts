import { simpleParser } from "mailparser";
import type { Frequency, NormalizedTransaction } from "../types";
import { detectCurrency, parseAmount } from "../amount";
import { parseDate } from "../dates";
import { makeTx } from "./common";

const MONEY_SRC = String.raw`(?:€|EUR|\$|USD|£|GBP)\s?\d[\d\s.,]*\d|\d[\d\s.,]*\d\s?(?:€|EUR|\$|USD|£|GBP)`;
const MONEY = new RegExp(MONEY_SRC);
// Dates as written in receipts: "14 September 2026", "26 déc. 2026", "September 14, 2026", "14/09/2026".
const DATE_SRC = String.raw`\d{1,2}(?:er)?\s+[A-Za-zéûè]+\.?\s+\d{4}|[A-Z][a-z]+\.?\s+\d{1,2},?\s+\d{4}|\d{1,2}\/\d{1,2}\/\d{4}`;

export function detectFrequency(text: string): Frequency | undefined {
  if (/\b(annual|yearly|per year|a year|every year|\/\s?year|\/\s?yr|12 months|annuel|par an|chaque année|\/\s?an)\b/i.test(text)) return "yearly";
  if (/\b(quarterly|every 3 months|trimestriel)\b/i.test(text)) return "quarterly";
  if (/\b(weekly|per week|every week|\/\s?week|hebdomadaire|par semaine|chaque semaine|\/\s?semaine)\b/i.test(text)) return "weekly";
  if (/\b(monthly|per month|a month|every month|\/\s?month|\/\s?mo|mensuel\w*|par mois|chaque mois|tous les mois|\/\s?mois)\b/i.test(text)) return "monthly";
  return undefined;
}

const money = (s: string) => {
  const amount = parseAmount(s);
  return amount && amount > 0 ? { amount, currency: detectCurrency(s) } : null;
};

function pickAmount(text: string): { amount: number; currency: string } | null {
  const lines = text.split(/\r?\n/);
  const preferred = lines.filter((l) => /total|amount|montant|charged|prix|price|paiement|payé|paid|réglé/i.test(l));
  for (const line of [...preferred, ...lines]) {
    const m = line.match(MONEY);
    const found = m && money(m[0]);
    if (found) return found;
  }
  return null;
}

const flat = (s: string) => s.replace(/\s+/g, " ").trim();
const clean = (s: string) => s.replace(/\.{2,}$|…$/, "").replace(/[.,;:!]+$/, "").trim();

/** Payment platforms whose name hides the real service. */
function realName(name: string): string {
  if (/^google payment/i.test(name)) return "Google Play";
  if (/^apple services|^itunes/i.test(name)) return "Apple";
  return name;
}

interface Extracted { merchant?: string; plan?: string; amount?: { amount: number; currency: string }; frequency?: Frequency }

/** Google Play order confirmations: "Tinder Gold (Tinder Dating App: Date & Chat) de Tinder LLC 19,99 € par semaine". */
function googlePlay(body: string): Extracted | null {
  const text = flat(body);
  const m = text.match(new RegExp(String.raw`(?:Article Prix|Item Price)\s+(.+?)\s+(?:de|by|from)\s+([^€$£]+?)\s+(${MONEY_SRC})\s*(par semaine|par mois|par an|per week|per month|per year|\/\s?(?:week|month|year))?`, "i"));
  if (!m) return null;
  const item = m[1].trim();
  const paren = item.match(/^(.*?)\s*\((.+)\)$/);
  const app = paren ? paren[2].split(/[:–-]/)[0].trim() : item;
  return { merchant: app, plan: paren ? paren[1].trim() : undefined, amount: money(m[3]) ?? undefined, frequency: m[4] ? detectFrequency(m[4]) : undefined };
}

/** PayPal receipts in French and English. The merchant is in the subject or in the body. */
function paypal(subject: string, body: string): Extracted {
  const text = flat(body);
  const bySubject = subject.match(/(?:reçu pour votre paiement à|votre paiement à|receipt for your payment to|you sent a payment to|payment to)\s+(.+?)(?:\s+a été traité.*|\s+has been processed.*)?$/i)?.[1];
  const byBody =
    text.match(/Paiement à\s+(.+?)\s+\S+@\S+/i)?.[1] ??
    text.match(/Vous avez payé\s+[\d\s.,]+\s?€?\s?\w*\s+à\s+(.+?)(?:\.{3}|\.\s| Marchand|$)/i)?.[1] ??
    text.match(/en faveur de\s+(.+?)\s+Marchand/i)?.[1] ??
    text.match(/Marchand\s+(.+?)\s+(?:\S+@|Date)/i)?.[1];
  const name = bySubject ?? byBody;
  const paid =
    text.match(/\|\s*Paiement\s*\|\s*([^|]+?)\s*\|/i)?.[1] ??
    text.match(/(?:Vous avez payé|paiement de|payment of|You paid)\s+([^à]+?)\s+(?:à|to|en faveur)/i)?.[1];
  return { merchant: name ? realName(clean(name)) : undefined, amount: (paid && money(paid)) || undefined };
}

function merchantFrom(name: string | undefined, address: string | undefined, subject: string): string {
  const stripeLike = subject.match(/(?:your receipt from|reçu de|votre reçu de)\s+(.+?)(?:\s*[#[(]|$)/i)?.[1];
  if (stripeLike && !/paypal/i.test(stripeLike)) return clean(stripeLike.replace(/,?\s+(?:Limited|Ltd|Inc|PBC|SAS|BV|B\.V\.)\b.*$/i, ""));
  if (name) return name.replace(/["']/g, "").replace(/\b(team|billing|receipts?|no-?reply|service clients?)\b/gi, "").trim() || "Unknown";
  const domain = address?.split("@")[1]?.split(".").slice(-2, -1)[0] ?? "unknown";
  return domain.charAt(0).toUpperCase() + domain.slice(1);
}

/** Trial terms, renewal date and announced price, e.g. PDF Guru, Google One, WeTransfer. */
export function nextCharge(text: string): { date?: string; amount?: number } {
  const t = flat(text);
  const patterns: [RegExp, number, number | null][] = [
    // "On September 14, 2026, and every month thereafter, you will be automatically charged €49.99"
    [new RegExp(String.raw`On (${DATE_SRC}),? and every \w+ thereafter,? you will be (?:automatically )?charged (${MONEY_SRC})`, "i"), 1, 2],
    // "puis 99,99 € par an à partir du 26 déc. 2026"
    [new RegExp(String.raw`puis (${MONEY_SRC}) par \w+ à partir du (${DATE_SRC})`, "i"), 2, 1],
    // "then €69.99/year from 5 March 2027"
    [new RegExp(String.raw`then (${MONEY_SRC})\s?(?:\/|per )\w+ (?:from|starting|on) (${DATE_SRC})`, "i"), 2, 1],
    // "At your next renewal on 15 September 2026, your plan will renew for EUR 9.99"
    [new RegExp(String.raw`renewal on (${DATE_SRC}),? your plan will renew for (${MONEY_SRC})`, "i"), 1, 2],
    // "trial ends on …", "essai se termine le …"
    [new RegExp(String.raw`(?:trial (?:ends|will end|expires)(?: on)?|essai (?:gratuit )?(?:se termine|prend fin|expire)(?: le)?)\s+(${DATE_SRC})`, "i"), 1, null],
    // "renouvelé le 21 juil. 2026", "renews on …", "Next billing date: …", "prochain prélèvement le …"
    // Cancellation notices: "sera annulé le 18 août 2026", "This will take effect on 29 September 2026".
    [new RegExp(String.raw`(?:sera annulé le|prendra fin le|prendront fin le|take effect on|access until|accès jusqu'au)\s+(${DATE_SRC})`, "i"), 1, null],
    [new RegExp(String.raw`(?:renouvelé le|renouvellement le|renews?(?: automatically)? on|will renew on|next (?:renewal|payment|billing)(?: date)?(?: on)?|prochain (?:paiement|prélèvement)(?: le)?|prochaine échéance(?: le)?)\s*:?\s*(${DATE_SRC})`, "i"), 1, null],
  ];
  for (const [re, dateIdx, amountIdx] of patterns) {
    const m = t.match(re);
    if (!m) continue;
    const date = parseDate(m[dateIdx]) ?? undefined;
    const amount = amountIdx ? parseAmount(m[amountIdx]) ?? undefined : undefined;
    if (date) return { date, amount: amount && amount > 0 ? amount : undefined };
  }
  return {};
}

const SKIP = /paiement en 4x|payer en plusieurs fois|échéance de votre paiement|4x sans frais|pay in 4|\bvous avez envoyé un paiement\b|you sent money|remboursement|refund|information de paiement|échec de (?:votre )?paiement|payment failed|a échoué/i;
// No trailing \b: "é" is not a word character for JavaScript regexes.
const CANCELLED = /\b(has been cancel+ed|cancel+ation confirmed|you(?:'ve| have) cancel+ed|a été (?:annulé|résilié)|sera annulé|avez résilié|résiliation|prendront bientôt fin|subscription (?:has )?ended|will be cancel+ed)(?![a-z])/i;

export interface ReceiptFields { merchant: string; subject: string; date: string; body: string; senderName?: string; senderAddress?: string }

/**
 * Extracts merchant, amount, plan, frequency, trial terms and next charge from a receipt.
 * Cancellation emails come back as an amount-0 record, used as evidence that a subscription
 * stopped. Instalment plans, transfers to people, refunds and failed payments are skipped.
 */
export function receiptToTransaction(r: ReceiptFields): NormalizedTransaction | null {
  const all = `${r.subject}\n${r.body}`;
  const sender = `${r.senderName ?? ""} ${r.senderAddress ?? ""}`;
  let merchant = r.merchant;
  let plan: string | undefined;
  let amount: { amount: number; currency: string } | null | undefined;
  let frequency: Frequency | undefined;

  if (/google ?play/i.test(sender + r.subject)) {
    const g = googlePlay(r.body);
    if (g) {
      merchant = g.merchant ?? merchant;
      plan = g.plan;
      frequency = g.frequency;
      amount = g.amount;
    }
    const cancelled = r.body.match(/abonnement (?:à )?(.+?),? proposé par|Your (.+?) subscription from/i);
    if (cancelled && CANCELLED.test(all)) merchant = clean((cancelled[1] ?? cancelled[2]).split(/[:–-]/)[0]);
    else if (!g && /abonnement\s+(.+?)\s+\(/i.test(r.body)) merchant = clean(r.body.match(/abonnement\s+(.+?)\s+\(/i)![1].split(/[:–-]/)[0]);
  } else if (/paypal/i.test(sender)) {
    if (SKIP.test(r.subject)) return null;
    const p = paypal(r.subject, r.body);
    if (p.merchant) merchant = p.merchant;
    amount = p.amount;
  }

  const isCancellation = CANCELLED.test(r.subject) || (CANCELLED.test(r.body.slice(0, 600)) && !MONEY.test(r.body.slice(0, 600)));
  if (!isCancellation && SKIP.test(r.subject)) return null;
  const next = nextCharge(all);

  if (isCancellation) {
    return makeTx({ date: r.date, amount: 0, currency: "EUR", rawLabel: `EMAIL ${merchant}: ${r.subject}`, source: "email", merchant, isCancellation: true, nextChargeDate: next.date });
  }

  amount ??= pickAmount(r.body) ?? pickAmount(r.subject);
  // Keep the payment platform in the label: it decides how to cancel.
  const via = /paypal/i.test(sender) ? "PAYPAL " : /google ?play/i.test(sender) ? "GOOGLE PLAY " : /apple|itunes/i.test(sender) ? "APPLE.COM " : "";
  if (!amount) return null;
  return makeTx({
    date: r.date,
    amount: amount.amount,
    currency: amount.currency,
    rawLabel: `EMAIL ${via}${merchant}: ${r.subject}`,
    source: "email",
    merchant,
    plan: plan ?? r.body.match(/^\s*(?:plan|formule|abonnement)\s*:\s*(.+)$/im)?.[1] ?? r.subject,
    frequency: frequency ?? detectFrequency(all),
    isTrial: /\b(free trial|trial|essai gratuit|période d'essai|essai de \d+ jours|\d+-day trial)\b/i.test(all),
    nextChargeDate: next.date,
    nextChargeAmount: next.amount,
  });
}

export async function parseEml(raw: Buffer | string): Promise<NormalizedTransaction | null> {
  const mail = await simpleParser(raw);
  const from = mail.from?.value[0];
  const body = mail.text ?? (typeof mail.html === "string" ? mail.html.replace(/<[^>]+>/g, " ") : "");
  const subject = mail.subject ?? "";
  return receiptToTransaction({
    merchant: merchantFrom(from?.name, from?.address, subject),
    subject,
    date: (mail.date ?? new Date()).toISOString().slice(0, 10),
    body,
    senderName: from?.name,
    senderAddress: from?.address,
  });
}

/** A forwarded or pasted receipt: first line "From: ...", or merchant given by the user. */
export function parseReceiptText(text: string, merchantHint?: string): NormalizedTransaction | null {
  const from = text.match(/^From:\s*(?:"?([^"<\n]+?)"?\s*)?<?([^\s>]+@[^\s>]+)>?/im);
  const subject = text.match(/^Subject:\s*(.+)$/im)?.[1]?.trim() ?? text.split(/\r?\n/).find((l) => l.trim())?.trim() ?? "";
  const dateLine = text.match(/^Date:\s*(.+)$/im)?.[1];
  const date = (dateLine && (parseDate(dateLine) ?? (Date.parse(dateLine) ? new Date(dateLine).toISOString().slice(0, 10) : null))) || new Date().toISOString().slice(0, 10);
  return receiptToTransaction({ merchant: merchantHint ?? merchantFrom(from?.[1], from?.[2], subject), subject, date, body: text, senderName: from?.[1], senderAddress: from?.[2] });
}

const RECEIPT_WORDS = /\b(receipt|invoice|facture|reçu|recu de paiement|order confirmation|confirmation de (?:votre )?(?:commande|paiement)|payment (?:received|confirmation|to)|paiement|your (?:subscription|plan|membership)|votre abonnement|renews?|renewal|renouvel\w*|trial|essai|charged|débité|prélèvement|billing|facturation|total)\b/i;
const MARKETING = /\b(\d+\s?% off|% de réduction|promo code|code promo|limited time|offre limitée|sale ends|black friday|webinar|newsletter)\b/i;

/**
 * Keeps receipts, billing and cancellation emails, drops newsletters and promotions that
 * merely mention a price. Used when scanning a whole mailbox, where most emails are not receipts.
 */
export function looksLikeReceipt(subject: string, body: string): boolean {
  const text = `${subject}\n${body.slice(0, 4000)}`;
  if (MARKETING.test(subject)) return false;
  if (CANCELLED.test(subject)) return true;
  return RECEIPT_WORDS.test(text) && MONEY.test(text);
}
