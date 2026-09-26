import type { Change } from "./engine/changes";
import { messages, money, type Locale } from "./i18n";

/**
 * Alert emails through Resend (resend.com), only when RESEND_API_KEY and ALERT_FROM are set and
 * the user gave an address. Without them, alerts are shown on the report only.
 */
export function emailConfigured(): boolean {
  return !!(process.env.RESEND_API_KEY && process.env.ALERT_FROM);
}

export function alertLine(c: Change, locale: Locale): string {
  const a = messages(locale).alerts;
  const per = messages(locale).per[c.frequency];
  const $ = (n: number) => money(n, c.currency, locale);
  if (c.kind === "price-up") return a.priceUp(c.serviceName, $(c.previousAmount ?? 0), $(c.amount), per);
  if (c.kind === "restarted") return a.restarted(c.serviceName, $(c.amount), per);
  return a.new(c.serviceName, $(c.amount), per);
}

export async function sendAlertEmail(to: string, changes: Change[], locale: Locale, appUrl: string, f: typeof fetch = fetch): Promise<boolean> {
  if (!emailConfigured() || changes.length === 0) return false;
  const a = messages(locale).alerts;
  const text = [a.emailIntro, "", ...changes.map((c) => `- ${alertLine(c, locale)}`), "", a.emailOutro(`${appUrl}/report`)].join("\n");
  const res = await f("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: process.env.ALERT_FROM, to: [to], subject: a.emailSubject(changes.length), text }),
  });
  return res.ok;
}
