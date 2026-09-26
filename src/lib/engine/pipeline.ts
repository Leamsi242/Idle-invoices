import type { Channel, DescriptorEntry, DetectedSubscription, MatchResult, NormalizedTransaction, RecurringGroup, Usage } from "../types";
import { cleanLabel, displayLabel, findIntermediary, isExcludedLabel, nameKey, sameName } from "./labels";
import { reconcile, withinBookingWindow } from "./reconcile";
import { detectRecurring, regularity, toGroup, PER_YEAR } from "./recurring";
import { findDescriptor } from "./descriptors";
import { flagSubscriptions } from "./flags";
import { addDays, addMonths, daysBetween } from "../dates";
import { round2 } from "../amount";

export interface AnalyzeOptions {
  userDescriptors?: DescriptorEntry[];
  usage?: Record<string, Usage | undefined>;
  /** Today, to tell trials that already converted from trials still running. */
  today?: string;
}

export interface Analysis {
  subscriptions: DetectedSubscription[];
  matches: MatchResult[];
}

const titleCase = (s: string) => s.toLowerCase().replace(/(^|[\s*./-])([a-z])/g, (_m, p, c) => p + c.toUpperCase());

/** A trial charge is small (at most half the full price) and comes shortly before the first full charge. */
const TRIAL_MAX_RATIO = 0.5;
const TRIAL_MAX_DAYS_BEFORE = 35;
/** Bank data shorter than this (a 90-day PSD2 connection) relaxes the minimum number of charges. */
export const SHORT_HISTORY_DAYS = 120;
const PAID_TRIAL_MAX = 2; // "1 € for 7 days"
const SOURCE_PRIORITY: Record<string, number> = { paypal: 0, apple: 1, google: 1, email: 2 };

/**
 * Receipts and store records that no bank line accounts for become charges themselves, so a
 * mailbox or a PayPal export is enough on its own. The same payment often appears in several
 * sources (a PayPal receipt email and the PayPal export): keep one.
 */
function receiptOnlyCharges(transactions: NormalizedTransaction[], matched: Set<string>): NormalizedTransaction[] {
  const bank = transactions.filter((t) => t.source === "bank" && t.amount > 0);
  const coveredByBank = (r: NormalizedTransaction) =>
    bank.some((b) => b.currency === r.currency && Math.abs(b.amount - r.amount) < 0.005 && withinBookingWindow(r.date, b.date));
  // Records dated after every real payment are announcements (a trial ending next month), not charges.
  const lastPayment = transactions.filter((t) => t.amount > 0 && !t.isTrial).reduce((max, t) => (t.date > max ? t.date : max), "");
  const candidates = transactions
    .filter((r) => r.source !== "bank" && r.amount > 0 && !r.isCancellation && r.merchant && !matched.has(r.id) && !coveredByBank(r) && !isExcludedLabel(cleanLabel(r.rawLabel)))
    .filter((r) => r.date <= lastPayment)
    // A trial charge that announces a bigger price later is handled as a trial, not a charge.
    .filter((r) => !(r.isTrial && r.nextChargeAmount && r.nextChargeAmount > r.amount))
    .sort((a, b) => SOURCE_PRIORITY[a.source] - SOURCE_PRIORITY[b.source] || a.date.localeCompare(b.date));
  const kept: NormalizedTransaction[] = [];
  for (const r of candidates) {
    // Only across senders (a PayPal receipt and the merchant's own email, or the PayPal export):
    // two purchases of the same price from the same sender are two purchases.
    const sender = (t: NormalizedTransaction) => `${t.source}:${t.rawLabel.split(":")[0].split(" ").slice(0, 2).join(" ")}`;
    const duplicate = kept.some((k) => sender(k) !== sender(r) && sameName(k.merchant!, r.merchant!) && Math.abs(k.amount - r.amount) < 0.005 && Math.abs(daysBetween(k.date, r.date)) <= 3);
    if (!duplicate) kept.push(r);
  }
  return kept;
}

/**
 * The whole engine: normalize (done by the parsers), reconcile, detect, label, flag.
 *
 * Reconciliation runs before grouping: several services hidden behind the same "PAYPAL *"
 * label would otherwise be grouped together. Charges not matched directly inherit the
 * merchant found for the same label and amount.
 */
/**
 * The same bank line in two uploads (overlapping statements, a file uploaded twice) counts once.
 * Within one upload, identical lines are real: two €5.99 payments on the same day.
 */
export function dedupeUploads(transactions: NormalizedTransaction[]): NormalizedTransaction[] {
  const key = (t: NormalizedTransaction) => `${t.source}|${t.date}|${t.rawLabel}|${t.amount}`;
  const best = new Map<string, NormalizedTransaction[]>();
  const byUpload = new Map<string, Map<string, NormalizedTransaction[]>>();
  for (const t of transactions) {
    const u = t.uploadId ?? "";
    const local = byUpload.get(u) ?? new Map<string, NormalizedTransaction[]>();
    local.set(key(t), [...(local.get(key(t)) ?? []), t]);
    byUpload.set(u, local);
  }
  for (const local of byUpload.values()) for (const [k, v] of local) if ((best.get(k)?.length ?? 0) < v.length) best.set(k, v);
  const keep = new Set([...best.values()].flat().map((t) => t.id));
  return transactions.filter((t) => keep.has(t.id));
}

export function analyze(input: NormalizedTransaction[], opts: AnalyzeOptions = {}): Analysis {
  const transactions = dedupeUploads(input);
  const matches = reconcile(transactions);
  const merchantOf = new Map(matches.map((m) => [m.bankTransactionId, m.merchant]));
  const matchedSources = new Map<string, NormalizedTransaction>();
  const byId = new Map(transactions.map((t) => [t.id, t]));
  for (const m of matches) matchedSources.set(m.bankTransactionId, byId.get(m.intermediaryTransactionId)!);

  // A bank line explained by a transfer to a person (PayPal to a friend) is not a charge either.
  const excludedRecord = (t: NormalizedTransaction) => {
    const r = matchedSources.get(t.id);
    return !!r && isExcludedLabel(cleanLabel(r.rawLabel));
  };
  const paypalExport = transactions.some((t) => t.source === "paypal");
  const bankCharges = transactions.filter((t) => t.source === "bank" && t.amount > 0 && !isExcludedLabel(cleanLabel(t.rawLabel), { paypalExport }) && !excludedRecord(t));
  const charges = [...bankCharges, ...receiptOnlyCharges(transactions, new Set(matches.map((m) => m.intermediaryTransactionId)))];
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

  const baseKey = (t: NormalizedTransaction) => (t.merchant ? nameKey(t.merchant) : cleanLabel(t.rawLabel));
  // A known subscription service (not a known shop or ride app).
  const subscriptionService = (texts: (string | undefined)[]) => {
    const d = findDescriptor(texts, userDescriptors);
    return d && !d.notSubscription ? d : undefined;
  };
  const isKnown = (key: string) => !!subscriptionService([key]);
  let { groups, leftovers } = detectRecurring(withMerchant, baseKey, isKnown);

  // Card processors change the label from one month to the next ("NETFLIX.COM AMSTERDAM",
  // "NETFLIX.COM 521525 NL"). When a known service shows under several labels, detect again on
  // all its charges together, under its most common label, and keep that when it explains more
  // charges (two accounts of the same service stay two subscriptions).
  const byService = new Map<string, { txs: NormalizedTransaction[]; keys: Map<string, number> }>();
  for (const t of withMerchant) {
    const key = baseKey(t);
    const service = key && t.amount > 0 ? subscriptionService([key])?.serviceName : undefined;
    if (!service) continue;
    const entry = byService.get(service) ?? { txs: [] as NormalizedTransaction[], keys: new Map<string, number>() };
    entry.txs.push(t);
    entry.keys.set(key, (entry.keys.get(key) ?? 0) + 1);
    byService.set(service, entry);
  }
  const covered = (gs: RecurringGroup[]) => gs.reduce((n, g) => n + g.transactions.length, 0);
  for (const { txs, keys } of byService.values()) {
    if (keys.size < 2) continue;
    const main = [...keys].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0];
    const again = detectRecurring(txs, () => main, () => true);
    if (covered(again.groups) <= covered(groups.filter((g) => keys.has(g.key)))) continue;
    groups = [...groups.filter((g) => !keys.has(g.key)), ...again.groups];
    leftovers = [...leftovers.filter((l) => !keys.has(l.key)), ...again.leftovers];
  }
  const unused = new Set(leftovers);
  const bankDates = bankCharges.map((t) => t.date).sort();
  const shortHistory = bankDates.length > 0 && daysBetween(bankDates[0], bankDates.at(-1)!) < SHORT_HISTORY_DAYS;
  const seenTwice = new Set<RecurringGroup>();
  const converted: { group: RecurringGroup; reason: string }[] = [];

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
        continue;
      }
    }
    // One receipt that announces its next renewal ("renouvelé le 19 oct.") is a subscription,
    // whether it stands alone or explains a bank charge.
    const receipt = matchedSources.get(first.id) ?? first;
    if (left.txs.length === 1 && receipt.frequency && !receipt.isTrial && receipt.nextChargeDate && receipt.nextChargeDate > first.date) {
      groups.push(toGroup(left.key, left.txs, receipt.frequency, 0, 0.5));
      unused.delete(left);
      continue;
    }
    // A paid trial followed by one full-price charge of a known service (PDF Guru: 0.99, then
    // 49.99 a week later): the trial has converted. The billing period is a guess (monthly).
    // Only token amounts count as a trial, so two meals from a delivery app are not one.
    if (left.txs.length === 1 && isKnown(left.key) && first.amount >= 2) {
      const trial = leftovers.find(
        (l) => l !== left && l.key === left.key && l.txs.length === 1 && l.txs[0].amount <= Math.min(PAID_TRIAL_MAX, first.amount * TRIAL_MAX_RATIO) &&
          daysBetween(l.txs[0].date, first.date) > 0 && daysBetween(l.txs[0].date, first.date) <= TRIAL_MAX_DAYS_BEFORE,
      );
      if (trial) {
        groups.push(toGroup(left.key, left.txs, "monthly", 0, 0.4));
        unused.delete(left);
        continue;
      }
    }
    // A subscription that started recently has only 2 charges. Accept it early when the
    // service is a known subscription, so a forgotten trial is caught after one renewal.
    if (left.txs.length === 2 && subscriptionService([first.merchant, cleanLabel(first.rawLabel)])) {
      const reg = regularity(left.txs.map((t) => t.date), 2);
      if (reg && reg.frequency !== "yearly") {
        groups.push(toGroup(left.key, left.txs, reg.frequency, 0, 0.5));
        unused.delete(left);
        continue;
      }
    }
    // A bank connection often shares 90 days only (PSD2): a monthly charge shows two or three
    // times. With such a short history, two charges of exactly the same amount a month apart
    // are kept, and say so.
    if (shortHistory && left.txs.length === 2 && left.txs[0].source === "bank" && Math.abs(left.txs[0].amount - left.txs[1].amount) < 0.005 && first.amount >= 1) {
      if (regularity(left.txs.map((t) => t.date), 2)?.frequency === "monthly") {
        const group = toGroup(left.key, left.txs, "monthly", 0, 0.4);
        seenTwice.add(group);
        groups.push(group);
        unused.delete(left);
      }
    }
  }

  // A trial that should have converted by now and was never cancelled: probably charging.
  const today = opts.today ?? charges.reduce((max, t) => (t.date > max ? t.date : max), "");
  for (const r of records) {
    if (!r.isTrial || !r.merchant || !r.nextChargeDate || !r.nextChargeAmount || r.nextChargeAmount <= r.amount || r.nextChargeDate > today) continue;
    // Only recent conversions are worth a "check your statement"; older ones would show up in the charges.
    if (daysBetween(r.nextChargeDate, today) > 90) continue;
    const cancelled = records.some((c) => c.isCancellation && c.merchant && sameName(c.merchant, r.merchant!) && c.date >= r.date);
    // Already charging on a statement, under its merchant or its bank label (PDF Guru on the card).
    const known = groups.some((g) => {
      const name = g.merchant ?? subscriptionService([cleanLabel(g.transactions[0].rawLabel)])?.serviceName;
      return !!name && (sameName(name, r.merchant!) || subscriptionService([name])?.serviceName === subscriptionService([r.merchant])?.serviceName && !!subscriptionService([name]));
    });
    if (cancelled || known) continue;
    const expected = { ...r, id: `${r.id}-expected`, date: r.nextChargeDate, amount: r.nextChargeAmount, isTrial: false, rawLabel: `EXPECTED ${r.merchant}` };
    const group = toGroup(nameKey(r.merchant), [expected], r.frequency ?? "monthly", 0, 0.4);
    converted.push({ group, reason: `Trial ended on ${r.nextChargeDate} and no cancellation was found: check your statement for ${r.nextChargeAmount.toFixed(2)} ${r.currency}` });
    groups.push(group);
  }

  // Unknown merchants whose amount keeps moving (a bakery, a taxi) are regular spending, not a
  // subscription. Known services are kept: foreign-currency plans move a little every month.
  const steady = (g: RecurringGroup) => {
    if (g.merchant || subscriptionService([cleanLabel(g.transactions[0].rawLabel)])) return true;
    const amounts = g.transactions.map((t) => t.amount);
    // Price steps (165, 165, 180, 180, 192, 192): every price but the last is paid at least twice.
    const runs: number[] = [];
    amounts.forEach((a, i) => (i > 0 && Math.abs(a - amounts[i - 1]) <= amounts[i - 1] * 0.01 ? runs[runs.length - 1]++ : runs.push(1)));
    if (runs.length > 1 && runs.slice(0, -1).every((r) => r >= 2)) return true;
    const range = (Math.max(...amounts) - Math.min(...amounts)) / Math.min(...amounts);
    const wiggles = g.priceChanges.filter((p) => Math.abs(p.to - p.from) / p.from > 0.01).length;
    return !(range > 0.05 && wiggles >= 2);
  };
  // Rides and deliveries (Uber, Bolt) repeat, sometimes at the same price: never a subscription.
  const purchase = (g: RecurringGroup) => !!findDescriptor([g.merchant, cleanLabel(g.transactions[0].rawLabel)], userDescriptors)?.notSubscription;
  for (let i = groups.length - 1; i >= 0; i--) if (!steady(groups[i]) || purchase(groups[i])) groups.splice(i, 1);

  const labelled = groups.map((g) => {
    // No trial guess behind a bare intermediary label: any small PayPal payment would qualify.
    const bare = !g.merchant && !!findIntermediary(cleanLabel(g.transactions[0].rawLabel));
    const trial = bare ? undefined : [...unused].find(
      (l) => l.key === g.key && l.txs.length === 1 && l.txs[0].amount <= g.transactions[0].amount * TRIAL_MAX_RATIO &&
        daysBetween(l.txs[0].date, g.firstSeen) > 0 && daysBetween(l.txs[0].date, g.firstSeen) <= TRIAL_MAX_DAYS_BEFORE,
    );
    if (trial) unused.delete(trial);
    const sub = label(g, userDescriptors, matchedSources, trial?.txs[0]);
    if (seenTwice.has(g)) sub.forgottenReasons = ["Seen twice so far: your bank shares about 3 months of history"];
    const note = converted.find((c) => c.group === g);
    if (note) sub.forgottenReasons = [note.reason];
    return sub;
  });

  const dates = charges.map((t) => t.date).sort();
  // Each statement ends on its own date: a charge missing after the end of the bank statements is
  // not a sign that the subscription stopped when the card or PayPal data goes further.
  const streamOf = (t: NormalizedTransaction) => (t.source === "bank" ? (t.rawLabel.startsWith("AMEX ") ? "amex" : "bank") : t.source);
  const streamEnd = new Map<string, string>();
  const dataEnd = dates.at(-1) ?? "";
  for (const t of transactions) {
    // Real payments only: a trial or a renewal announced for later is not data.
    if (t.amount <= 0 || t.isTrial || t.date > dataEnd) continue;
    if ((streamEnd.get(streamOf(t)) ?? "") < t.date) streamEnd.set(streamOf(t), t.date);
  }
  const flagged = flagSubscriptions(labelled, {
    records,
    dataStart: dates[0] ?? "",
    dataEnd,
    endFor: (sub) => sub.transactions.map((t) => streamEnd.get(streamOf(t)) ?? "").reduce((a, b) => (b > a ? b : a), ""),
    usage: opts.usage ?? {},
  });
  return { subscriptions: flagged.sort((a, b) => b.yearlyCost - a.yearlyCost), matches };
}

/** Two real words or more and no reference number: the user would learn nothing by being asked. */
export function readableLabel(label: string): boolean {
  if (/\d/.test(label)) return false;
  return label.split(/\s+/).filter((w) => /^[A-ZÀ-Ÿ'-]{4,}$/i.test(w)).length >= 2;
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
  const serviceName = descriptor?.serviceName ?? (g.merchant ? g.merchant : titleCase(displayLabel(cleaned)));
  const sources = new Set(g.transactions.map((t) => matchedSources.get(t.id)?.source ?? (t.source !== "bank" ? t.source : undefined)).filter((s) => !!s));
  const paid = g.transactions.reduce((sum, t) => sum + t.amount, 0) + (trial?.amount ?? 0);
  return {
    ...g,
    serviceName,
    category: descriptor?.category,
    cancellationUrl: descriptor?.cancellationUrl,
    bundle: descriptor?.bundle,
    // Unknown when neither the map nor reconciliation could name it, and the label itself is cryptic:
    // "ASSURANCE ACCIDENTS DE LA VIE" already says what it is, "PRLV 4821 FR77ZZZ" does not.
    needsLabel: !descriptor && (hidden || (!g.merchant && !readableLabel(displayLabel(cleaned)))),
    yearlyCost: g.currentAmount * PER_YEAR[g.frequency],
    forgottenReasons: [],
    status: "active",
    matchedSources: [...(g.transactions.some((t) => t.source === "bank") ? ["bank"] : []), ...sources] as DetectedSubscription["matchedSources"],
    channel: channelOf(g, sources as Set<string>),
    trialCharge: trial ? { date: trial.date, amount: trial.amount } : undefined,
    totalPaid: round2(paid),
    nextCharge: nextChargeDate(g.lastSeen, g.frequency),
    isNew: false,
  };
}
