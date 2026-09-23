import { NextResponse } from "next/server";
import { clearSession, getSessionId } from "@/lib/session";
import { deleteEverything } from "@/lib/store";

/** "Delete everything": erases all of this browser's data in one call. */
export async function DELETE() {
  const sessionId = await getSessionId();
  if (sessionId) await deleteEverything(sessionId);
  await clearSession();
  return NextResponse.json({ ok: true });
}
