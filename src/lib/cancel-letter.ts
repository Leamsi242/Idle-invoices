import type { Channel } from "./types";
import type { Locale } from "./i18n";
import { formatDate, money } from "./i18n";
import { frenchSpaces, withFrenchSpaces } from "./typo";
import type { Reminder } from "./ics";

/**
 * The cancellation assistant: a letter (or e-mail) ready to send to the service, written from what
 * the app already knows, and a reminder to check the charges stop. Everything is built in the
 * browser; the user's name is never sent to the server.
 *
 * A refund is asked for, never claimed as a right: only a SEPA direct debit gives an unconditional
 * refund (by the bank, within 8 weeks), and that is told to the user, not written to the service.
 */
export type CancelReason = "unused" | "price" | "other";

export interface LetterInput {
  serviceName: string;
  channel: Channel;
  locale: Locale;
  today: string;
  name: string;
  reference?: string;
  reason: CancelReason;
  /** The last charge, when a refund is asked for. */
  refund?: { date: string; amount: number; currency: string };
}

const en = {
  subject: (s: string) => `Cancellation of my ${s} subscription`,
  hello: "Hello,",
  ask: (s: string) => `I am writing to cancel my ${s} subscription, effective immediately, and to stop any further charge.`,
  ref: (r: string) => `Customer reference or account: ${r}.`,
  reasons: {
    unused: "I no longer use this service.",
    price: "The price no longer suits me.",
    other: "",
  } as Record<CancelReason, string>,
  refund: (date: string, amount: string) => `I also ask you to refund the charge of ${date} (${amount}), as I will not use the service for this period.`,
  confirm: "Please confirm the cancellation in writing, with the date it takes effect and the amount refunded, if any.",
  thanks: "Thank you in advance.",
  bye: "Kind regards,",
  law: "",
};

type Dict = typeof en;

const fr: Dict = {
  subject: (s) => `Résiliation de mon abonnement ${s}`,
  hello: "Bonjour,",
  ask: (s) => `Je vous demande de résilier mon abonnement ${s} dès réception de ce message, et de cesser tout prélèvement.`,
  ref: (r) => `Référence client ou identifiant du compte : ${r}.`,
  reasons: {
    unused: "Je n'utilise plus ce service.",
    price: "Le prix ne me convient plus.",
    other: "",
  },
  refund: (date, amount) => `Je vous demande également le remboursement du prélèvement du ${date} (${amount}), puisque je n'utiliserai pas le service sur cette période.`,
  confirm: "Merci de me confirmer la résiliation par écrit, avec sa date d'effet et, le cas échéant, le montant remboursé.",
  thanks: "Merci d'avance.",
  bye: "Cordialement,",
  // Since 1 June 2023, a contract concluded online must be cancellable online, free of charge.
  law: "Pour rappel, un contrat souscrit en ligne doit pouvoir être résilié en ligne, gratuitement (article L215-1-1 du Code de la consommation).",
};

const DICTS: Record<Locale, Dict> = { en, fr: withFrenchSpaces(fr) };
export const LETTER_DICTS = DICTS;

/** Apple and Google bill the subscription themselves: cancelling happens in their settings, no letter. */
export const letterFits = (channel: Channel) => channel !== "apple" && channel !== "google";

export function buildLetter(i: LetterInput): { subject: string; body: string } {
  const t = DICTS[i.locale];
  const lines = [
    t.hello,
    "",
    [t.ask(i.serviceName), t.reasons[i.reason]].filter(Boolean).join(" "),
    ...(i.reference?.trim() ? [t.ref(i.reference.trim())] : []),
    ...(i.refund ? [t.refund(formatDate(i.refund.date, i.locale), money(i.refund.amount, i.refund.currency, i.locale))] : []),
    "",
    t.confirm,
    ...(t.law ? [t.law] : []),
    "",
    t.thanks,
    "",
    t.bye,
    i.name.trim() || "",
  ];
  return { subject: t.subject(i.serviceName), body: lines.join("\n").trimEnd() };
}

/** A mailto link: the user's own mail app opens with the letter, the recipient left for them to fill. */
export const mailtoLink = (l: { subject: string; body: string }, to = "") => `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(l.subject)}&body=${encodeURIComponent(l.body)}`;

/**
 * The charge that a refund request would be about: the latest one, if it is recent enough to
 * still be worth asking for (30 days).
 */
export function refundable(charges: { date: string; amount: number }[] | undefined, today: string): { date: string; amount: number } | undefined {
  const last = [...(charges ?? [])].filter((c) => c.amount > 0).sort((a, b) => b.date.localeCompare(a.date))[0];
  if (!last) return undefined;
  const days = (Date.parse(today) - Date.parse(last.date)) / 86_400_000;
  return days >= 0 && days <= 30 ? last : undefined;
}

/** Two days after the next expected charge: check it did not happen. */
export function checkReminder(serviceName: string, nextCharge: string, locale: Locale): Reminder {
  const date = new Date(Date.parse(nextCharge) + 2 * 86_400_000).toISOString().slice(0, 10);
  const fr = locale === "fr";
  return {
    uid: `check-${serviceName}-${nextCharge}`.replace(/[^A-Za-z0-9-]/g, ""),
    title: fr ? `Vérifier que ${serviceName} ne prélève plus` : `Check that ${serviceName} stopped charging`,
    date,
    description: fr
      ? frenchSpaces(`Vous avez demandé la résiliation de ${serviceName}. Le prochain prélèvement était prévu le ${formatDate(nextCharge, locale)} : vérifiez votre relevé.`)
      : `You asked to cancel ${serviceName}. The next charge was expected on ${formatDate(nextCharge, locale)}: check your statement.`,
  };
}

/** Texts of the assistant's panel. */
const uiEn = {
  title: "Prepare my cancellation",
  intro: "A letter ready to send, written from your charges. Nothing goes to our servers: your name stays in this browser.",
  name: "Your name",
  reference: "Customer reference or account e-mail (optional)",
  reason: "Reason",
  reasons: { unused: "I no longer use it", price: "Too expensive", other: "No reason given" } as Record<CancelReason, string>,
  refund: (date: string, amount: string) => `Ask for a refund of the charge of ${date} (${amount})`,
  refundNote: "A refund is a request: the service decides, unless the law or its terms say otherwise.",
  preview: "Your letter (you can edit it)",
  copy: "Copy",
  copied: "Copied",
  mail: "Open in my mail app",
  page: (s: string) => `Open ${s}'s cancellation page`,
  sepa: "SEPA direct debit: for 8 weeks after the debit, your bank must refund an authorised direct debit, without a reason (article L133-25 of the French Monetary and Financial Code). This refund does not end the contract: send the letter too.",
  store: (s: string) => `${s} is billed by an app store: cancel in its settings (steps above). No letter is needed.`,
  remind: "Remind me to check the charges stop",
  after: "Once the request is sent, choose \"I canceled this service\" above.",
};
type UiDict = typeof uiEn;
const uiFr: UiDict = {
  title: "Préparer ma résiliation",
  intro: "Une lettre prête à envoyer, écrite d'après vos prélèvements. Rien ne part sur nos serveurs : votre nom reste dans ce navigateur.",
  name: "Votre nom",
  reference: "Référence client ou e-mail du compte (facultatif)",
  reason: "Motif",
  reasons: { unused: "Je ne l'utilise plus", price: "Trop cher", other: "Sans motif" },
  refund: (date, amount) => `Demander le remboursement du prélèvement du ${date} (${amount})`,
  refundNote: "Le remboursement est une demande : le service décide, sauf si la loi ou ses conditions prévoient autre chose.",
  preview: "Votre lettre (modifiable)",
  copy: "Copier",
  copied: "Copié",
  mail: "Ouvrir dans ma messagerie",
  page: (s) => `Ouvrir la page de résiliation de ${s}`,
  sepa: "Prélèvement SEPA : pendant 8 semaines après le débit, votre banque doit vous rembourser un prélèvement autorisé, sans justification (article L133-25 du Code monétaire et financier). Ce remboursement n'arrête pas le contrat : envoyez aussi la lettre.",
  store: (s) => `${s} est facturé par une boutique d'applications : résiliez dans ses réglages (étapes ci-dessus). Pas besoin de lettre.`,
  remind: "Me rappeler de vérifier que les prélèvements s'arrêtent",
  after: "Une fois la demande envoyée, choisissez « J'ai résilié ce service » plus haut.",
};
export const ASSISTANT_DICTS: Record<Locale, UiDict> = { en: uiEn, fr: withFrenchSpaces(uiFr) };
export type AssistantText = UiDict;
