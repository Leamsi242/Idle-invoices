import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { purgeExpired } from "@/lib/store";

/**
 * Daily retention purge (vercel.json schedules it). Vercel sends "Authorization: Bearer
 * <CRON_SECRET>"; without the secret configured, the route does nothing.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const given = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  if (!secret || given.length !== expected.length || !timingSafeEqual(Buffer.from(given), Buffer.from(expected))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const sessions = await purgeExpired();
  return NextResponse.json({ ok: true, sessionsDeleted: sessions });
}
