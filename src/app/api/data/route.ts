import { NextResponse } from "next/server";
import { clearSession, getSessionId } from "@/lib/session";
import { deleteEverything } from "@/lib/store";
import { clearProgress, revokeScanInProgress } from "@/lib/gmail-scan-cookie";

/** "Delete everything": erases all of this browser's data in one call. */
export async function DELETE() {
  const sessionId = await getSessionId();
  // A Gmail scan still in progress loses its access first, so no later part can save anything.
  await revokeScanInProgress();
  if (sessionId) await deleteEverything(sessionId);
  await clearSession();
  const res = NextResponse.json({ ok: true });
  clearProgress(res);
  return res;
}
