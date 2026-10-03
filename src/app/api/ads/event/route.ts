import { NextResponse } from "next/server";
import { recordEvent } from "@/lib/ads";
import { rateLimit } from "@/lib/rate-limit";

/** An impression or a full view, counted per campaign and per day; nothing about the viewer is kept. */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { id?: unknown; kind?: unknown } | null;
  const id = typeof body?.id === "string" ? body.id.slice(0, 64) : "";
  const kind = body?.kind === "view" ? "view" : "impression";
  // The address only feeds the in-memory limiter: it is not stored.
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "local";
  if (!id || !rateLimit(`ad-event:${ip}`, 60, 60_000).ok) return NextResponse.json({ ok: false });
  return NextResponse.json({ ok: await recordEvent(id, kind) });
}
