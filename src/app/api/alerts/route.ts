import { NextResponse } from "next/server";
import { getSessionId } from "@/lib/session";
import { dismissAlerts } from "@/lib/store";

/** "Got it": the alerts shown on the report are marked as seen. */
export async function POST() {
  const sessionId = await getSessionId();
  if (sessionId) await dismissAlerts(sessionId);
  return NextResponse.json({ ok: true });
}
