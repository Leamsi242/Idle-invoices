import { NextResponse } from "next/server";
import { createHash, randomBytes } from "node:crypto";
import { authUrl, gmailConfigured } from "@/lib/gmail";
import { getOrCreateSessionId } from "@/lib/session";

const GMAIL_COOKIE = "sd_gmail_oauth";

export async function GET(req: Request) {
  if (!gmailConfigured()) return NextResponse.json({ error: "Gmail scanning is not configured." }, { status: 404 });
  await getOrCreateSessionId();
  const origin = new URL(req.url).origin;
  const state = randomBytes(16).toString("base64url");
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  const res = NextResponse.redirect(authUrl({ clientId: process.env.GOOGLE_CLIENT_ID!, redirectUri: `${origin}/api/gmail/callback`, state, codeChallenge: challenge }));
  res.cookies.set(GMAIL_COOKIE, `${state}.${verifier}`, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/api/gmail", maxAge: 600 });
  return res;
}
