import type { DescriptorEntry, DetectedSubscription, MatchResult, NormalizedTransaction, RecurringGroup, Usage } from "../types";
import { cleanLabel, findIntermediary, isExcludedLabel, nameKey, sameName } from "./labels";
import { reconcile } from "./reconcile";
import { detectRecurring, toGroup, PER_YEAR } from "./recurring";
import { findDescriptor } from "./descriptors";
import { flagSubscriptions } from "./flags";

export interface AnalyzeOptions {
  userDescriptors?: DescriptorEntry[];
  usage?: Record<string, Usage | undefined>;
}

export interface Analysis {
  subscriptions: DetectedSubscription[];
  matches: MatchResult[];
}

const titleCase = (s: string) => s.toLowerCase().replace(/(^|[\s*./-])([a-z])/g, (_m, p, c) => p + c.toUpperCase());

/**
 * The whole engine: normalize (done by the parsers), reconcile, detect, label, flag.
 *
 * Reconciliation runs before grouping: several services hidden behind the same "PAYPAL *"
 * label would otherwise be grouped together. Charges not matched directly inherit the
 * merchant found for the same label and amount.
 */
export function analyze(transactions: NormalizedTransaction[], opts: AnalyzeOptions = {}): Analysis {
  const matches = reconcile(transactions);
  const merchantOf = new Map(matches.map((m) => [m.bankTransactionId, m.merchant]));
  const matchedSources = new Map<string, NormalizedTransaction>();
  const byId = new Map(transactions.map((t) => [t.id, t]));
  for (const m of matches) matchedSources.set(m.bankTransactionId, byId.get(m.intermediaryTransactionId)!);

  const charges = transactions.filter((t) => t.source === "bank" && t.amount > 0 && !isExcludedLabel(cleanLabel(t.rawLabel)));
  const records = transactions.filter((t) => t.source !== "bank");

  // Spread reconciled merchants to unmatched charges with the same label and a similar amount.
  const learned: { label: string; amount: number; merchant: string }[] = [];
  for (const c of charges) {
    const merchant = merchantOf.get(c.id);
    if (merchant) learned.push({ label: cleanLabel(c.rawLabel), amount: c.amount, merchant });
  }
  const inferMerchant = (tx: NormalizedTransaction): string | undefined => {
    const direct = merchantOf.get(tx.id);
    if (direct) return direct;
    const label = cleanLabel(tx.rawLabel);
    const options = new Set(learned.filter((l) => l.label === label && Math.abs(l.amount - tx.amount) <= l.amount * 0.1).map((l) => nameKey(l.merchant)));
    if (options.size !== 1) return undefined;
    return learned.find((l) => nameKey(l.merchant) === [...options][0])!.merchant;
  };
  const withMerchant = charges.map((t) => ({ ...t, merchant: t.merchant ?? inferMerchant(t) }));

  const { groups, leftovers } = detectRecurring(withMerchant, (t) => (t.merchant ? nameKey(t.merchant) : cleanLabel(t.rawLabel)));

  // A yearly plan appears once in 12 months of statements: accept it when a receipt or app
  // store list says the plan is yearly.
  for (const single of leftovers) {
    if (single.length !== 1) continue;
    const tx = single[0];
    const name = tx.merchant ?? cleanLabel(tx.rawLabel);
    const evidence = records.find(
      (r) => r.frequency === "yearly" && r.merchant && sameName(r.merchant, name) && Math.abs(r.amount - tx.amount) <= tx.amount * 0.1,
    );
    if (evidence) groups.push(toGroup(tx.merchant ? nameKey(tx.merchant) : cleanLabel(tx.rawLabel), single, "yearly", 0, 0.6));
  }

  const labelled = groups.map((g) => label(g, opts.userDescriptors ?? [], matchedSources));
  const flagged = flagSubscriptions(labelled, {
    records,
    dataEnd: charges.reduce((max, t) => (t.date > max ? t.date : max), ""),
    usage: opts.usage ?? {},
  });
  return { subscriptions: flagged.sort((a, b) => b.yearlyCost - a.yearlyCost), matches };
}

function label(g: RecurringGroup, userDescriptors: DescriptorEntry[], matchedSources: Map<string, NormalizedTransaction>): DetectedSubscription {
  const cleaned = cleanLabel(g.transactions[0].rawLabel);
  const descriptor = findDescriptor([g.merchant, cleaned], userDescriptors);
  const hidden = !g.merchant && !!findIntermediary(cleaned);
  const serviceName = descriptor?.serviceName ?? (g.merchant ? g.merchant : titleCase(cleaned));
  const sources = new Set(g.transactions.map((t) => matchedSources.get(t.id)?.source).filter((s) => !!s));
  return {
    ...g,
    serviceName,
    category: descriptor?.category,
    cancellationUrl: descriptor?.cancellationUrl,
    bundle: descriptor?.bundle,
    // Unknown when neither the map nor reconciliation could name it.
    needsLabel: !descriptor && (!g.merchant || hidden),
    yearlyCost: g.currentAmount * PER_YEAR[g.frequency],
    forgottenReasons: [],
    status: "active",
    matchedSources: ["bank", ...sources] as DetectedSubscription["matchedSources"],
  };
}
