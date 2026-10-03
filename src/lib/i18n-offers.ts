import type { Locale } from "./i18n";
import { withFrenchSpaces } from "./typo";

/** Texts of the partner offer card. */
const en = {
  eyebrow: "Cheaper elsewhere",
  roseTitle: "Your price just went up: here is cheaper",
  saving: (offer: string, current: string, yearly: string) => `${offer} a month instead of ${current}: ${yearly} saved a year.`,
  check: "Check that it covers what you use before switching.",
  open: (partner: string) => `See the offer from ${partner}`,
  disclosure: "Partner offer: we earn a commission if you subscribe. Offers are ranked by what you save, never by our commission, and nothing about you is sent to the partner.",
  checked: (d: string) => `Price checked on ${d}.`,
};
type Dict = typeof en;
const fr: Dict = {
  eyebrow: "Moins cher ailleurs",
  roseTitle: "Votre prix vient d'augmenter : voici moins cher",
  saving: (offer, current, yearly) => `${offer} par mois au lieu de ${current} : ${yearly} d'économie par an.`,
  check: "Vérifiez que l'offre couvre ce que vous utilisez avant de changer.",
  open: (partner) => `Voir l'offre de ${partner}`,
  disclosure: "Offre partenaire : nous touchons une commission si vous souscrivez. Les offres sont classées selon votre économie, jamais selon notre commission, et rien vous concernant n'est transmis au partenaire.",
  checked: (d) => `Prix vérifié le ${d}.`,
};
export const OFFER_DICTS: Record<Locale, Dict> = { en, fr: withFrenchSpaces(fr) };
