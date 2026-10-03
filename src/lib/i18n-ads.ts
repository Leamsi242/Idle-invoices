import type { Locale } from "./i18n";
import { withFrenchSpaces } from "./typo";

/** Texts around ads: every ad says it is one. */
const en = {
  row: "Deals of the month",
  sponsored: "Ad",
  sponsoredBy: (a: string) => `Ad · ${a}`,
  close: "Close",
  sound: "Sound",
  mute: "Mute",
  prev: "Previous",
  next: "Next",
  why: "Shown because of the kind of subscriptions found here. Nothing about you is sent to the advertiser. Premium: no ads.",
};
type Dict = typeof en;
const fr: Dict = {
  row: "Bons plans du mois",
  sponsored: "Publicité",
  sponsoredBy: (a) => `Publicité · ${a}`,
  close: "Fermer",
  sound: "Son",
  mute: "Couper le son",
  prev: "Précédent",
  next: "Suivant",
  why: "Affichée selon le type d'abonnements trouvés ici. Rien vous concernant n'est transmis à l'annonceur. Premium : sans publicité.",
};
export const ADS_DICTS: Record<Locale, Dict> = { en, fr: withFrenchSpaces(fr) };
