import { afterEach, describe, expect, it } from "vitest";
import { alertLine, sendAlertEmail } from "@/lib/notify";
import type { Change } from "@/lib/engine/changes";

const tinder: Change = { kind: "restarted", key: "TINDER", serviceName: "Tinder", amount: 39.99, previousAmount: 19.99, currency: "EUR", frequency: "monthly", date: "2026-09-25" };

describe("alert emails", () => {
  afterEach(() => {
    delete process.env.RESEND_API_KEY;
    delete process.env.ALERT_FROM;
  });

  it("writes one line per change, in the user's language", () => {
    expect(alertLine(tinder, "en")).toBe("Tinder is charging again: €39.99 per month");
    expect(alertLine({ ...tinder, kind: "price-up" }, "fr")).toMatch(/^Tinder passe de 19,99\s€ à 39,99\s€ par mois$/);
  });

  it("sends nothing unless email is set up, then posts to Resend", async () => {
    const calls: { url: string; body: string; auth: string }[] = [];
    const f = (async (url: string | URL | Request, init?: RequestInit) => {
      calls.push({ url: String(url), body: init!.body as string, auth: (init!.headers as Record<string, string>).Authorization });
      return new Response("{}", { status: 200 });
    }) as typeof fetch;
    expect(await sendAlertEmail("me@example.com", [tinder], "fr", "https://app.example", f)).toBe(false);
    process.env.RESEND_API_KEY = "re_test";
    process.env.ALERT_FROM = "Subscription Detective <alertes@app.example>";
    expect(await sendAlertEmail("me@example.com", [tinder], "fr", "https://app.example", f)).toBe(true);
    const body = JSON.parse(calls[0].body);
    expect([calls[0].url, calls[0].auth, body.to, body.subject]).toEqual(["https://api.resend.com/emails", "Bearer re_test", ["me@example.com"], "Subscription Detective : un changement dans vos abonnements"]);
    expect(body.text).toContain("https://app.example/report");
  });
});
