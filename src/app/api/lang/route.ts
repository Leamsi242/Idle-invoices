import { NextResponse } from "next/server";
import { LOCALE_COOKIE } from "@/lib/i18n";

/** The language link: remembers the choice for a year and goes back to the page. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const locale = url.searchParams.get("l") === "en" ? "en" : "fr";
  const back = url.searchParams.get("back") ?? "/";
  const res = NextResponse.redirect(new URL(back.startsWith("/") && !back.startsWith("//") ? back : "/", url.origin));
  res.cookies.set(LOCALE_COOKIE, locale, { path: "/", maxAge: 365 * 86_400, sameSite: "lax" });
  return res;
}
