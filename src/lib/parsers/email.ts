import { simpleParser } from "mailparser";
import type { Frequency, NormalizedTransaction } from "../types";
import { detectCurrency, parseAmount } from "../amount";
import { parseDate } from "../dates";
import { makeTx } from "./common";

const MONEY = /(?:€|EUR|\$|USD|£|GBP)\s?\d[\d\s.,]*\d|\d[\d\s.,]*\d\s?(?:€|EUR|\$|USD|£|GBP)/;

export function detectFrequency(text: string): Frequency | undefined {
  if (/\b(annual|yearly|per year|a year|\/\s?year|\/\s?yr|12 months|annuel|par an)\b/i.test(text)) return "yearly";
  if (/\b(quarterly|every 3 months|trimestriel)\b/i.test(text)) return "quarterly";
  if (/\b(weekly|per week|\/\s?week|hebdomadaire)\b/i.test(text)) return "weekly";
  if (/\b(monthly|per month|a month|\/\s?month|\/\s?mo|mensuel|par mois)\b/i.test(text)) return "monthly";
  return undefined;
}

function pickAmount(text: string): { amount: number; currency: string } | null {
  const lines = text.split(/\r?\n/);
  const preferred = lines.filter((l) => /total|amount|montant|charged|prix|price/i.test(l));
  for (const line of [...preferred, ...lines]) {
    const m = line.match(MONEY);
    if (!m) continue;
    const amount = parseAmount(m[0]);
    if (amount && amount > 0) return { amount, currency: detectCurrency(m[0]) };
  }
  return null;
}

function merchantFrom(name: string | undefined, address: string | undefined): string {
  if (name) return name.replace(/["']/g, "").replace(/\b(team|billing|receipts?|no-?reply)\b/gi, "").trim();
  const domain = address?.split("@")[1]?.split(".").slice(-2, -1)[0] ?? "unknown";
  return domain.charAt(0).toUpperCase() + domain.slice(1);
}

export interface ReceiptFields { merchant: string; subject: string; date: string; body: string }

/** Extracts merchant, amount, plan, frequency and trial status from a receipt. */
export function receiptToTransaction(r: ReceiptFields): NormalizedTransaction | null {
  const money = pickAmount(r.body) ?? pickAmount(r.subject);
  if (!money) return null;
  const all = `${r.subject}\n${r.body}`;
  const plan = r.body.match(/^\s*(?:plan|formule|abonnement)\s*:\s*(.+)$/im)?.[1] ?? r.subject;
  return makeTx({
    date: r.date,
    amount: money.amount,
    currency: money.currency,
    rawLabel: `EMAIL ${r.merchant}: ${r.subject}`,
    source: "email",
    merchant: r.merchant,
    plan,
    frequency: detectFrequency(all),
    isTrial: /\b(free trial|trial|essai gratuit|période d'essai)\b/i.test(all),
  });
}

export async function parseEml(raw: Buffer | string): Promise<NormalizedTransaction | null> {
  const mail = await simpleParser(raw);
  const from = mail.from?.value[0];
  const body = mail.text ?? (typeof mail.html === "string" ? mail.html.replace(/<[^>]+>/g, " ") : "");
  return receiptToTransaction({
    merchant: merchantFrom(from?.name, from?.address),
    subject: mail.subject ?? "",
    date: (mail.date ?? new Date()).toISOString().slice(0, 10),
    body,
  });
}

/** A forwarded or pasted receipt: first line "From: ...", or merchant given by the user. */
export function parseReceiptText(text: string, merchantHint?: string): NormalizedTransaction | null {
  const from = text.match(/^From:\s*(?:"?([^"<\n]+?)"?\s*)?<?([^\s>]+@[^\s>]+)>?/im);
  const subject = text.match(/^Subject:\s*(.+)$/im)?.[1]?.trim() ?? text.split(/\r?\n/).find((l) => l.trim())?.trim() ?? "";
  const dateLine = text.match(/^Date:\s*(.+)$/im)?.[1];
  const date = (dateLine && (parseDate(dateLine) ?? (Date.parse(dateLine) ? new Date(dateLine).toISOString().slice(0, 10) : null))) || new Date().toISOString().slice(0, 10);
  return receiptToTransaction({ merchant: merchantHint ?? merchantFrom(from?.[1], from?.[2]), subject, date, body: text });
}
