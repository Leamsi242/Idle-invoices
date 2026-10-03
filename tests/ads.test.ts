import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { campaignReport, checkCampaign, createCampaign, recordClick, recordConversion, recordEvent, serveAds, type CampaignInput } from "@/lib/ads";

const base: CampaignInput = {
  advertiser: "Annonceur test", name: "Test", format: "story", categories: "", title: "Titre", body: "", cta: "Voir",
  url: "https://annonceur.example/offre", mediaUrl: "/ads/demo/forfait.webm", mediaKind: "video", pricing: "cpm", rate: 20, budget: 100,
  startsOn: "2026-01-01", endsOn: "2026-12-31",
};
const day = "2026-10-03";

describe("own ad space", () => {
  beforeEach(async () => {
    await prisma.adClick.deleteMany();
    await prisma.adStat.deleteMany();
    await prisma.adCampaign.deleteMany();
  });

  it("checks a campaign before saving it", () => {
    expect(checkCampaign(base)).toEqual([]);
    expect(checkCampaign({ ...base, url: "http://x.example", rate: 0, endsOn: "2025-01-01", mediaUrl: "" })).toEqual([
      "la page de destination doit être en https", "tarif positif", "dates invalides", "une story ou un short a besoin d'une vidéo ou d'une image",
    ]);
  });

  it("serves by relevance: the user's categories first, campaigns for everyone next, others never", async () => {
    await createCampaign({ ...base, name: "all" });
    await createCampaign({ ...base, name: "telecom", categories: "telecom" });
    await createCampaign({ ...base, name: "gaming", categories: "gaming" });
    const ads = await serveAds({ format: "story", categories: ["telecom", "streaming"], demo: false, premium: false, day });
    const names = await Promise.all(ads.map(async (a) => (await prisma.adCampaign.findUnique({ where: { id: a.id } }))!.name));
    expect(names).toEqual(["telecom", "all"]);
    expect(JSON.stringify(ads)).not.toContain("postbackSecret");
  });

  it("shows no Stories or Shorts to Premium members, and stops a campaign once its budget is spent", async () => {
    const c = await createCampaign({ ...base, budget: 0.04 });
    expect(await serveAds({ format: "story", categories: [], demo: false, premium: true, day })).toEqual([]);
    expect(await serveAds({ format: "story", categories: [], demo: false, premium: false, day })).toHaveLength(1);
    await recordEvent(c.id, "impression");
    await recordEvent(c.id, "impression");
    expect(await serveAds({ format: "story", categories: [], demo: false, premium: false, day })).toHaveLength(0);
  });

  it("counts CPM, CPC and CPA revenue; a conversion counts once and needs the campaign's key", async () => {
    const cpm = await createCampaign({ ...base, rate: 20 });
    const cpa = await createCampaign({ ...base, pricing: "cpa", rate: 15 });
    await recordEvent(cpm.id, "impression");
    await recordEvent(cpm.id, "view");
    const target = (await recordClick(cpa.id))!;
    const click = new URL(target).searchParams.get("sd_click")!;
    expect(target.startsWith("https://annonceur.example/offre?sd_click=")).toBe(true);
    expect(await recordConversion(click, "wrong-key")).toBe("refused");
    expect(await recordConversion(click, cpa.postbackSecret)).toBe("ok");
    expect(await recordConversion(click, cpa.postbackSecret)).toBe("already");
    const rows = Object.fromEntries((await campaignReport()).map((r) => [r.id, r]));
    expect([rows[cpm.id].impressions, rows[cpm.id].views, rows[cpm.id].revenue]).toEqual([1, 1, 0.02]);
    expect([rows[cpa.id].clicks, rows[cpa.id].conversions, rows[cpa.id].revenue]).toEqual([1, 1, 15]);
  });

  it("keeps clicks anonymous and never counts demo ads", async () => {
    const c = await createCampaign(base);
    await recordClick(c.id);
    expect(Object.keys((await prisma.adClick.findFirst())!).sort()).toEqual(["campaignId", "convertedAt", "createdAt", "id"]);
    expect(await recordEvent("demo-forfait", "impression")).toBe(false);
    expect(await recordClick("demo-forfait")).toBe("/advertise?from=demo");
    const demo = await serveAds({ format: "story", categories: ["telecom"], demo: true, premium: false, day });
    expect(demo[0].id).toBe("demo-forfait");
    expect(demo.every((a) => a.demo && /démo/.test(a.advertiser))).toBe(true);
  });
});
