import { NextResponse } from "next/server";
import { deleteAccount } from "@/lib/accounts";
import { clearSession, getSessionId } from "@/lib/session";
import { revokeScanInProgress } from "@/lib/gmail-scan-cookie";

/** Deletes the account, its e-mail, its pending links and all its data. */
export async function DELETE() {
  const sessionId = await getSessionId();
  await revokeScanInProgress();
  try {
    if (sessionId) await deleteAccount(sessionId);
  } catch (e) {
    // A Premium subscription could not be stopped at Stripe: nothing was deleted, so the user can retry.
    console.error("Delete refused, subscription still running:", e);
    return NextResponse.json({ error: "billing" }, { status: 502 });
  }
  await clearSession();
  return NextResponse.json({ ok: true });
}
