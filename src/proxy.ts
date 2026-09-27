import { NextResponse, type NextRequest } from "next/server";

/**
 * Every API write must come from this site's own pages. Session cookies are SameSite=Lax, which
 * already keeps them off cross-site POSTs, but a route that acts without a cookie (the demo, which
 * creates a session) could still be triggered by a form on another site. Requests without these
 * headers (the cron job, server-to-server calls) are left to each route's own checks.
 */
export function proxy(req: NextRequest) {
  if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") return NextResponse.next();
  const site = req.headers.get("sec-fetch-site");
  if (site && site !== "same-origin" && site !== "none") return NextResponse.json({ error: "Cross-site request refused." }, { status: 403 });
  const origin = req.headers.get("origin");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (origin && origin !== "null") {
    let originHost = "";
    try {
      originHost = new URL(origin).host;
    } catch {}
    if (originHost !== host) return NextResponse.json({ error: "Cross-site request refused." }, { status: 403 });
  } else if (origin === "null") {
    return NextResponse.json({ error: "Cross-site request refused." }, { status: 403 });
  }
  return NextResponse.next();
}

export const config = { matcher: "/api/:path*" };
