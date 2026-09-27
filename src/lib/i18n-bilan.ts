import type { Locale } from "./i18n";
import type { BadgeId, Period } from "./bilan";
import { withFrenchSpaces } from "./typo";

/** Texts of the money report (/bilan): short eyebrows, one catchy line per card, honest hints. */
const en = {
  eyebrow: "Your money report",
  title: { week: "Your week in subscriptions", month: "Your month in subscriptions" } as Record<Period, string>,
  tabs: { week: "Week", month: "Month" } as Record<Period, string>,
  range: (a: string, b: string) => `${a} to ${b}`,
  prev: "Earlier period",
  next: "Later period",
  open: "My money report",

  spentEyebrow: "Charges",
  spentLine: (count: number) => (count === 0 ? "Not a single charge. Your wallet took a day off." : `${count} charge${count === 1 ? "" : "s"}, and not one went unnoticed.`),
  total: "Total taken",
  vsBefore: { week: "vs the week before", month: "vs the month before" } as Record<Period, string>,
  noBefore: "Nothing to compare with yet",
  daily: "Day by day",
  busiest: (day: string, amount: string) => `Heaviest day: ${day}, ${amount}.`,
  biggest: (name: string, amount: string) => `Biggest charge: ${name}, ${amount}.`,
  newOnes: (names: string) => `New this period: ${names}.`,

  nextEyebrow: "Coming up",
  nextLine: { week: "The next 7 days, already in the calendar", month: "The next 30 days, already in the calendar" } as Record<Period, string>,
  nextHint: "Expected from each subscription's next charge date and rhythm. Estimates, not certainties.",
  nextNone: "Nothing expected. Enjoy the quiet.",
  seeCalendar: "Open the calendar",

  eqEyebrow: "In real life",
  eqLine: "What these charges would buy instead",
  coffees: (n: number) => `${n} coffee${n === 1 ? "" : "s"}`,
  cinema: (n: string) => `${n} cinema ticket${n === "1" ? "" : "s"}`,
  eqHint: (coffee: string, cinema: string) => `At ${coffee} a coffee and ${cinema} a ticket, rounded prices chosen for the comparison.`,
  or: "or",

  catEyebrow: "Where it goes",
  catLine: (name: string) => `${name} leads the way`,

  decEyebrow: "Your decisions",
  decLine: (n: number) => (n === 0 ? "No decision yet: every subscription is still waiting for you." : `${n} decision${n === 1 ? "" : "s"} made. Every one counts.`),
  saved: "Confirmed savings",
  savedHint: "What you stopped, per year",
  potential: "Still to win",
  potentialHint: "What you no longer use, per year",
  decNote: "Your decisions as they stand today, whatever the period shown.",
  decide: "Decide now",

  badgesEyebrow: "Badges",
  badgesLine: (n: number, total: number) => `${n} of ${total} earned`,
  badges: {
    first: ["First report", "You opened your report: the detective thanks you."],
    calm: ["No surprise", "No new subscription appeared this period."],
    down: ["Lighter", "Less taken than the period before."],
    hunter: ["Hunter", "You stopped at least one subscription."],
    named: ["All named", "Every charge has a name."],
    yearly: ["No trap", "No yearly renewal in the next 30 days."],
  } as Record<BadgeId, [string, string]>,
  earned: "Earned",
  locked: "Not yet",

  empty: "Import a statement to get your first report.",
  emptyCta: "Add a statement",
  footer: "Figures from your statements and receipts. Private, encrypted, deleted 30 days after your last import.",
  otherCurrency: (list: string) => `Also paid in other currencies, not added up here: ${list}.`,
};

type Dict = typeof en;

const fr: Dict = {
  eyebrow: "Votre bilan d'argent",
  title: { week: "Votre semaine en abonnements", month: "Votre mois en abonnements" },
  tabs: { week: "Semaine", month: "Mois" },
  range: (a, b) => `du ${a} au ${b}`,
  prev: "Période précédente",
  next: "Période suivante",
  open: "Mon bilan",

  spentEyebrow: "Prélèvements",
  spentLine: (count) => (count === 0 ? "Pas un seul prélèvement. Votre portefeuille a pris congé." : `${count} prélèvement${count === 1 ? "" : "s"}, et pas un seul ne vous a échappé.`),
  total: "Total prélevé",
  vsBefore: { week: "par rapport à la semaine d'avant", month: "par rapport au mois d'avant" },
  noBefore: "Rien à comparer pour l'instant",
  daily: "Jour par jour",
  busiest: (day, amount) => `Jour le plus chargé : ${day}, ${amount}.`,
  biggest: (name, amount) => `Plus gros prélèvement : ${name}, ${amount}.`,
  newOnes: (names) => `Nouveau sur la période : ${names}.`,

  nextEyebrow: "À venir",
  nextLine: { week: "Les 7 prochains jours, déjà dans le calendrier", month: "Les 30 prochains jours, déjà dans le calendrier" },
  nextHint: "Estimé d'après la prochaine date et le rythme de chaque abonnement. Des estimations, pas des certitudes.",
  nextNone: "Rien de prévu. Profitez du calme.",
  seeCalendar: "Ouvrir le calendrier",

  eqEyebrow: "Dans la vraie vie",
  eqLine: "Ce que ces prélèvements auraient pu offrir",
  coffees: (n) => `${n} café${n > 1 ? "s" : ""}`,
  cinema: (n) => `${n} place${Number(n.replace(",", ".")) >= 2 ? "s" : ""} de cinéma`,
  eqHint: (coffee, cinema) => `À ${coffee} le café et ${cinema} la place, des prix arrondis choisis pour la comparaison.`,
  or: "ou",

  catEyebrow: "Où va l'argent",
  catLine: (name) => `En tête : ${name}`,

  decEyebrow: "Vos décisions",
  decLine: (n) => (n === 0 ? "Aucune décision encore : chaque abonnement vous attend." : `${n} décision${n > 1 ? "s" : ""} prise${n > 1 ? "s" : ""}. Chacune compte.`),
  saved: "Économies confirmées",
  savedHint: "Ce que vous avez arrêté, par an",
  potential: "Encore à gagner",
  potentialHint: "Ce que vous n'utilisez plus, par an",
  decNote: "Vos décisions telles qu'elles sont aujourd'hui, quelle que soit la période affichée.",
  decide: "Décider maintenant",

  badgesEyebrow: "Badges",
  badgesLine: (n, total) => `${n} sur ${total} obtenus`,
  badges: {
    first: ["Premier bilan", "Vous avez ouvert votre bilan : le détective vous remercie."],
    calm: ["Zéro surprise", "Aucun nouvel abonnement sur la période."],
    down: ["Plus léger", "Moins prélevé que la période d'avant."],
    hunter: ["Chasseur", "Vous avez arrêté au moins un abonnement."],
    named: ["Tout identifié", "Chaque prélèvement a un nom."],
    yearly: ["Pas de piège", "Aucun renouvellement annuel dans les 30 jours."],
  },
  earned: "Obtenu",
  locked: "Pas encore",

  empty: "Importez un relevé pour recevoir votre premier bilan.",
  emptyCta: "Ajouter un relevé",
  footer: "Chiffres tirés de vos relevés et reçus. Privé, chiffré, effacé 30 jours après votre dernier import.",
  otherCurrency: (list) => `Payé aussi dans d'autres devises, non additionné ici : ${list}.`,
};

const frTypo = withFrenchSpaces(fr);
export const bilanText = (locale: Locale): Dict => (locale === "fr" ? frTypo : en);
export type BilanText = Dict;
export const BILAN_DICTS = { en, fr: frTypo };
