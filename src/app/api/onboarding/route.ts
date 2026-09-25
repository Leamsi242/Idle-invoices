import { NextResponse } from "next/server";
import { getOrCreateSessionId } from "@/lib/session";
import { saveAnswers, setItemDone } from "@/lib/store";

/** Saves the onboarding answers (known ids only). */
export async function PUT(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid answers" }, { status: 400 });
  const sessionId = await getOrCreateSessionId();
  return NextResponse.json({ answers: await saveAnswers(sessionId, body) });
}

/** Ticks or unticks one checklist item: { itemId, done }. */
export async function PATCH(req: Request) {
  const body = await req.json().catch(() => ({}));
  const itemId = typeof body.itemId === "string" && /^[a-z:-]{1,40}$/.test(body.itemId) ? body.itemId : null;
  if (!itemId || typeof body.done !== "boolean") return NextResponse.json({ error: "itemId and done are required" }, { status: 400 });
  const sessionId = await getOrCreateSessionId();
  return NextResponse.json({ answers: await setItemDone(sessionId, itemId, body.done) });
}
