import type { Locale } from "./i18n";
import { monthlyEquivalent } from "./engine/flags";
import type { StoredSubscription } from "./store";
import configured from "@/data/partner-offers.json";

/**
 * Cheaper alternatives from partners (affiliation), shown on a subscription the user pays for:
 * a mobile plan, an internet box, energy. The match is computed here, from what the app already
 * found; nothing about the user goes to the partner, only the click on the link counts.
 *
 * Rules that keep it honest: offers are ranked by what the user saves, never by our commission;
 * an offer is shown only if it saves at least MIN_SAVING a month and its price was checked
 * recently; every card says it is a partner offer.
 */
export interface PartnerOffer {
  id: string;
  /** Category of the subscriptions it replaces, as in descriptors.json (telecom, energy, ...). */
  category: string;
  partner: string;
  title: Record<Locale, string>;
  conditions: Record<Locale, string>;
  monthlyPrice: number;
  currency: string;
  /** Affiliate link, https only. */
  url: string;
  /** Our commission, for the economic model only: never used to rank or show offers. */
  commission?: number;
  /** Day the price was last checked on the partner's site; older than MAX_AGE_DAYS hides the offer. */
  checkedOn: string;
  expiresOn?: string;
}

export const MIN_SAVING = 2;
export const MAX_AGE_DAYS = 60;

/** Made-up offers for the demo (the demo bank pays Free Mobile 19,99 €), "checked" today. */
const demoOffers = (today: string): PartnerOffer[] => [
  {
    id: "demo-mobile",
    category: "telecom",
    partner: "Opérateur exemple (données de test)",
    title: { fr: "Forfait mobile 100 Go", en: "100 GB mobile plan" },
    conditions: { fr: "Sans engagement, prix fixe pendant 12 mois. Offre fictive de démonstration.", en: "No commitment, fixed price for 12 months. Made-up demo offer." },
    monthlyPrice: 9.99,
    currency: "EUR",
    url: "https://example.com/offre-mobile",
    checkedOn: today,
  },
];

const DAY = 86_400_000;

function valid(o: PartnerOffer, today: string): boolean {
  const age = (Date.parse(today) - Date.parse(o.checkedOn)) / DAY;
  return /^https:\/\//.test(o.url) && o.monthlyPrice > 0 && age <= MAX_AGE_DAYS && (!o.expiresOn || o.expiresOn >= today);
}

export interface Alternative {
  offer: PartnerOffer;
  savingMonthly: number;
  savingYearly: number;
  /** The subscription's price went up in the last 90 days: the best moment to show it. */
  priceRose: boolean;
}

/** The offer that saves the most on this subscription, or nothing. */
export function bestAlternative(s: Pick<StoredSubscription, "category" | "currency" | "currentAmount" | "frequency" | "status" | "usage" | "priceChanges">, offers: PartnerOffer[], today: string): Alternative | null {
  if (!s.category || s.status === "cancelled" || s.usage === "notsub" || s.usage === "stopped") return null;
  const current = monthlyEquivalent(s);
  const ranked = offers
    .filter((o) => o.category === s.category && o.currency === s.currency && valid(o, today))
    .map((offer) => ({ offer, savingMonthly: Math.round((current - offer.monthlyPrice) * 100) / 100 }))
    .filter((x) => x.savingMonthly >= MIN_SAVING)
    // By saving, then by price: the commission plays no part.
    .sort((a, b) => b.savingMonthly - a.savingMonthly || a.offer.monthlyPrice - b.offer.monthlyPrice);
  const best = ranked[0];
  if (!best) return null;
  const rose = (s.priceChanges ?? []).some((c) => c.to > c.from && (Date.parse(today) - Date.parse(c.date)) / DAY <= 90);
  return { ...best, savingYearly: Math.round(best.savingMonthly * 12 * 100) / 100, priceRose: rose };
}

/** The partner offers in force: the made-up ones in the demo, otherwise src/data/partner-offers.json. */
export const partnerOffers = (demo: boolean, today: string): PartnerOffer[] => (demo ? demoOffers(today) : (configured as PartnerOffer[]));
