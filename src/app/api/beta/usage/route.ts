import { NextResponse } from "next/server";
import { cronAuthorized } from "@/lib/cron-auth";
import { betaUsage } from "@/lib/beta";

/** For the owner only (same secret as the cron jobs): how much of the beta's limits is used. */
export async function GET(req: Request) {
  if (!cronAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await betaUsage(), { headers: { "Cache-Control": "no-store" } });
}
