import { NextResponse } from "next/server";
import { clearSession, getSessionId } from "@/lib/session";
import { deleteAccount } from "@/lib/accounts";
import { clearProgress, revokeScanInProgress } from "@/lib/gmail-scan-cookie";
import { cookies } from "next/headers";
import { DEMO_COOKIE, REAL_COOKIE } from "@/lib/demo-mode";

/** "Delete everything": erases all of this browser's data in one call, and its account if it has one. */
export async function DELETE() {
  const sessionId = await getSessionId();
  // A Gmail scan still in progress loses its access first, so no later part can save anything.
  await revokeScanInProgress();
  // In the demo, "everything" also means the user's own session waiting behind it.
  const jar = await cookies();
  const real = jar.get(REAL_COOKIE)?.value;
  try {
    if (sessionId) await deleteAccount(sessionId);
    if (real && /^[0-9a-f-]{36}$/.test(real) && real !== sessionId) await deleteAccount(real);
  } catch (e) {
    // A Premium subscription could not be stopped at Stripe: nothing was deleted, so the user can retry.
    console.error("Delete refused, subscription still running:", e);
    return NextResponse.json({ error: "billing" }, { status: 502 });
  }
  await clearSession();
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(REAL_COOKIE);
  res.cookies.delete(DEMO_COOKIE);
  clearProgress(res);
  return res;
}
