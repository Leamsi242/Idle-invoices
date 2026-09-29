import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { encrypt, decrypt } from "@/lib/crypto";
import { activeProvider } from "@/lib/banking";
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
  const started = Date.now();
  const database = await check(() => prisma.profile.count());
  const databaseMs = Date.now() - started;
  // Where the database and this function run: far apart, every page waits on each query.
  const databaseRegion = (process.env.DATABASE_URL ?? "").match(/\.((?:aws|gcp|fly)-[a-z0-9-]+)\.turso\.io/)?.[1] ?? (process.env.DATABASE_URL?.startsWith("file:") ? "local file" : "unknown");
  const encryption = await check(() => {
    if (decrypt(encrypt("check")) !== "check") throw new Error();
  });
  const body = {
    database,
    databaseMs,
    databaseRegion,
    functionRegion: process.env.VERCEL_REGION ?? "local",
    encryption,
    bank: activeProvider() ?? (demoEnabled() ? "demo only" : "not configured"),
    gmail: gmailConfigured(),
    outlook: outlookConfigured(),
    screenshots: !!process.env.ANTHROPIC_API_KEY,
    purgeCron: !!process.env.CRON_SECRET,
  };
  return NextResponse.json(body, { status: database && encryption ? 200 : 503 });
}
