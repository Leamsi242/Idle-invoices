import { NextResponse } from "next/server";
import { purgeExpired } from "@/lib/store";
import { cronAuthorized } from "@/lib/cron-auth";

/** Daily retention purge (scheduled in vercel.json). */
export async function GET(req: Request) {
  if (!cronAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const sessions = await purgeExpired();
  return NextResponse.json({ ok: true, sessionsDeleted: sessions });
}
