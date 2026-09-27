import { NextResponse } from "next/server";
import { clearSession, getSessionId } from "@/lib/session";
import { deleteEverything } from "@/lib/store";
import { clearProgress, revokeScanInProgress } from "@/lib/gmail-scan-cookie";
import { cookies } from "next/headers";
import { DEMO_COOKIE, REAL_COOKIE } from "@/lib/demo-mode";

/** "Delete everything": erases all of this browser's data in one call. */
export async function DELETE() {
  const sessionId = await getSessionId();
  // A Gmail scan still in progress loses its access first, so no later part can save anything.
  await revokeScanInProgress();
  if (sessionId) await deleteEverything(sessionId);
  // In the demo, "everything" also means the user's own session waiting behind it.
  const jar = await cookies();
  const real = jar.get(REAL_COOKIE)?.value;
  if (real && /^[0-9a-f-]{36}$/.test(real) && real !== sessionId) await deleteEverything(real);
  await clearSession();
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(REAL_COOKIE);
  res.cookies.delete(DEMO_COOKIE);
  clearProgress(res);
  return res;
}
