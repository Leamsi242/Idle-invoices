// Builds src/data/brand-icons.json: the logo (Simple Icons, CC0) of each known service, so the
// app shows real brand icons without calling any third party. Run: node scripts/gen-brand-icons.mjs
// Services Simple Icons does not carry (some brands asked to be removed) get their favicon through
// /api/logo instead, from the domain of their account page.
import { readFileSync, writeFileSync } from "node:fs";
import * as si from "simple-icons";

const SLUGS = {
  Netflix: "netflix", Spotify: "spotify", "Apple One": "apple", "iCloud+": "icloud", "Apple Music": "applemusic", "Apple TV+": "appletv",
  "Apple Arcade": "applearcade", "YouTube Premium": "youtube", "Google One": "google", Deezer: "deezer", Max: "hbomax", "Paramount+": "paramountplus",
  DAZN: "dazn", Crunchyroll: "crunchyroll", Audible: "audible", "PlayStation Plus": "playstation", "PlayStation (Sony)": "playstation",
  Dropbox: "dropbox", Notion: "notion", Claude: "claude", Duolingo: "duolingo", Headspace: "headspace", Strava: "strava", "Uber One": "uber",
  "Uber Eats": "ubereats", "Uber rides": "uber", "Deliveroo Plus": "deliveroo", Orange: "orange", "The New York Times": "newyorktimes",
  Medium: "medium", Tinder: "tinder", NordVPN: "nordvpn", "1Password": "1password", Grammarly: "grammarly", Setapp: "setapp", Twitch: "twitch",
  Patreon: "patreon", GitHub: "github", Zoom: "zoom", WeTransfer: "wetransfer", Norton: "norton", McAfee: "mcafee", "Perplexity Pro": "perplexity",
  "Coursera Plus": "coursera", Evernote: "evernote", "Huawei Cloud": "huawei",
  // Ways of paying and stores.
  Gmail: "gmail", PayPal: "paypal", "American Express": "americanexpress", "American Express card fee": "americanexpress", "Google Play": "googleplay", "App Store": "appstore",
};

const bySlug = new Map(Object.values(si).filter((x) => x && x.slug).map((x) => [x.slug, x]));
const descriptors = JSON.parse(readFileSync("src/data/descriptors.json", "utf8"));
// Registrable domain of the account page: "particuliers.engie.fr" gives "engie.fr".
const domainOf = (url) => {
  try {
    const host = new URL(url).hostname.split(".");
    return host.slice(-2).join(".");
  } catch {
    return undefined;
  }
};
const GENERIC = new Set(["service-public.fr"]);

const out = {};
for (const d of descriptors) {
  if (out[d.serviceName]) continue;
  const icon = bySlug.get(SLUGS[d.serviceName]);
  const domain = domainOf(d.cancellationUrl);
  out[d.serviceName] = {
    ...(icon ? { hex: icon.hex, path: icon.path } : {}),
    ...(domain && !GENERIC.has(domain) ? { domain } : {}),
    ...(d.category ? { category: d.category } : {}),
  };
}
for (const name of ["Gmail", "PayPal", "American Express", "Google Play", "App Store"]) {
  const icon = bySlug.get(SLUGS[name]);
  if (icon) out[name] = { ...out[name], hex: icon.hex, path: icon.path };
}
const missing = Object.entries(SLUGS).filter(([, slug]) => !bySlug.has(slug));
if (missing.length) console.warn("Unknown Simple Icons slugs:", missing);
writeFileSync("src/data/brand-icons.json", JSON.stringify(out) + "\n");
const withIcon = Object.values(out).filter((v) => v.path).length;
console.log(`${Object.keys(out).length} services, ${withIcon} with a bundled logo, ${Object.values(out).filter((v) => !v.path && v.domain).length} through their favicon.`);
