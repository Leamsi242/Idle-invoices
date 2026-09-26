import { describe, expect, it } from "vitest";
import { MESSAGES, formatDate, money, pickLocale, translateReason } from "@/lib/i18n";
import { cancellationSteps } from "@/lib/cancel-guide";
import { renewalReminder } from "@/lib/ics";

describe("French and English", () => {
  it("takes the language from the cookie, then from the browser", () => {
    expect(pickLocale(null, "fr-FR,fr;q=0.9,en;q=0.8")).toBe("fr");
    expect(pickLocale(null, "en-GB,en;q=0.9")).toBe("en");
    expect(pickLocale("en", "fr-FR")).toBe("en");
    expect(pickLocale(undefined, "de-DE,fr;q=0.5")).toBe("fr");
    expect(pickLocale(undefined, "")).toBe("en");
  });

  it("formats prices and dates the French way", () => {
    expect(money(1234.5, "EUR", "fr")).toMatch(/^1\s234,50\s€$/);
    expect(formatDate("2026-10-10", "fr")).toBe("10 oct. 2026");
    expect(formatDate("2026-10-10", "en")).toBe("10 Oct 2026");
  });

  it("translates every reason the engine gives", () => {
    const reasons = [
      "Billed once a year, easy to forget between renewals",
      "Small charge, under €10 a month",
      "Started as a free trial",
      "No receipt email found",
      "Already included in Apple One",
      "Billed every week, about €43.29 a month",
      "Started with a €0.99 trial on 2026-09-07",
      "New: first charged on 2026-09-14, check you meant to keep it",
      "Charged twice: two accounts or a duplicate subscription?",
      "Seen twice so far: your bank shares about 3 months of history",
      "Trial ended on 2026-09-14 and no cancellation was found: check your statement for 49.99 EUR",
    ];
    for (const r of reasons) expect(translateReason(r, "fr")).not.toBe(r);
    expect(translateReason("Billed every week, about €43.29 a month", "fr")).toBe("Facturé chaque semaine, environ 43,29 € par mois");
    expect(translateReason("Started with a €0.99 trial on 2026-09-07", "fr")).toBe("A commencé par un essai à 0,99 € le 7 sept. 2026");
    expect(translateReason("No receipt email found", "en")).toBe("No receipt email found");
  });

  it("has the same texts in both languages", () => {
    const keys = (o: object, prefix = ""): string[] =>
      Object.entries(o).flatMap(([k, v]) => (v && typeof v === "object" && !Array.isArray(v) ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`]));
    expect(keys(MESSAGES.fr).sort()).toEqual(keys(MESSAGES.en).sort());
  });

  it("writes cancellation steps and calendar reminders in French", () => {
    expect(cancellationSteps("google", "Tinder", "fr")[0]).toBe("Tinder est facturé par Google Play : résiliez-le dans le Play Store.");
    expect(renewalReminder("Claude", "2026-10-10", "216,00 €", undefined, "fr").title).toBe("Claude prélève 216,00 € le 10 oct. 2026");
  });
});
