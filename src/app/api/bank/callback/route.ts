import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { timingSafeEqual } from "node:crypto";
import { connectionFileName, finishConnection, isPaypal, providerOf, psuHeaders, WATCH_DAYS } from "@/lib/banking";
import { BANK_COOKIE, decodePending } from "@/lib/banking/cookie";
import { getSessionId } from "@/lib/session";
import { recompute, saveUpload, saveWatch } from "@/lib/store";
import { getLocale } from "@/lib/locale";
import { decrypt } from "@/lib/crypto";

export const runtime = "nodejs";
export const maxDuration = 60;

const same = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

/** The bank sends the user back here: read the transactions, close the access unless watched, analyse. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const back = (query: string) => {
    const res = NextResponse.redirect(`${url.origin}/?${query}`);
    res.cookies.delete({ name: BANK_COOKIE, path: "/api/bank" });
    return res;
  };
  const pending = decodePending((await cookies()).get(BANK_COOKIE)?.value);
  const q = url.searchParams;
  // Enable Banking sends code and state; Bridge item_id, success and context; Powens connection_id and state.
  const code = q.get("code") ?? q.get("item_id") ?? q.get("connection_id");
  const sessionId = await getSessionId();
  if (!pending || !sessionId || !same(pending.state, q.get("state") ?? q.get("context") ?? "")) return back("bank=expired");
  if (!code || q.get("error") || q.get("success") === "false") return back("bank=denied");
  try {
    const psu = psuHeaders(req);
    const today = new Date().toISOString().slice(0, 10);
    let ctx: string | undefined;
    try { ctx = pending.ctx ? decrypt(pending.ctx) : undefined; } catch { return back("bank=expired"); }
    const { accounts, transactions, access, stats } = await finishConnection(pending.institution, code, today, psu, pending.watch, pending.state, ctx);
    const paypal = isPaypal(pending.institution);
    const via = paypal ? "&via=paypal" : "";
    // PayPal's PSD2 lines are little documented: their field names (never values) help adjust the reading.
    if (paypal && transactions.length > 0) console.warn("PayPal read shape:", JSON.stringify({ accounts, ...stats }));
    if (transactions.length === 0) {
      // Keep nothing, so the bank is not shown as read. The line shapes help support a new bank.
      console.warn("Bank read returned nothing:", JSON.stringify({ bank: pending.institution.name, accounts, ...stats }));
      return back(`bank=empty&accounts=${accounts}&pending=${stats?.pending ?? 0}${via}`);
    }
    await saveUpload(sessionId, connectionFileName(pending.institution.name, accounts), paypal ? "paypal" : "bank", transactions);
    // The user asked to be watched: keep the access (encrypted) for the nightly reads.
    const days = pending.days ?? WATCH_DAYS;
    if (access) await saveWatch(sessionId, { provider: providerOf(pending.institution), institution: pending.institution.name, access, locale: await getLocale(), days });
    await recompute(sessionId);
    return back(`bank=ok&count=${transactions.length}${access ? `&watch=1&days=${days}` : ""}${via}`);
  } catch (e) {
    // The provider's error code (e.g. PSU_HEADER_NOT_PROVIDED) helps when testing a new bank; no account data is in it.
    const message = e instanceof Error ? e.message : "";
    console.error("Bank connection failed:", message.replace(/[0-9a-f-]{36}/gi, "<id>"));
    const code = message.match(/"(?:error|code)"\s*:\s*"([A-Z_]{3,60})"/)?.[1];
    return back(`bank=error${code ? `&reason=${code}` : ""}`);
  }
}
