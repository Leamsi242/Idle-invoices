import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { encrypt, decrypt } from "@/lib/crypto";
import { enableBankingConfigured } from "@/lib/banking/enable-banking";
import { demoEnabled } from "@/lib/banking/demo";
import { gmailConfigured } from "@/lib/gmail";
import { outlookConfigured } from "@/lib/outlook";

export const dynamic = "force-dynamic";

/** What is set up on this server, to check a deployment. Never returns a value or a secret. */
export async function GET() {
  const check = async (f: () => Promise<unknown> | unknown) => {
    try {
      await f();
      return true;
    } catch {
      return false;
    }
  };
  const database = await check(() => prisma.profile.count());
  const encryption = await check(() => {
    if (decrypt(encrypt("check")) !== "check") throw new Error();
  });
  const body = {
    database,
    encryption,
    bank: enableBankingConfigured() ? "enable-banking" : demoEnabled() ? "demo only" : "not configured",
    gmail: gmailConfigured(),
    outlook: outlookConfigured(),
    screenshots: !!process.env.ANTHROPIC_API_KEY,
    purgeCron: !!process.env.CRON_SECRET,
  };
  return NextResponse.json(body, { status: database && encryption ? 200 : 503 });
}
