import type { MatchResult, NormalizedTransaction } from "../types";
import { daysBetween } from "../dates";
import { round2 } from "../amount";
import { cleanLabel, findIntermediary, nameKey } from "./labels";

export const DATE_WINDOW_DAYS = 3;

interface Pair { bank: NormalizedTransaction; record: NormalizedTransaction; days: number; score: number }

/**
 * Step 2 of the core logic. For each vague bank charge (PayPal, Apple, Google, Stripe, Paddle,
 * Klarna), finds a record in the other sources with the same amount and currency within
 * 3 days. Closest date wins; confidence drops with the date gap and with competing candidates
 * from other merchants. Each record is used at most once.
 */
export function reconcile(transactions: NormalizedTransaction[]): MatchResult[] {
  const bank = transactions.filter((t) => t.source === "bank" && t.amount > 0);
  const records = transactions.filter((t) => t.source !== "bank" && t.amount > 0);

  const pairs: Pair[] = [];
  const candidatesPerBank = new Map<string, Pair[]>();
  for (const b of bank) {
    const intermediary = findIntermediary(cleanLabel(b.rawLabel));
    if (!intermediary) continue;
    for (const r of records) {
      if (!intermediary.sources.includes(r.source)) continue;
      if (r.currency !== b.currency || Math.abs(r.amount - b.amount) >= 0.005) continue;
      const days = Math.abs(daysBetween(r.date, b.date));
      if (days > DATE_WINDOW_DAYS) continue;
      const score = 1 - days * 0.1;
      const pair = { bank: b, record: r, days, score };
      pairs.push(pair);
      candidatesPerBank.set(b.id, [...(candidatesPerBank.get(b.id) ?? []), pair]);
    }
  }

  // Best score first; on a tie the intermediary's own record beats a receipt email.
  const emailLast = (p: Pair) => (p.record.source === "email" ? 1 : 0);
  pairs.sort((x, y) => y.score - x.score || emailLast(x) - emailLast(y) || x.bank.date.localeCompare(y.bank.date));
  const usedBank = new Set<string>();
  const usedRecord = new Set<string>();
  const matches: MatchResult[] = [];
  for (const p of pairs) {
    if (usedBank.has(p.bank.id) || usedRecord.has(p.record.id)) continue;
    usedBank.add(p.bank.id);
    usedRecord.add(p.record.id);
    const candidates = candidatesPerBank.get(p.bank.id) ?? [];
    const merchant = p.record.merchant ?? p.record.rawLabel;
    const rivals = new Set(candidates.map((c) => nameKey(c.record.merchant ?? c.record.rawLabel)).filter((m) => m !== nameKey(merchant)));
    const confidence = round2(Math.max(0.1, p.score - 0.2 * rivals.size));
    matches.push({ bankTransactionId: p.bank.id, intermediaryTransactionId: p.record.id, confidence, candidateCount: candidates.length, merchant });
  }
  return matches;
}
