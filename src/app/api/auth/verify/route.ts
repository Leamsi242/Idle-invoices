import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { previewLogin, verifyLogin } from "@/lib/accounts";
import { getSessionId, setSessionId } from "@/lib/session";
import { DEMO_COOKIE, REAL_COOKIE } from "@/lib/demo-mode";

/**
 * Signs in with the link's token. The confirmation page first asks what would happen
 * ({check: true}), then signs in on a click: mail scanners that open links do not press buttons,
 * so they cannot use the link up.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { token?: unknown; check?: unknown } | null;
  const token = typeof body?.token === "string" ? body.token : "";
  const jar = await cookies();
  // In the demo, the browser's own session is the one waiting behind it.
  const demo = jar.get(DEMO_COOKIE)?.value === "1";
  const real = jar.get(REAL_COOKIE)?.value;
  const current = demo ? (real && /^[0-9a-f-]{36}$/.test(real) ? real : null) : await getSessionId();
  if (body?.check === true) {
    const outcome = await previewLogin(token, current);
    return outcome ? NextResponse.json({ ok: true, outcome }) : NextResponse.json({ error: "expired" }, { status: 410 });
  }
  const result = await verifyLogin(token, current);
  if (!result) return NextResponse.json({ error: "expired" }, { status: 410 });
  await setSessionId(result.sessionId);
  const res = NextResponse.json({ ok: true, outcome: result.outcome });
  if (demo) {
    res.cookies.delete(DEMO_COOKIE);
    res.cookies.delete(REAL_COOKIE);
  }
  return res;
}
