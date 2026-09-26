import { NextResponse } from "next/server";
import { createHash, randomBytes } from "node:crypto";
import { outlookAuthUrl, outlookConfigured } from "@/lib/outlook";
import { getOrCreateSessionId } from "@/lib/session";

const OUTLOOK_COOKIE = "sd_outlook_oauth";

export async function GET(req: Request) {
  if (!outlookConfigured()) return NextResponse.json({ error: "Outlook scanning is not configured." }, { status: 404 });
  await getOrCreateSessionId();
  const origin = new URL(req.url).origin;
  const state = randomBytes(16).toString("base64url");
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  const res = NextResponse.redirect(outlookAuthUrl({ clientId: process.env.MICROSOFT_CLIENT_ID!, redirectUri: `${origin}/api/outlook/callback`, state, codeChallenge: challenge }));
  res.cookies.set(OUTLOOK_COOKIE, `${state}.${verifier}`, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/api/outlook", maxAge: 600 });
  return res;
}
