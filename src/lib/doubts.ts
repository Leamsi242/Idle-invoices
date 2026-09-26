import type { Channel, Frequency, Status } from "./types";
import type { Facts } from "./onboarding";
import { daysBetween } from "./dates";
import { SHORT_HISTORY_DAYS } from "./engine/pipeline";
import { messages, money, type Locale } from "./i18n";

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

export interface Connections { banks: string[]; mailboxes: string[]; files: number; wallets?: string[] }

export type Doubt =
  | { kind: "mail"; id: string; title: string; detail: string }
  | { kind: "card"; id: string; title: string; detail: string; bank: string }
  | { kind: "paypal"; id: string; title: string; detail: string; bank: string }
  | { kind: "name"; id: string; title: string; detail: string; labelKey: string; store?: "apple" | "google" };

const MAX_NAME_QUESTIONS = 5;

/** `canConnect`: this server can connect accounts (PayPal included), so it may suggest one. */
export function findDoubts(subs: DoubtSub[], facts: Facts, connections: Connections, locale: Locale = "en", opts: { canConnect?: boolean } = {}): Doubt[] {
  const t = messages(locale).doubts;
  const doubts: Doubt[] = [];
  const open = subs.filter((s) => s.needsLabel && s.status !== "cancelled");
  // Count the subscriptions behind PayPal or a store, not every payment: one-off purchases don't matter here.
  const viaPaypal = open.filter((s) => s.channel === "paypal").length;
  const viaStores = open.filter((s) => s.channel === "google" || s.channel === "apple").length;
  const shortHistory = !!facts.bankFrom && !!facts.bankTo && daysBetween(facts.bankFrom, facts.bankTo) < SHORT_HISTORY_DAYS;
  // PayPal names every payment it made: one connection answers all the PayPal questions at once.
  const paypalRead = (connections.wallets?.length ?? 0) > 0 || (facts.uploads.paypal ?? 0) > 0;
  const askPaypal = !!opts.canConnect && viaPaypal > 0 && !paypalRead;
  if (askPaypal) doubts.push({ kind: "paypal", id: "connect:paypal", bank: "PayPal", title: t.paypalTitle(viaPaypal), detail: t.paypalDetail });
  // The mailbox answers the rest (and PayPal too, when PayPal is not suggested).
  const hidden = viaStores + (askPaypal ? 0 : viaPaypal);
  if (connections.mailboxes.length === 0 && (hidden > 0 || shortHistory)) {
    doubts.push({
      kind: "mail",
      id: "mail",
      title: hidden > 0 ? (askPaypal ? t.mailTitleStores(hidden) : t.mailTitleHidden(hidden)) : t.mailTitleShort,
      detail: hidden > 0 ? `${t.mailWhy}${shortHistory ? ` ${t.mailYearly}` : ""} ${t.mailSafe}` : `${t.mailYearly} ${t.connectMailbox} ${t.mailSafe}`,
    });
  }
  const amexConnected = connections.banks.some((b) => /american express|\bamex\b/i.test(b));
  if (facts.amexSettlements > 0 && !facts.amexStatement && !amexConnected) {
    doubts.push({ kind: "card", id: "card:amex", bank: "American Express", title: t.cardTitle, detail: t.cardDetail });
  }
  // Not while a PayPal connection would name them without the user typing anything.
  const unnamed = open.filter((s) => !(askPaypal && s.channel === "paypal")).slice(0, MAX_NAME_QUESTIONS);
  for (const s of unnamed) {
    const store = s.channel === "google" ? "google" : s.channel === "apple" ? "apple" : undefined;
    const amount = money(s.currentAmount, s.currency, locale);
    const via = t.via[s.channel];
    doubts.push({
      kind: "name",
      id: `name:${s.key}`,
      labelKey: s.key,
      store,
      title: via ? t.nameVia(amount, t.every[s.frequency], via) : t.nameWhat(s.serviceName, amount, t.every[s.frequency]),
      detail: store ? t.nameStore(t.storeName[store]) : t.nameOther,
    });
  }
  return doubts;
}
