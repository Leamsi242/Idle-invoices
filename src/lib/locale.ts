import { cookies, headers } from "next/headers";
import { LOCALE_COOKIE, messages, pickLocale, type Locale, type Messages } from "./i18n";

/** The page's language: the language link's cookie, or the browser's. */
export async function getLocale(): Promise<Locale> {
  const [c, h] = await Promise.all([cookies(), headers()]);
  return pickLocale(c.get(LOCALE_COOKIE)?.value, h.get("accept-language"));
}

export async function getMessages(): Promise<{ locale: Locale; m: Messages }> {
  const locale = await getLocale();
  return { locale, m: messages(locale) };
}
