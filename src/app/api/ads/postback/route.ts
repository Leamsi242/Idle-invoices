import { NextResponse } from "next/server";
import { recordConversion } from "@/lib/ads";

/**
 * The advertiser reports a conversion: /api/ads/postback?click=<sd_click>&key=<campaign secret>,
 * from its server. Counted once per click.
 */
async function handle(req: Request) {
  const url = new URL(req.url);
  const form = req.method === "POST" ? ((await req.json().catch(() => ({}))) as Record<string, unknown>) : {};
  const click = String(form.click ?? url.searchParams.get("click") ?? "");
  const key = String(form.key ?? url.searchParams.get("key") ?? "");
  const result = await recordConversion(click, key);
  return NextResponse.json({ result }, { status: result === "refused" ? 403 : 200 });
}
export const GET = handle;
export const POST = handle;
