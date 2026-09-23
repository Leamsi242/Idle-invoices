import type { Channel, DescriptorEntry, DetectedSubscription, MatchResult, NormalizedTransaction, RecurringGroup, Usage } from "../types";
import { cleanLabel, findIntermediary, isExcludedLabel, nameKey, sameName } from "./labels";
import { reconcile } from "./reconcile";
import { detectRecurring, regularity, toGroup, PER_YEAR } from "./recurring";
import { findDescriptor } from "./descriptors";
import { flagSubscriptions } from "./flags";
import { addDays, addMonths, daysBetween } from "../dates";
import { round2 } from "../amount";

export interface AnalyzeOptions {
  userDescriptors?: DescriptorEntry[];
  usage?: Record<string, Usage | undefined>;
}

export interface Analysis {
  subscriptions: DetectedSubscription[];
  matches: MatchResult[];
}

const titleCase = (s: string) => s.toLowerCase().replace(/(^|[\s*./-])([a-z])/g, (_m, p, c) => p + c.toUpperCase());

/** A trial charge is small (at most half the full price) and comes shortly before the first full charge. */
const TRIAL_MAX_RATIO = 0.5;
const TRIAL_MAX_DAYS_BEFORE = 35;

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
  const userDescriptors = opts.userDescriptors ?? [];

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
  const unused = new Set(leftovers);

  for (const left of leftovers) {
    const first = left.txs[0];
    const name = first.merchant ?? cleanLabel(first.rawLabel);
    // A yearly plan appears once in 12 months of statements: accept it when a receipt or app
    // store list says the plan is yearly.
    if (left.txs.length === 1) {
      const evidence = records.find(
        (r) => r.frequency === "yearly" && r.merchant && sameName(r.merchant, name) && Math.abs(r.amount - first.amount) <= first.amount * 0.1,
      );
      if (evidence) {
        groups.push(toGroup(left.key, left.txs, "yearly", 0, 0.6));
        unused.delete(left);
      }
    }
    // A subscription that started recently has only 2 charges. Accept it early when the
    // service is a known subscription, so a forgotten trial is caught after one renewal.
    if (left.txs.length === 2 && findDescriptor([first.merchant, cleanLabel(first.rawLabel)], userDescriptors)) {
      const reg = regularity(left.txs.map((t) => t.date), 2);
      if (reg && reg.frequency !== "yearly") {
        groups.push(toGroup(left.key, left.txs, reg.frequency, 0, 0.5));
        unused.delete(left);
      }
    }
  }

  const labelled = groups.map((g) => {
    const trial = [...unused].find(
      (l) => l.key === g.key && l.txs.length === 1 && l.txs[0].amount <= g.transactions[0].amount * TRIAL_MAX_RATIO &&
        daysBetween(l.txs[0].date, g.firstSeen) > 0 && daysBetween(l.txs[0].date, g.firstSeen) <= TRIAL_MAX_DAYS_BEFORE,
    );
    if (trial) unused.delete(trial);
    return label(g, userDescriptors, matchedSources, trial?.txs[0]);
  });

  const dates = charges.map((t) => t.date).sort();
  const flagged = flagSubscriptions(labelled, {
    records,
    dataStart: dates[0] ?? "",
    dataEnd: dates.at(-1) ?? "",
    usage: opts.usage ?? {},
  });
  return { subscriptions: flagged.sort((a, b) => b.yearlyCost - a.yearlyCost), matches };
}

export function nextChargeDate(lastSeen: string, frequency: RecurringGroup["frequency"]): string {
  if (frequency === "weekly") return addDays(lastSeen, 7);
  return addMonths(lastSeen, { monthly: 1, quarterly: 3, yearly: 12 }[frequency]);
}

function channelOf(g: RecurringGroup, sources: Set<string>): Channel {
  const raw = g.transactions.map((t) => t.rawLabel.toUpperCase()).join(" ");
  const intermediary = findIntermediary(cleanLabel(g.transactions[0].rawLabel))?.id;
  if (sources.has("apple") || intermediary === "apple") return "apple";
  if (sources.has("google") || intermediary === "google") return "google";
  if (sources.has("paypal") || intermediary === "paypal") return "paypal";
  if (/\bPRLV\b|DIRECT DEBIT|PRELEVEMENT|PRÉLÈVEMENT|\bSEPA\b/.test(raw)) return "direct-debit";
  return "card";
}

function label(
  g: RecurringGroup,
  userDescriptors: DescriptorEntry[],
  matchedSources: Map<string, NormalizedTransaction>,
  trial?: NormalizedTransaction,
): DetectedSubscription {
  const cleaned = cleanLabel(g.transactions[0].rawLabel);
  const descriptor = findDescriptor([g.merchant, cleaned], userDescriptors);
  const hidden = !g.merchant && !!findIntermediary(cleaned);
  const serviceName = descriptor?.serviceName ?? (g.merchant ? g.merchant : titleCase(cleaned));
  const sources = new Set(g.transactions.map((t) => matchedSources.get(t.id)?.source).filter((s) => !!s));
  const paid = g.transactions.reduce((sum, t) => sum + t.amount, 0) + (trial?.amount ?? 0);
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
    channel: channelOf(g, sources as Set<string>),
    trialCharge: trial ? { date: trial.date, amount: trial.amount } : undefined,
    totalPaid: round2(paid),
    nextCharge: nextChargeDate(g.lastSeen, g.frequency),
    isNew: false,
  };
}
