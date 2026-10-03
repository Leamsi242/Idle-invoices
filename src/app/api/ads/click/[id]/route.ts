import { NextResponse } from "next/server";
import { recordClick } from "@/lib/ads";
import { rateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/db";

/** Counts the click, then sends the viewer to the advertiser's page with a random sd_click id. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "local";
  // Repeated clicks from one address are not counted (nor paid by the advertiser): they still go through.
  if (!rateLimit(`ad-click:${ip}:${id}`, 3, 10 * 60_000).ok) {
    const c = await prisma.adCampaign.findUnique({ where: { id }, select: { url: true } });
    return NextResponse.redirect(c?.url ?? new URL("/", req.url));
  }
  const target = await recordClick(id);
  return NextResponse.redirect(target ? new URL(target, req.url) : new URL("/", req.url));
}
