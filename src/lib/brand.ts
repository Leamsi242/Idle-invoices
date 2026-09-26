import icons from "@/data/brand-icons.json";
import { findDescriptor } from "./engine/descriptors";

/** A service's brand: its bundled logo (Simple Icons), or the domain its favicon comes from. */
export interface Brand { hex?: string; path?: string; domain?: string; category?: string }

const ICONS = icons as Record<string, Brand>;

// Banks and cards shown as ways of paying.
const BANKS: [RegExp, string][] = [
  [/cr[ée]dit mutuel/i, "creditmutuel.fr"],
  [/\bcic\b/i, "cic.fr"],
  [/bnp/i, "mabanque.bnpparibas"],
  [/soci[ée]t[ée] g[ée]n[ée]rale/i, "societegenerale.fr"],
  [/cr[ée]dit agricole/i, "credit-agricole.fr"],
  [/\blcl\b/i, "lcl.fr"],
  [/banque postale/i, "labanquepostale.fr"],
  [/bourso/i, "boursobank.com"],
  [/caisse d.[ée]pargne/i, "caisse-epargne.fr"],
  [/banque populaire/i, "banquepopulaire.fr"],
  [/revolut/i, "revolut.com"],
  [/\bn26\b/i, "n26.com"],
];

export function brandOf(name: string): Brand | undefined {
  if (ICONS[name]) return ICONS[name];
  const known = findDescriptor([name]);
  if (known && ICONS[known.serviceName]) return ICONS[known.serviceName];
  if (/american express|\bamex\b/i.test(name)) return ICONS["American Express"];
  if (/paypal/i.test(name)) return ICONS.PayPal;
  // Apple's billing line ("APPLE.COM/BILL", "ITUNES"): the Apple logo.
  if (/^apple\b|apple\.com|itunes/i.test(name)) return ICONS["Apple One"];
  if (/^google\b/i.test(name)) return ICONS["Google Play"];
  const bank = BANKS.find(([re]) => re.test(name));
  return bank ? { domain: bank[1] } : undefined;
}

/** The only domains /api/logo fetches: known services and banks, never a user's free text. */
export const LOGO_DOMAINS = new Set([...Object.values(ICONS).map((b) => b.domain), ...BANKS.map(([, d]) => d)].filter((d): d is string => !!d));
