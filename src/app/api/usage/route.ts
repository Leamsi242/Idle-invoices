import { NextResponse } from "next/server";
import { getSessionId } from "@/lib/session";
import { setUsage } from "@/lib/store";

/** Answer to "Still using this?". Keyed by the subscription's label key, which survives recomputes. */
export async function POST(req: Request) {
  const sessionId = await getSessionId();
  if (!sessionId) return NextResponse.json({ error: "No data yet." }, { status: 401 });
  const { labelKey, usage, frequency } = await req.json().catch(() => ({}));
  if (frequency !== undefined && !["weekly", "monthly", "quarterly", "yearly"].includes(frequency)) {
    return NextResponse.json({ error: "frequency must be weekly, monthly, quarterly or yearly" }, { status: 400 });
  }
  if (typeof labelKey !== "string" || labelKey.length > 200 || !["yes", "rarely", "no", "stopped", "notsub", "clear"].includes(usage)) {
    return NextResponse.json({ error: "labelKey and usage (yes, rarely, no, stopped, notsub or clear) are required" }, { status: 400 });
  }
  try {
    await setUsage(sessionId, labelKey, usage === "clear" ? null : usage, frequency);
  } catch {
    return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
