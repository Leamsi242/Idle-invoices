import type { NormalizedTransaction, Source } from "./types";
import { cleanLabel, isExcludedLabel } from "./engine/labels";
import { daysBetween } from "./dates";
import type { Locale } from "./i18n";
import { onboardingText } from "./i18n-onboarding";

/**
 * Onboarding: the user says how they pay and where their receipts go, and gets a checklist of
 * exactly what to upload, with the steps for each source. The checklist also reads the data
 * already uploaded: PayPal or App Store charges on a statement with nothing to unmask them,
 * a credit card settled from the bank account, too short a period.
 */

export interface Answers {
  banks: string[]; // ids from BANKS
  cards: string[]; // ids from CARDS
  wallets: string[]; // ids from WALLETS
  stores: string[]; // ids from STORES
  mailboxes: string[]; // ids from MAILBOXES
  other: string[]; // ids from OTHER
  done: string[]; // checklist items the user ticked by hand
}

export const EMPTY_ANSWERS: Answers = { banks: [], cards: [], wallets: [], stores: [], mailboxes: [], other: [], done: [] };

export interface Choice { id: string; label: string; hint?: string }

type ChoiceKey = Exclude<keyof Answers, "done">;

const CHOICE_IDS: Record<ChoiceKey, string[]> = {
  banks: ["credit-mutuel", "bnp", "societe-generale", "credit-agricole", "bpce", "banque-postale", "boursobank", "n26", "revolut", "other-bank"],
  cards: ["amex", "deferred", "other-card"],
  wallets: ["paypal", "apple-pay", "google-pay", "lydia"],
  stores: ["apple", "google", "amazon"],
  mailboxes: ["gmail", "outlook", "icloud", "yahoo", "other-mail"],
  other: ["operator", "bnpl"],
};

/** The answer choices with their labels in the given language. */
export function choiceLists(locale: Locale = "en"): Record<ChoiceKey, Choice[]> {
  const texts = onboardingText(locale).choices;
  const list = (key: ChoiceKey): Choice[] => CHOICE_IDS[key].map((id) => ({ id, ...texts[key][id] }));
  return { banks: list("banks"), cards: list("cards"), wallets: list("wallets"), stores: list("stores"), mailboxes: list("mailboxes"), other: list("other") };
}

const EN_CHOICES = choiceLists("en");
export const BANKS: Choice[] = EN_CHOICES.banks;
export const CARDS: Choice[] = EN_CHOICES.cards;
export const WALLETS: Choice[] = EN_CHOICES.wallets;
export const STORES: Choice[] = EN_CHOICES.stores;
export const MAILBOXES: Choice[] = EN_CHOICES.mailboxes;
export const OTHER: Choice[] = EN_CHOICES.other;

/** What the uploaded data tells us, for the checklist. */
export interface Facts {
  uploads: Partial<Record<Source, number>>;
  bankFrom?: string;
  bankTo?: string;
  /** Bank charges through an intermediary, and how many no other source has explained yet. */
  intermediaries: Record<"paypal" | "apple" | "google" | "amazon", { charges: number; unexplained: number }>;
  amexSettlements: number; // "PRLV AMERICAN EXPRESS" on a bank account
  amexStatement: boolean; // an Amex statement was uploaded
  deferredCard: number; // "FACTURE CARTE" lines: one monthly total for a card
  operatorBills: number; // monthly telecom bills that can hide options
}

const PATTERNS = {
  paypal: /PAYPAL/,
  apple: /APPLE\.COM|ITUNES/,
  google: /GOOGLE/,
  amazon: /AMAZON|AMZN|PRIME VIDEO/,
};
const OPERATORS = /\b(ORANGE|SOSH|FREE MOBILE|FREE TELECOM|FREEBOX|SFR|RED BY SFR|BOUYGUES|B&YOU)\b/;

export function collectFacts(transactions: NormalizedTransaction[], explained: Set<string>): Facts {
  const uploads: Facts["uploads"] = {};
  for (const t of transactions) uploads[t.source] = (uploads[t.source] ?? 0) + 1;
  const bank = transactions.filter((t) => t.source === "bank");
  const dates = bank.map((t) => t.date).sort();
  const intermediaries = { paypal: { charges: 0, unexplained: 0 }, apple: { charges: 0, unexplained: 0 }, google: { charges: 0, unexplained: 0 }, amazon: { charges: 0, unexplained: 0 } };
  let amexSettlements = 0;
  let deferredCard = 0;
  const operatorMonths = new Set<string>();
  for (const t of bank) {
    if (t.amount <= 0) continue;
    const onAmex = t.rawLabel.startsWith("AMEX ");
    const label = cleanLabel(t.rawLabel);
    const excluded = isExcludedLabel(label);
    for (const key of Object.keys(PATTERNS) as (keyof typeof PATTERNS)[]) {
      if (excluded || !PATTERNS[key].test(label)) continue;
      intermediaries[key].charges++;
      if (!explained.has(t.id)) intermediaries[key].unexplained++;
      break;
    }
    if (!onAmex && /AMERICAN EXPRESS|\bAMEX\b/.test(t.rawLabel.toUpperCase())) amexSettlements++;
    if (/FACTURE CARTE|RELEVE (?:DE )?CARTE|DEPENSES? CARTE|DEBIT DIFFERE|CARTE .*DIFF/.test(t.rawLabel.toUpperCase())) deferredCard++;
    if (OPERATORS.test(label)) operatorMonths.add(t.date.slice(0, 7));
  }
  return {
    uploads,
    bankFrom: dates[0],
    bankTo: dates.at(-1),
    intermediaries,
    amexSettlements,
    amexStatement: bank.some((t) => t.rawLabel.startsWith("AMEX ")),
    deferredCard,
    operatorBills: operatorMonths.size,
  };
}

export type ItemStatus = "done" | "todo" | "optional";

export interface PlanItem {
  id: string;
  title: string;
  /** Short name of the source, e.g. "PayPal", for lists of sources. */
  short: string;
  why: string;
  steps: string[];
  accepts: string;
  status: ItemStatus;
  /** What the data says, e.g. "14 PayPal payments on your statements are still unnamed". */
  alert?: string;
  /** Shown when the user did not mention this source but the data points to it. */
  detected?: boolean;
  action?: "upload" | "gmail" | "paste" | "gdpr";
  /** This source can be connected directly (PayPal, through the bank connection provider). */
  connect?: string;
}

type PlanText = ReturnType<typeof onboardingText>["plan"];

const bankSteps = (id: string, t: PlanText["bank"]): string[] => {
  const common = t.steps;
  if (id === "credit-mutuel") return [...common.slice(0, 3), t.creditMutuelPdf, common[3]];
  if (id === "revolut") return [...t.revolut];
  if (id === "n26") return [...t.n26];
  return [...common];
};

function item(partial: Omit<PlanItem, "status"> & { status?: ItemStatus }): PlanItem {
  return { status: "todo", ...partial };
}

/** The checklist: one item per source to add, with its status from the uploaded data. */
/** `canConnect`: this server can connect accounts, so PayPal can be connected instead of exported. */
export function buildPlan(answers: Answers, facts: Facts, opts: { canConnect?: boolean; locale?: Locale } = {}): PlanItem[] {
  const text = onboardingText(opts.locale ?? "en");
  const t = text.plan;
  const items: PlanItem[] = [];
  const has = (s: Source) => (facts.uploads[s] ?? 0) > 0;
  const bankLabel = (id: string) => (id === "other-bank" ? t.bank.yourBank : (text.choices.banks[id]?.label ?? t.bank.yourBank));

  // 1. Bank accounts: the backbone, every charge goes through one.
  const banks = answers.banks.length ? answers.banks : ["other-bank"];
  for (const id of banks) {
    items.push(item({
      id: `bank:${id}`,
      title: t.bank.title(bankLabel(id)),
      short: bankLabel(id),
      why: t.bank.why,
      steps: bankSteps(id, t.bank),
      accepts: t.bank.accepts,
      action: "upload",
      // A file does not say which bank it comes from: with several banks, the user ticks each one.
      status: has("bank") && banks.length === 1 ? "done" : "todo",
      alert: has("bank") && banks.length > 1 ? t.bank.alertSeveral : undefined,
    }));
  }
  const bankDone = items.find((i) => i.id.startsWith("bank:") && i.status === "done");
  if (bankDone && facts.bankFrom && facts.bankTo && daysBetween(facts.bankFrom, facts.bankTo) < 300) {
    bankDone.alert = t.bank.alertShort(facts.bankFrom, facts.bankTo);
  }

  // 2. Cards with their own statement.
  const amexDetected = facts.amexSettlements > 0 && !answers.cards.includes("amex");
  if (answers.cards.includes("amex") || amexDetected) {
    items.push(item({
      id: "card:amex",
      title: t.amex.title,
      short: t.amex.short,
      why: t.amex.why,
      steps: [...t.amex.steps],
      accepts: t.amex.accepts,
      action: "upload",
      detected: amexDetected,
      status: facts.amexStatement ? "done" : "todo",
      alert: facts.amexSettlements && !facts.amexStatement ? t.amex.alert(facts.amexSettlements) : undefined,
    }));
  }
  const deferredDetected = facts.deferredCard > 0 && !answers.cards.includes("deferred");
  if (answers.cards.includes("deferred") || deferredDetected) {
    items.push(item({
      id: "card:deferred",
      title: t.deferred.title,
      short: t.deferred.short,
      why: t.deferred.why,
      steps: [...t.deferred.steps],
      accepts: t.deferred.accepts,
      action: "upload",
      detected: deferredDetected,
      status: "optional",
      alert: facts.deferredCard ? t.deferred.alert(facts.deferredCard) : undefined,
    }));
  }
  if (answers.cards.includes("other-card")) {
    items.push(item({
      id: "card:other",
      title: t.otherCard.title,
      short: t.otherCard.short,
      why: t.otherCard.why,
      steps: [...t.otherCard.steps],
      accepts: t.otherCard.accepts,
      action: "upload",
      status: "optional",
    }));
  }

  // 3. PayPal: hides the real merchant.
  const pp = facts.intermediaries.paypal;
  const paypalDetected = pp.charges > 0 && !answers.wallets.includes("paypal");
  const canConnect = !!opts.canConnect;
  if (answers.wallets.includes("paypal") || paypalDetected) {
    items.push(item({
      id: "paypal",
      title: t.paypal.title(canConnect),
      short: t.paypal.short,
      why: t.paypal.why,
      steps: [...(canConnect ? [t.paypal.connectStep] : []), ...t.paypal.steps],
      accepts: t.paypal.accepts(canConnect),
      action: "gdpr",
      connect: canConnect ? "PayPal" : undefined,
      detected: paypalDetected,
      status: has("paypal") ? "done" : "todo",
      alert: pp.unexplained ? t.paypal.alert(pp.unexplained) : undefined,
    }));
  }

  // 4. App stores.
  const ap = facts.intermediaries.apple;
  const appleDetected = ap.charges > 0 && !answers.stores.includes("apple");
  if (answers.stores.includes("apple") || appleDetected) {
    items.push(item({
      id: "apple",
      title: t.apple.title,
      short: t.apple.short,
      why: t.apple.why,
      steps: [...t.apple.steps],
      accepts: t.apple.accepts,
      action: "paste",
      detected: appleDetected,
      status: has("apple") ? "done" : "todo",
      alert: ap.unexplained ? t.apple.alert(ap.unexplained) : undefined,
    }));
  }
  const gp = facts.intermediaries.google;
  const googleDetected = gp.charges > 0 && !answers.stores.includes("google");
  if (answers.stores.includes("google") || googleDetected) {
    items.push(item({
      id: "google",
      title: t.google.title,
      short: t.google.short,
      why: t.google.why,
      steps: [...t.google.steps],
      accepts: t.google.accepts,
      action: "paste",
      detected: googleDetected,
      status: has("google") || (has("email") && gp.charges > 0 && gp.unexplained === 0) ? "done" : "todo",
      alert: gp.unexplained ? t.google.alert(gp.unexplained) : undefined,
    }));
  }
  const am = facts.intermediaries.amazon;
  if (answers.stores.includes("amazon") || am.charges > 0) {
    items.push(item({
      id: "amazon",
      title: t.amazon.title,
      short: t.amazon.short,
      why: t.amazon.why,
      steps: [...t.amazon.steps],
      accepts: t.amazon.accepts,
      detected: !answers.stores.includes("amazon"),
      status: "optional",
    }));
  }

  // 5. Mailboxes: receipts name the service, the plan and the next renewal.
  const boxes = answers.mailboxes.length ? answers.mailboxes : [];
  for (const id of boxes) {
    const gmail = id === "gmail";
    const box = text.choices.mailboxes[id]?.label ?? t.mail.mailbox;
    items.push(item({
      id: `mail:${id}`,
      title: gmail ? t.mail.gmailTitle : t.mail.title(box),
      short: box,
      why: t.mail.why,
      steps: gmail ? [...t.mail.gmailSteps] : [t.mail.search, id === "outlook" ? t.mail.outlook : t.mail.saveEml, t.mail.uploadEml],
      accepts: gmail ? t.mail.acceptsGmail : t.mail.acceptsOther,
      action: gmail ? "gmail" : "upload",
      status: has("email") ? "done" : "todo",
    }));
  }

  // 6. Other channels.
  if (answers.other.includes("operator") || facts.operatorBills > 0) {
    items.push(item({
      id: "operator",
      title: t.operator.title,
      short: t.operator.short,
      why: t.operator.why,
      steps: [...t.operator.steps],
      accepts: t.operator.accepts,
      detected: !answers.other.includes("operator"),
      status: "optional",
    }));
  }
  if (answers.other.includes("bnpl")) {
    items.push(item({
      id: "bnpl",
      title: t.bnpl.title,
      short: t.bnpl.short,
      why: t.bnpl.why,
      steps: [...t.bnpl.steps],
      accepts: t.bnpl.accepts,
      status: "done",
    }));
  }

  for (const i of items) if (answers.done.includes(i.id)) i.status = "done";
  const order: Record<ItemStatus, number> = { todo: 0, optional: 1, done: 2 };
  return items.sort((a, b) => order[a.status] - order[b.status]);
}

/** Items still to do or done; optional ones count once ticked. */
export function progress(plan: PlanItem[]): { done: number; total: number } {
  const counted = plan.filter((i) => i.status !== "optional");
  return { done: counted.filter((i) => i.status === "done").length, total: counted.length };
}

/** Keeps only known ids, so stored answers never carry anything else. */
export function sanitizeAnswers(input: unknown): Answers {
  const raw = (input ?? {}) as Record<string, unknown>;
  const pick = (key: keyof Answers, allowed: Choice[] | null) => {
    const list = Array.isArray(raw[key]) ? (raw[key] as unknown[]).filter((v): v is string => typeof v === "string") : [];
    const ids = allowed ? new Set(allowed.map((c) => c.id)) : null;
    return [...new Set(list.filter((v) => (ids ? ids.has(v) : /^[a-z:-]{1,40}$/.test(v))))].slice(0, 40);
  };
  return {
    banks: pick("banks", BANKS),
    cards: pick("cards", CARDS),
    wallets: pick("wallets", WALLETS),
    stores: pick("stores", STORES),
    mailboxes: pick("mailboxes", MAILBOXES),
    other: pick("other", OTHER),
    done: pick("done", null),
  };
}

/** GDPR right of access request, for services that only export a few months (PayPal). */
export function gdprRequest(service: string, since: string, locale: Locale = "en"): string {
  return onboardingText(locale).gdpr(service, since).join("\n");
}
