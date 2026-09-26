import type { Channel, Frequency, Status } from "./types";
import type { Facts } from "./onboarding";

/**
 * After an automatic analysis (bank and mailbox connected), the few points where the report is
 * unsure, each with the smallest thing the user can do about it. Nothing is asked when the data
 * is enough: the user is only interrupted when an answer changes the report.
 */
export interface DoubtSub {
  key: string;
  serviceName: string;
  currentAmount: number;
  currency: string;
  frequency: Frequency;
  status: Status;
  needsLabel: boolean;
  channel: Channel;
}

export interface Connections { banks: string[]; mailboxes: string[]; files: number }

export type Doubt =
  | { kind: "mail"; id: string; title: string; detail: string }
  | { kind: "card"; id: string; title: string; detail: string; bank: string }
  | { kind: "name"; id: string; title: string; detail: string; labelKey: string; store?: "apple" | "google" };

const MAX_NAME_QUESTIONS = 5;
const via: Partial<Record<Channel, string>> = { google: "Google Play", apple: "the App Store", paypal: "PayPal" };

export function findDoubts(subs: DoubtSub[], facts: Facts, connections: Connections): Doubt[] {
  const doubts: Doubt[] = [];
  const hidden = facts.intermediaries.paypal.unexplained + facts.intermediaries.google.unexplained + facts.intermediaries.apple.unexplained;
  // One connection answers many questions at once: ask for it first.
  if (connections.mailboxes.length === 0 && hidden > 0) {
    doubts.push({
      kind: "mail",
      id: "mail",
      title: `${hidden} payment${hidden === 1 ? "" : "s"} through PayPal, Google Play or Apple can't be named from your bank alone`,
      detail: "Connect your mailbox: the receipts say which service each payment was for. Read-only, receipts only, access closed right after.",
    });
  }
  if (facts.amexSettlements > 0 && !facts.amexStatement) {
    doubts.push({
      kind: "card",
      id: "card:amex",
      bank: "American Express",
      title: "Your bank pays an American Express card every month",
      detail: "What that card pays for is only visible on the card itself. Connect it the same way as your bank.",
    });
  }
  const unnamed = subs.filter((s) => s.needsLabel && s.status !== "cancelled").slice(0, MAX_NAME_QUESTIONS);
  for (const s of unnamed) {
    const store = s.channel === "google" ? "google" : s.channel === "apple" ? "apple" : undefined;
    const every = { weekly: "a week", monthly: "a month", quarterly: "a quarter", yearly: "a year" }[s.frequency];
    doubts.push({
      kind: "name",
      id: `name:${s.key}`,
      labelKey: s.key,
      store,
      title: via[s.channel]
        ? `Which service is the ${s.currentAmount.toFixed(2)} ${s.currency} ${every} paid through ${via[s.channel]}?`
        : `What is "${s.serviceName}", ${s.currentAmount.toFixed(2)} ${s.currency} ${every}?`,
      detail: store
        ? `Type its name, or add a screenshot of your ${store === "google" ? "Google Play" : "App Store"} subscriptions and we will match it.`
        : "Type its name so we can show how to cancel it. If you don't know, the charge date and amount are in your banking app.",
    });
  }
  return doubts;
}
