import type { Frequency, NormalizedTransaction } from "../types";
import { detectCurrency, parseAmount } from "../amount";
import { addDays, addMonths, parseDate } from "../dates";
import { detectFrequency } from "./email";
import { makeTx } from "./common";

const HEADINGS = /^(subscriptions|abonnements|active|actifs?|payments & subscriptions|paiements et abonnements|manage subscriptions)$/i;
const INACTIVE = /^(expired|inactive|expirés?|inactifs?|cancelled|annulés?)$/i;
const PRICE = /(?:€|EUR|\$|USD|£|GBP)\s?\d+(?:[.,]\d{2})?|\d+(?:[.,]\d{2})?\s?(?:€|EUR|\$|USD|£|GBP)/;
const RENEWAL = /(?:renews?|renouvel\w*|next payment|prochain paiement|next billing|expires?)\s*(?:on|le)?\s*:?\s*(.+)$/i;

export interface AppStoreEntry {
  service: string;
  plan?: string;
  amount: number;
  currency: string;
  frequency: Frequency;
  renewalDate?: string;
  isTrial: boolean;
}

/** Reads text pasted (or read from a screenshot) from Settings > Subscriptions or Play Store > Payments & subscriptions. */
export function parseAppStoreList(text: string): AppStoreEntry[] {
  const entries: AppStoreEntry[] = [];
  let inactive = false;
  const blocks = text.split(/\r?\n\s*\r?\n/).map((b) => b.split(/\r?\n/).map((l) => l.trim()).filter(Boolean));
  for (const lines of blocks) {
    if (lines.length === 1 && INACTIVE.test(lines[0])) { inactive = true; continue; }
    if (lines.length === 1 && HEADINGS.test(lines[0])) { inactive = false; continue; }
    if (inactive) continue;
    const content = lines.filter((l) => !HEADINGS.test(l));
    const priceLine = content.find((l) => PRICE.test(l));
    if (!priceLine || content.length < 2) continue;
    const amount = parseAmount(priceLine.match(PRICE)![0]);
    if (!amount) continue;
    const renewalLine = content.find((l) => RENEWAL.test(l));
    const renewalDate = renewalLine ? parseDate(renewalLine.match(RENEWAL)![1]) ?? undefined : undefined;
    const joined = content.join("\n");
    const plan = content.slice(1).find((l) => l !== priceLine && l !== renewalLine);
    entries.push({
      service: content[0],
      plan: plan?.replace(PRICE, "").replace(/[·•]/g, "").trim() || undefined,
      amount,
      currency: detectCurrency(priceLine),
      frequency: detectFrequency(joined) ?? "monthly",
      renewalDate,
      isTrial: /free trial|essai gratuit|trial/i.test(joined),
    });
  }
  return entries;
}

const PERIOD_MONTHS: Record<Frequency, number> = { weekly: 0, monthly: 1, quarterly: 3, yearly: 12 };

/**
 * App store lists show the current price and next renewal, not past charges. To reconcile
 * them with bank statements we project the charges of the last 12 months backwards from the
 * renewal date. Entries still in a free trial have no past charges.
 */
export function appStoreEntriesToTransactions(entries: AppStoreEntry[], source: "apple" | "google", today = new Date().toISOString().slice(0, 10)): NormalizedTransaction[] {
  const out: NormalizedTransaction[] = [];
  for (const e of entries) {
    if (e.isTrial) continue;
    const anchor = e.renewalDate ?? today;
    const earliest = addMonths(anchor, -12);
    for (let k = 1; k <= 60; k++) {
      const date = e.frequency === "weekly" ? addDays(anchor, -7 * k) : addMonths(anchor, -PERIOD_MONTHS[e.frequency] * k);
      if (date < earliest) break;
      if (date > today) continue;
      out.push(makeTx({
        date,
        amount: e.amount,
        currency: e.currency,
        rawLabel: `${source.toUpperCase()} ${e.service}`,
        source,
        merchant: e.service,
        plan: e.plan,
        frequency: e.frequency,
      }));
    }
  }
  return out;
}
