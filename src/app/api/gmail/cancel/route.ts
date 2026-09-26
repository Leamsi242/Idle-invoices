import { NextResponse } from "next/server";
import { clearProgress, revokeScanInProgress } from "@/lib/gmail-scan-cookie";

/** The user left the page during a long Gmail scan: the access is revoked now, what was read stays. */
export async function POST() {
  await revokeScanInProgress();
  const res = new NextResponse(null, { status: 204 });
  clearProgress(res);
  return res;
}
