import { NextResponse } from "next/server";
import { refreshAllWatches } from "@/lib/store";
import { cronAuthorized } from "@/lib/cron-auth";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Nightly read of the watched accounts (scheduled in vercel.json): alerts for what changed. */
export async function GET(req: Request) {
  if (!cronAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const appUrl = process.env.APP_URL ?? new URL(req.url).origin;
  return NextResponse.json({ ok: true, ...(await refreshAllWatches(new Date(), appUrl)) });
}
