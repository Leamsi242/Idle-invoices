import { NextResponse } from "next/server";
import { getSessionId } from "@/lib/session";
import { setUsage } from "@/lib/store";

/** Answer to "Still using this?". Keyed by the subscription's label key, which survives recomputes. */
export async function POST(req: Request) {
  const sessionId = await getSessionId();
  if (!sessionId) return NextResponse.json({ error: "No data yet." }, { status: 401 });
  const { labelKey, usage } = await req.json().catch(() => ({}));
  if (typeof labelKey !== "string" || !["yes", "rarely", "no"].includes(usage)) {
    return NextResponse.json({ error: "labelKey and usage (yes, rarely or no) are required" }, { status: 400 });
  }
  try {
    await setUsage(sessionId, labelKey, usage);
  } catch {
    return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
