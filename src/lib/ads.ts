import { randomBytes, timingSafeEqual } from "node:crypto";
import { prisma } from "./db";

/**
 * The app's own ad space, sold directly to advertisers: Stories (full screen, vertical, tap to go
 * on), Shorts (a vertical video in the page) and cards. Targeting is contextual: the app picks a
 * campaign from the categories of the subscriptions it found, on the server, and nothing about the
 * user is stored with the ad or sent to the advertiser. Measurement is a counter per campaign and
 * per day; a click gets a random id that only links it to its campaign, so the advertiser can
 * report a conversion. Premium members see no Stories and no Shorts.
 */
export type AdFormat = "story" | "short" | "card";
export type Pricing = "cpm" | "cpc" | "cpa";

/** What the page needs to show an ad: never the advertiser's secret, never the budget. */
export interface Ad {
  id: string;
  advertiser: string;
  format: AdFormat;
  title: string;
  body: string;
  cta: string;
  mediaUrl?: string;
  mediaKind?: "video" | "image";
  posterUrl?: string;
  demo?: boolean;
}

export const FORMATS: AdFormat[] = ["story", "short", "card"];
export const PRICINGS: Pricing[] = ["cpm", "cpc", "cpa"];
const MAX = { story: 5, short: 1, card: 1 } as const;
const DEMO_PREFIX = "demo-";

/** Made-up campaigns for the demo: fictional brands, marked as such, never counted. */
export const DEMO_ADS: (Ad & { categories: string[] })[] = [
  { id: "demo-forfait", advertiser: "Forfait Malin (démo)", format: "story", categories: ["telecom"], title: "Votre forfait à 9,99 €", body: "100 Go, sans engagement, prix fixe 12 mois.", cta: "Voir l'offre", mediaUrl: "/ads/demo/forfait.webm", mediaKind: "video", posterUrl: "/ads/demo/forfait.jpg", demo: true },
  { id: "demo-energie", advertiser: "Énergie Claire (démo)", format: "story", categories: ["energy"], title: "L'électricité moins chère, sans surprise", body: "Prix bloqué 2 ans. Changement en 5 minutes.", cta: "Comparer", mediaUrl: "/ads/demo/energie.webm", mediaKind: "video", posterUrl: "/ads/demo/energie.jpg", demo: true },
  { id: "demo-stream", advertiser: "Streamo (démo)", format: "story", categories: [], title: "Un seul abonnement, trois plateformes", body: "Regroupez vos séries et économisez jusqu'à 12 € par mois.", cta: "Découvrir", mediaUrl: "/ads/demo/stream.webm", mediaKind: "video", posterUrl: "/ads/demo/stream.jpg", demo: true },
  { id: "demo-short", advertiser: "Streamo (démo)", format: "short", categories: [], title: "3 plateformes, 1 prix", body: "Le bundle qui remplace vos abonnements en double.", cta: "Découvrir", mediaUrl: "/ads/demo/stream.webm", mediaKind: "video", posterUrl: "/ads/demo/stream.jpg", demo: true },
];

const today = () => new Date().toISOString().slice(0, 10);
const csv = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);

const toAd = (c: { id: string; advertiser: string; format: string; title: string; body: string; cta: string; mediaUrl: string | null; mediaKind: string | null; posterUrl: string | null }): Ad => ({
  id: c.id, advertiser: c.advertiser, format: c.format as AdFormat, title: c.title, body: c.body, cta: c.cta,
  mediaUrl: c.mediaUrl ?? undefined, mediaKind: (c.mediaKind as Ad["mediaKind"]) ?? undefined, posterUrl: c.posterUrl ?? undefined,
});

/**
 * Relevance only: a campaign for one of the user's categories comes first, a campaign for
 * everyone after; a campaign aimed at other categories is not shown.
 */
function relevance(targets: string[], categories: Set<string>): number {
  if (targets.length === 0) return 1;
  return targets.some((t) => categories.has(t)) ? 2 : 0;
}

export async function serveAds(o: { format: AdFormat; categories: string[]; demo: boolean; premium: boolean; day?: string }): Promise<Ad[]> {
  if (o.premium && o.format !== "card") return [];
  const cats = new Set(o.categories);
  if (o.demo) {
    return DEMO_ADS.filter((a) => a.format === o.format && relevance(a.categories, cats) > 0)
      .sort((a, b) => relevance(b.categories, cats) - relevance(a.categories, cats))
      .slice(0, MAX[o.format])
      .map(({ categories: _c, ...ad }) => ad); // eslint-disable-line @typescript-eslint/no-unused-vars
  }
  const day = new Date(o.day ?? today());
  const live = await prisma.adCampaign.findMany({ where: { format: o.format, status: "active", startsOn: { lte: day }, endsOn: { gte: day } } });
  if (live.length === 0) return [];
  const spent = await prisma.adStat.groupBy({ by: ["campaignId"], where: { campaignId: { in: live.map((c) => c.id) } }, _sum: { revenue: true } });
  const spentBy = new Map(spent.map((s) => [s.campaignId, s._sum.revenue ?? 0]));
  return live
    .filter((c) => (spentBy.get(c.id) ?? 0) < c.budget && relevance(csv(c.categories), cats) > 0)
    .sort((a, b) => relevance(csv(b.categories), cats) - relevance(csv(a.categories), cats) || a.createdAt.getTime() - b.createdAt.getTime())
    .slice(0, MAX[o.format])
    .map(toAd);
}

async function bump(campaignId: string, data: { impressions?: number; views?: number; clicks?: number; conversions?: number; revenue?: number }, day = today()) {
  const inc = Object.fromEntries(Object.entries(data).map(([k, v]) => [k, { increment: v }]));
  await prisma.adStat.upsert({ where: { campaignId_day: { campaignId, day } }, create: { campaignId, day, ...data }, update: inc });
}

/** An impression (seen on screen for a second) or a view (watched to the end). */
export async function recordEvent(campaignId: string, kind: "impression" | "view"): Promise<boolean> {
  if (campaignId.startsWith(DEMO_PREFIX)) return false;
  const c = await prisma.adCampaign.findUnique({ where: { id: campaignId } });
  if (!c) return false;
  if (kind === "view") await bump(c.id, { views: 1 });
  else await bump(c.id, { impressions: 1, revenue: c.pricing === "cpm" ? c.rate / 1000 : 0 });
  return true;
}

/** A click: the landing page receives a random sd_click id, the only link back to this click. */
export async function recordClick(campaignId: string): Promise<string | null> {
  if (campaignId.startsWith(DEMO_PREFIX)) return "/advertise?from=demo";
  const c = await prisma.adCampaign.findUnique({ where: { id: campaignId } });
  if (!c) return null;
  const id = randomBytes(16).toString("hex");
  await prisma.adClick.create({ data: { id, campaignId: c.id } });
  await bump(c.id, { clicks: 1, revenue: c.pricing === "cpc" ? c.rate : 0 });
  const url = new URL(c.url);
  url.searchParams.set("sd_click", id);
  return url.toString();
}

const sameSecret = (a: string, b: string) => {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

/** The advertiser reports a sale or a sign-up for a click, once, with its campaign's secret. */
export async function recordConversion(clickId: string, secret: string): Promise<"ok" | "already" | "refused"> {
  const click = /^[0-9a-f]{32}$/.test(clickId) ? await prisma.adClick.findUnique({ where: { id: clickId } }) : null;
  const c = click ? await prisma.adCampaign.findUnique({ where: { id: click.campaignId } }) : null;
  if (!click || !c || !sameSecret(secret, c.postbackSecret)) return "refused";
  const { count } = await prisma.adClick.updateMany({ where: { id: click.id, convertedAt: null }, data: { convertedAt: new Date() } });
  if (count === 0) return "already";
  await bump(c.id, { conversions: 1, revenue: c.pricing === "cpa" ? c.rate : 0 });
  return "ok";
}

export interface CampaignInput {
  advertiser: string; name: string; format: string; categories: string; title: string; body: string; cta: string; url: string;
  mediaUrl?: string; mediaKind?: string; posterUrl?: string; pricing: string; rate: number; budget: number; startsOn: string; endsOn: string;
}

const mediaOk = (u?: string) => !u || /^https:\/\//.test(u) || /^\/[\w./-]+$/.test(u);

/** Checks a new campaign; returns the problems, empty when it can be saved. */
export function checkCampaign(i: CampaignInput): string[] {
  const errors: string[] = [];
  for (const k of ["advertiser", "name", "title", "cta"] as const) if (!i[k]?.trim()) errors.push(`${k} manquant`);
  if (!FORMATS.includes(i.format as AdFormat)) errors.push("format inconnu");
  if (!PRICINGS.includes(i.pricing as Pricing)) errors.push("tarification inconnue");
  if (!/^https:\/\//.test(i.url ?? "")) errors.push("la page de destination doit être en https");
  if (!mediaOk(i.mediaUrl) || !mediaOk(i.posterUrl)) errors.push("média en https ou dans /public");
  if (i.mediaUrl && !["video", "image"].includes(i.mediaKind ?? "")) errors.push("type de média : video ou image");
  if (!(i.rate > 0)) errors.push("tarif positif");
  if (!(i.budget > 0)) errors.push("budget positif");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(i.startsOn) || !/^\d{4}-\d{2}-\d{2}$/.test(i.endsOn) || i.endsOn < i.startsOn) errors.push("dates invalides");
  if ((i.format === "story" || i.format === "short") && !i.mediaUrl) errors.push("une story ou un short a besoin d'une vidéo ou d'une image");
  return errors;
}

export async function createCampaign(i: CampaignInput) {
  return prisma.adCampaign.create({
    data: {
      advertiser: i.advertiser.trim(), name: i.name.trim(), format: i.format, categories: csv(i.categories ?? "").join(","),
      title: i.title.trim(), body: (i.body ?? "").trim(), cta: i.cta.trim(), url: i.url, mediaUrl: i.mediaUrl || null,
      mediaKind: i.mediaUrl ? i.mediaKind ?? null : null, posterUrl: i.posterUrl || null, pricing: i.pricing, rate: i.rate, budget: i.budget,
      startsOn: new Date(i.startsOn), endsOn: new Date(`${i.endsOn}T23:59:59Z`), postbackSecret: randomBytes(24).toString("base64url"),
    },
  });
}

export async function setCampaignStatus(id: string, status: "active" | "paused") {
  await prisma.adCampaign.update({ where: { id }, data: { status } });
}

/** One line per campaign for the console: totals, rates, what is left of the budget. */
export async function campaignReport() {
  const [campaigns, stats] = await Promise.all([
    prisma.adCampaign.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.adStat.groupBy({ by: ["campaignId"], _sum: { impressions: true, views: true, clicks: true, conversions: true, revenue: true } }),
  ]);
  const by = new Map(stats.map((s) => [s.campaignId, s._sum]));
  return campaigns.map((c) => {
    const s = by.get(c.id);
    const impressions = s?.impressions ?? 0, clicks = s?.clicks ?? 0, revenue = s?.revenue ?? 0;
    return {
      ...c,
      impressions, views: s?.views ?? 0, clicks, conversions: s?.conversions ?? 0, revenue,
      ctr: impressions ? clicks / impressions : 0,
      left: Math.max(0, c.budget - revenue),
    };
  });
}
