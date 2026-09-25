import type { NormalizedTransaction, Source } from "./types";
import { cleanLabel } from "./engine/labels";
import { daysBetween } from "./dates";

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

export const BANKS: Choice[] = [
  { id: "credit-mutuel", label: "Crédit Mutuel / CIC" },
  { id: "bnp", label: "BNP Paribas" },
  { id: "societe-generale", label: "Société Générale" },
  { id: "credit-agricole", label: "Crédit Agricole / LCL" },
  { id: "bpce", label: "Caisse d'Épargne / Banque Populaire" },
  { id: "banque-postale", label: "La Banque Postale" },
  { id: "boursobank", label: "BoursoBank / Hello bank! / Fortuneo" },
  { id: "n26", label: "N26" },
  { id: "revolut", label: "Revolut" },
  { id: "other-bank", label: "Another bank" },
];

export const CARDS: Choice[] = [
  { id: "amex", label: "American Express", hint: "Its charges are only on the Amex statement" },
  { id: "deferred", label: "A card with deferred debit", hint: "One monthly line on the bank account" },
  { id: "other-card", label: "Another credit card (Visa, Mastercard) with its own statement" },
];

export const WALLETS: Choice[] = [
  { id: "paypal", label: "PayPal" },
  { id: "apple-pay", label: "Apple Pay", hint: "Charges show on the card's statement" },
  { id: "google-pay", label: "Google Pay", hint: "Charges show on the card's statement" },
  { id: "lydia", label: "Lydia / Sumeria" },
];

export const STORES: Choice[] = [
  { id: "apple", label: "iPhone / iPad (App Store)" },
  { id: "google", label: "Android (Google Play)" },
  { id: "amazon", label: "Amazon (Prime, Channels, Kindle, Audible)" },
];

export const MAILBOXES: Choice[] = [
  { id: "gmail", label: "Gmail" },
  { id: "outlook", label: "Outlook / Hotmail" },
  { id: "icloud", label: "iCloud Mail" },
  { id: "yahoo", label: "Yahoo" },
  { id: "other-mail", label: "Another mailbox (Orange, Free, SFR, work...)" },
];

export const OTHER: Choice[] = [
  { id: "operator", label: "Services billed by my phone or internet operator", hint: "Canal+, Netflix or app purchases on the box or mobile bill" },
  { id: "bnpl", label: "Pay in instalments (Klarna, Alma, Oney, PayPal 4X)" },
];

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
    for (const key of Object.keys(PATTERNS) as (keyof typeof PATTERNS)[]) {
      if (!PATTERNS[key].test(label)) continue;
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
  why: string;
  steps: string[];
  accepts: string;
  status: ItemStatus;
  /** What the data says, e.g. "14 PayPal payments on your statements are still unnamed". */
  alert?: string;
  /** Shown when the user did not mention this source but the data points to it. */
  detected?: boolean;
  action?: "upload" | "gmail" | "paste" | "gdpr";
}

const bankSteps = (id: string): string[] => {
  const common = [
    "Open your bank's website (exports are easier there than in the app) and go to the account's list of operations.",
    "Look for Export, Download or Télécharger. Choose CSV (sometimes called Excel or tableur).",
    "Pick the last 12 months: yearly renewals only show once a year.",
    "Upload the file here. Repeat for each current account.",
  ];
  if (id === "credit-mutuel") return [...common.slice(0, 3), "If only PDF statements are offered, download the monthly PDF statements (Relevés de compte): they are read as well.", common[3]];
  if (id === "revolut") return ["In the Revolut app, open the account, then Statement (Relevé).", "Choose Excel/CSV and the last 12 months.", "Upload the file here."];
  if (id === "n26") return ["In the N26 web app, open Downloads or Statements and export the transactions as CSV.", "Choose the last 12 months.", "Upload the file here."];
  return common;
};

function item(partial: Omit<PlanItem, "status"> & { status?: ItemStatus }): PlanItem {
  return { status: "todo", ...partial };
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** The checklist: one item per source to add, with its status from the uploaded data. */
export function buildPlan(answers: Answers, facts: Facts): PlanItem[] {
  const items: PlanItem[] = [];
  const has = (s: Source) => (facts.uploads[s] ?? 0) > 0;
  const bankLabel = (id: string) => BANKS.find((b) => b.id === id)?.label ?? "Bank";

  // 1. Bank accounts: the backbone, every charge goes through one.
  const banks = answers.banks.length ? answers.banks : ["other-bank"];
  for (const id of banks) {
    items.push(item({
      id: `bank:${id}`,
      title: `${id === "other-bank" ? "Your bank account" : bankLabel(id)}: 12 months of operations`,
      why: "Every subscription ends up on a bank account, even the ones paid through PayPal or an app store.",
      steps: bankSteps(id),
      accepts: "CSV, or PDF statements",
      action: "upload",
      // A file does not say which bank it comes from: with several banks, the user ticks each one.
      status: has("bank") && banks.length === 1 ? "done" : "todo",
      alert: has("bank") && banks.length > 1 ? "We have read statements from one of your banks. Tick this item once this bank's are added too." : undefined,
    }));
  }
  const bankDone = items.find((i) => i.id.startsWith("bank:") && i.status === "done");
  if (bankDone && facts.bankFrom && facts.bankTo && daysBetween(facts.bankFrom, facts.bankTo) < 300) {
    bankDone.alert = `Your statements cover ${facts.bankFrom} to ${facts.bankTo}. Add older months to catch yearly renewals (12 months is best).`;
  }

  // 2. Cards with their own statement.
  const amexDetected = facts.amexSettlements > 0 && !answers.cards.includes("amex");
  if (answers.cards.includes("amex") || amexDetected) {
    items.push(item({
      id: "card:amex",
      title: "American Express: monthly statements",
      why: "Your bank only shows one monthly payment to Amex. The subscriptions paid with the card are on the Amex statement.",
      steps: [
        "Sign in to your American Express account on the website.",
        "Open Statements (Relevés) and download the PDF statement of each of the last 12 months.",
        "Upload all the PDFs here at once.",
      ],
      accepts: "PDF statements",
      action: "upload",
      detected: amexDetected,
      status: facts.amexStatement ? "done" : "todo",
      alert: facts.amexSettlements && !facts.amexStatement ? `We found ${plural(facts.amexSettlements, "payment")} to American Express on your bank account, but not the card's own statement.` : undefined,
    }));
  }
  const deferredDetected = facts.deferredCard > 0 && !answers.cards.includes("deferred");
  if (answers.cards.includes("deferred") || deferredDetected) {
    items.push(item({
      id: "card:deferred",
      title: "Deferred debit card: card statements",
      why: "With deferred debit, the account statement can show a single monthly total. If your card operations are not listed one by one, add the card statement.",
      steps: [
        "In your online banking, open the card (Mes cartes) and its statement (relevé d'opérations carte).",
        "Export it as CSV, or download the monthly PDF statements, for the last 12 months.",
        "Upload the files here.",
      ],
      accepts: "CSV or PDF",
      action: "upload",
      detected: deferredDetected,
      status: "optional",
      alert: facts.deferredCard ? `We found ${plural(facts.deferredCard, "monthly card total")} on your bank account.` : undefined,
    }));
  }
  if (answers.cards.includes("other-card")) {
    items.push(item({
      id: "card:other",
      title: "Credit card: its own statement",
      why: "Charges on a credit card are only listed on the card's statement.",
      steps: ["Download the card statements of the last 12 months from the card issuer's website (CSV or PDF).", "Upload them here."],
      accepts: "CSV or PDF",
      action: "upload",
      status: "optional",
    }));
  }

  // 3. PayPal: hides the real merchant.
  const pp = facts.intermediaries.paypal;
  const paypalDetected = pp.charges > 0 && !answers.wallets.includes("paypal");
  if (answers.wallets.includes("paypal") || paypalDetected) {
    items.push(item({
      id: "paypal",
      title: "PayPal: activity download",
      why: "On a bank statement every PayPal payment reads \"PAYPAL\". PayPal's own export says which service each one paid.",
      steps: [
        "Sign in on paypal.com (the website, not the app).",
        "Open Activity, then Statements (Relevés), then Activity download (Télécharger l'activité).",
        "Choose Completed payments, CSV format, and the longest period offered.",
        "Upload the CSV here. PayPal receipts found by the Gmail scan also help.",
        "If PayPal only offers a few months, ask for your full history under the GDPR right of access (template below).",
      ],
      accepts: "CSV",
      action: "gdpr",
      detected: paypalDetected,
      status: has("paypal") ? "done" : "todo",
      alert: pp.unexplained ? `${plural(pp.unexplained, "PayPal payment")} on your statements ${pp.unexplained === 1 ? "is" : "are"} still unnamed.` : undefined,
    }));
  }

  // 4. App stores.
  const ap = facts.intermediaries.apple;
  const appleDetected = ap.charges > 0 && !answers.stores.includes("apple");
  if (answers.stores.includes("apple") || appleDetected) {
    items.push(item({
      id: "apple",
      title: "Apple: your subscriptions list",
      why: "Every App Store subscription reads \"APPLE.COM/BILL\" on a statement. The list on your iPhone names them.",
      steps: [
        "On your iPhone, open Settings, tap your name, then Subscriptions.",
        "Take a screenshot of the list (Active and Inactive), or copy its text.",
        "Upload the screenshot here, or paste the text and choose \"Apple\".",
        "For past purchases, reportaproblem.apple.com lists every charge.",
      ],
      accepts: "Screenshot or pasted text",
      action: "paste",
      detected: appleDetected,
      status: has("apple") ? "done" : "todo",
      alert: ap.unexplained ? `${plural(ap.unexplained, "Apple charge")} on your statements ${ap.unexplained === 1 ? "is" : "are"} still unnamed.` : undefined,
    }));
  }
  const gp = facts.intermediaries.google;
  const googleDetected = gp.charges > 0 && !answers.stores.includes("google");
  if (answers.stores.includes("google") || googleDetected) {
    items.push(item({
      id: "google",
      title: "Google Play: your subscriptions list",
      why: "Google Play charges read \"GOOGLE*GOOGLE PLAY APPS\" whatever the app. Several apps can cost the same price.",
      steps: [
        "Open the Play Store, tap your profile picture, then Payments and subscriptions, then Subscriptions.",
        "Take a screenshot of the list, or copy its text, and add it here with \"Google Play\".",
        "Even better: the Gmail scan reads every Google Play order confirmation, including past and cancelled subscriptions.",
      ],
      accepts: "Screenshot, pasted text, or Gmail scan",
      action: "paste",
      detected: googleDetected,
      status: has("google") || (has("email") && gp.charges > 0 && gp.unexplained === 0) ? "done" : "todo",
      alert: gp.unexplained ? `${plural(gp.unexplained, "Google charge")} on your statements ${gp.unexplained === 1 ? "is" : "are"} still unnamed.` : undefined,
    }));
  }
  const am = facts.intermediaries.amazon;
  if (answers.stores.includes("amazon") || am.charges > 0) {
    items.push(item({
      id: "amazon",
      title: "Amazon: memberships and subscriptions",
      why: "Prime, Prime Video Channels, Kindle Unlimited and Audible renew on their own, often once a year.",
      steps: [
        "On amazon.fr, open Your Account, then Memberships and subscriptions.",
        "Check each active one. Their receipts come by email: the Gmail scan finds them.",
        "Tick this item once checked.",
      ],
      accepts: "Receipts by email",
      detected: !answers.stores.includes("amazon"),
      status: "optional",
    }));
  }

  // 5. Mailboxes: receipts name the service, the plan and the next renewal.
  const boxes = answers.mailboxes.length ? answers.mailboxes : [];
  for (const id of boxes) {
    const gmail = id === "gmail";
    items.push(item({
      id: `mail:${id}`,
      title: gmail ? "Gmail: one-time receipt scan" : `${MAILBOXES.find((m) => m.id === id)?.label ?? "Mailbox"}: receipts`,
      why: "Receipts name the real service, the plan, the price and the next renewal. They also catch trials that are about to convert.",
      steps: gmail
        ? [
            "Tap \"Connect Gmail and scan\" on the upload page.",
            "Google asks for read-only access. We read receipts only, keep amounts and merchants, and revoke the access right away.",
            "Repeat for each Gmail address you use for purchases.",
          ]
        : [
            "Search the mailbox for: receipt, invoice, facture, reçu, abonnement, subscription, renewal, trial.",
            id === "outlook"
              ? "Open each receipt, then More actions (...), then Download: it saves a .eml file."
              : "Save each receipt as a file (.eml), or forward them to a Gmail address and use the Gmail scan.",
            "Upload the .eml files here, or paste the text of a receipt in the paste box.",
          ],
      accepts: gmail ? "Gmail scan" : ".eml files or pasted text",
      action: gmail ? "gmail" : "upload",
      status: has("email") ? "done" : "todo",
    }));
  }

  // 6. Other channels.
  if (answers.other.includes("operator") || facts.operatorBills > 0) {
    items.push(item({
      id: "operator",
      title: "Phone and internet bills: options and third-party purchases",
      why: "Options on the box (Canal+, Netflix) and purchases billed to the phone (\"Internet+\", \"achats de contenus\") are hidden in the monthly bill.",
      steps: [
        "Open your operator's customer area and the latest bill.",
        "Look at Options, Services, Achats de contenus or Internet+ / SMS+.",
        "Anything you do not use: remove it there, and in Internet+ you can block third-party purchases.",
        "Tick this item once checked.",
      ],
      accepts: "Checked by hand",
      detected: !answers.other.includes("operator"),
      status: "optional",
    }));
  }
  if (answers.other.includes("bnpl")) {
    items.push(item({
      id: "bnpl",
      title: "Instalment plans (Klarna, Alma, Oney, PayPal 4X)",
      why: "Instalments repeat every month but pay for one purchase. They are left out of the report on purpose, so nothing to add.",
      steps: ["Nothing to do. If a subscription was paid in instalments, its receipt still shows it."],
      accepts: "Nothing",
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
export function gdprRequest(service: string, since: string): string {
  return [
    `Subject: Right of access request (GDPR article 15): full ${service} transaction history`,
    ``,
    `Hello,`,
    ``,
    `Under article 15 of the General Data Protection Regulation (EU 2016/679), I ask for a copy of all the personal data you hold about me, and in particular the complete history of my transactions since ${since}, with for each one the date, the amount, the currency, the merchant and the funding source.`,
    ``,
    `Under article 20 (right to data portability), I ask for this history in a structured, commonly used and machine-readable format, such as CSV.`,
    ``,
    `Article 12(3) gives you one month from receipt of this request to answer. My account is registered with this email address.`,
    ``,
    `Thank you,`,
    `[Your name]`,
  ].join("\n");
}
