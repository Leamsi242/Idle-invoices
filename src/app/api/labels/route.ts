import { NextResponse } from "next/server";
import { getSessionId } from "@/lib/session";
import { saveLabel } from "@/lib/store";

export async function POST(req: Request) {
  const sessionId = await getSessionId();
  if (!sessionId) return NextResponse.json({ error: "No data yet." }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const labelKey = typeof body.labelKey === "string" ? body.labelKey.slice(0, 200) : "";
  const serviceName = typeof body.serviceName === "string" ? body.serviceName.trim().slice(0, 100) : "";
  const url = typeof body.cancellationUrl === "string" && /^https:\/\//.test(body.cancellationUrl) ? body.cancellationUrl.slice(0, 500) : undefined;
  if (!labelKey || !serviceName) return NextResponse.json({ error: "labelKey and serviceName are required" }, { status: 400 });
  await saveLabel(sessionId, labelKey, serviceName, url);
  return NextResponse.json({ ok: true });
}
