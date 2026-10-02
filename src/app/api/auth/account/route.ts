import { NextResponse } from "next/server";
import { deleteAccount } from "@/lib/accounts";
import { clearSession, getSessionId } from "@/lib/session";
import { revokeScanInProgress } from "@/lib/gmail-scan-cookie";

/** Deletes the account, its e-mail, its pending links and all its data. */
export async function DELETE() {
  const sessionId = await getSessionId();
  await revokeScanInProgress();
  if (sessionId) await deleteAccount(sessionId);
  await clearSession();
  return NextResponse.json({ ok: true });
}
