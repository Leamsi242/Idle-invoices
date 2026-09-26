import { NextResponse } from "next/server";
import { getSessionId } from "@/lib/session";
import { setWatchEmail, stopWatch } from "@/lib/store";

/** Stops watching an account: the access is closed at the bank. */
export async function DELETE(req: Request) {
  const sessionId = await getSessionId();
  const id = new URL(req.url).searchParams.get("id");
  if (!sessionId || !id) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await stopWatch(sessionId, id);
  return NextResponse.json({ ok: true });
}

/** Sets or clears the email that receives alerts: { id, email }. */
export async function PATCH(req: Request) {
  const sessionId = await getSessionId();
  const body = await req.json().catch(() => ({}));
  const id = typeof body.id === "string" ? body.id : "";
  const email = typeof body.email === "string" ? body.email.trim().slice(0, 200) : "";
  if (!sessionId || !id) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  try {
    await setWatchEmail(sessionId, id, email || null);
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
