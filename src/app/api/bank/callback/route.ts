import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { timingSafeEqual } from "node:crypto";
import { finishConnection, psuHeaders } from "@/lib/banking";
import { BANK_COOKIE, decodePending } from "@/lib/banking/cookie";
import { getSessionId } from "@/lib/session";
import { recompute, saveUpload } from "@/lib/store";

export const runtime = "nodejs";
export const maxDuration = 60;

const same = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

/** The bank sends the user back here: read the transactions once, close the access, analyse. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const back = (query: string) => {
    const res = NextResponse.redirect(`${url.origin}/?${query}`);
    res.cookies.delete({ name: BANK_COOKIE, path: "/api/bank" });
    return res;
  };
  const pending = decodePending((await cookies()).get(BANK_COOKIE)?.value);
  const code = url.searchParams.get("code");
  const sessionId = await getSessionId();
  if (!pending || !sessionId || !same(pending.state, url.searchParams.get("state") ?? "")) return back("bank=expired");
  if (!code || url.searchParams.get("error")) return back("bank=denied");
  try {
    const psu = psuHeaders(req);
    const today = new Date().toISOString().slice(0, 10);
    const { accounts, transactions } = await finishConnection(pending.institution, code, today, psu);
    await saveUpload(sessionId, `Bank connection: ${pending.institution.name} (${accounts} account${accounts === 1 ? "" : "s"})`, "bank", transactions);
    await recompute(sessionId);
    return back(`bank=ok&count=${transactions.length}`);
  } catch (e) {
    // The provider's error code (e.g. PSU_HEADER_NOT_PROVIDED) helps when testing a new bank; no account data is in it.
    const message = e instanceof Error ? e.message : "";
    console.error("Bank connection failed:", message.replace(/[0-9a-f-]{36}/gi, "<id>"));
    const code = message.match(/"(?:error|code)"\s*:\s*"([A-Z_]{3,60})"/)?.[1];
    return back(`bank=error${code ? `&reason=${code}` : ""}`);
  }
}
