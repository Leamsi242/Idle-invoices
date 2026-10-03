import { NextResponse } from "next/server";
import { checkCampaign, createCampaign, setCampaignStatus, type CampaignInput } from "@/lib/ads";
import { adsAdmin } from "@/lib/ads-admin";

/** The ad console: create a campaign, pause or restart one. Owner only. */
export async function POST(req: Request) {
  if (!(await adsAdmin())) return NextResponse.json({ error: "owner only" }, { status: 403 });
  const i = (await req.json().catch(() => null)) as CampaignInput | null;
  if (!i) return NextResponse.json({ errors: ["requête vide"] }, { status: 400 });
  const input = { ...i, rate: Number(i.rate), budget: Number(i.budget) };
  const errors = checkCampaign(input);
  if (errors.length) return NextResponse.json({ errors }, { status: 400 });
  const c = await createCampaign(input);
  return NextResponse.json({ id: c.id, postbackSecret: c.postbackSecret });
}

export async function PATCH(req: Request) {
  if (!(await adsAdmin())) return NextResponse.json({ error: "owner only" }, { status: 403 });
  const b = (await req.json().catch(() => null)) as { id?: string; status?: string } | null;
  if (!b?.id || (b.status !== "active" && b.status !== "paused")) return NextResponse.json({ error: "id et statut" }, { status: 400 });
  await setCampaignStatus(b.id, b.status);
  return NextResponse.json({ ok: true });
}
