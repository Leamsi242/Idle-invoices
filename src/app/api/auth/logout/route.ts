import { NextResponse } from "next/server";
import { clearSession } from "@/lib/session";
import { DEMO_COOKIE, REAL_COOKIE } from "@/lib/demo-mode";

/** Signs out: this browser forgets the session; the data stays with the account. */
export async function POST() {
  await clearSession();
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(DEMO_COOKIE);
  res.cookies.delete(REAL_COOKIE);
  return res;
}
