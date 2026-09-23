import { NextResponse } from "next/server";
import { getOrCreateSessionId, getSessionId } from "@/lib/session";
import { addTrackedTrial, removeTrackedTrial } from "@/lib/store";
import { parseDate } from "@/lib/dates";

const FREQUENCIES = ["weekly", "monthly", "quarterly", "yearly"];

/** "I just started a free trial": remember it so we can remind the user before it charges. */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const serviceName = typeof body.serviceName === "string" ? body.serviceName.trim() : "";
  const endsOn = typeof body.endsOn === "string" ? parseDate(body.endsOn) : null;
  const priceAfter = typeof body.priceAfter === "number" && body.priceAfter >= 0 && body.priceAfter < 10_000 ? body.priceAfter : undefined;
  const frequency = FREQUENCIES.includes(body.frequency) ? body.frequency : undefined;
  const currency = typeof body.currency === "string" && /^[A-Z]{3}$/.test(body.currency) ? body.currency : "EUR";
  if (!serviceName || !endsOn) return NextResponse.json({ error: "serviceName and endsOn (YYYY-MM-DD) are required" }, { status: 400 });
  const sessionId = await getOrCreateSessionId();
  const trial = await addTrackedTrial(sessionId, { serviceName, endsOn, priceAfter, currency, frequency });
  return NextResponse.json({ id: trial.id });
}

export async function DELETE(req: Request) {
  const sessionId = await getSessionId();
  const id = new URL(req.url).searchParams.get("id");
  if (!sessionId || !id) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await removeTrackedTrial(sessionId, id);
  return NextResponse.json({ ok: true });
}
