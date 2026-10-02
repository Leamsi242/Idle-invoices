import { describe, expect, it } from "vitest";
import { ASSISTANT_DICTS, LETTER_DICTS, buildLetter, checkReminder, letterFits, mailtoLink, refundable } from "@/lib/cancel-letter";

const keys = (o: object, prefix = ""): string[] =>
  Object.entries(o).flatMap(([k, v]) => (v && typeof v === "object" && !Array.isArray(v) ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`]));

describe("cancellation letter", () => {
  const base = { serviceName: "Adobe Acrobat Pro", channel: "paypal" as const, today: "2026-09-29", name: "Ismaël Test", reason: "unused" as const };

  it("writes a French letter with the reason, the reference, a refund request and the law", () => {
    const l = buildLetter({ ...base, locale: "fr", reference: "AE0000", refund: { date: "2026-09-29", amount: 23.99, currency: "EUR" } });
    expect(l.subject).toBe("Résiliation de mon abonnement Adobe Acrobat Pro");
    expect(l.body).toContain("résilier mon abonnement Adobe Acrobat Pro");
    expect(l.body).toContain("Je n'utilise plus ce service.");
    expect(l.body).toContain("AE0000");
    expect(l.body).toMatch(/remboursement du prélèvement du 29 sept\. 2026 \(23,99\s€\)/);
    expect(l.body).toContain("L215-1-1");
    expect(l.body.trim().endsWith("Ismaël Test")).toBe(true);
    expect(l.body).not.toMatch(/[–—]/);
  });

  it("asks for nothing more than it was told, in English without French law", () => {
    const l = buildLetter({ ...base, locale: "en", reason: "other", name: "" });
    expect(l.body).not.toMatch(/refund the charge|L215/);
    expect(l.subject).toBe("Cancellation of my Adobe Acrobat Pro subscription");
  });

  it("offers no letter for app store billing, and a mailto with the encoded letter", () => {
    expect(letterFits("apple")).toBe(false);
    expect(letterFits("direct-debit")).toBe(true);
    expect(mailtoLink({ subject: "a b", body: "c\nd" })).toBe("mailto:?subject=a%20b&body=c%0Ad");
  });

  it("suggests a refund only for a charge of the last 30 days", () => {
    expect(refundable([{ date: "2026-09-29", amount: 23.99 }, { date: "2026-08-29", amount: 23.99 }], "2026-10-02")?.date).toBe("2026-09-29");
    expect(refundable([{ date: "2026-08-01", amount: 9 }], "2026-10-02")).toBeUndefined();
    expect(refundable(undefined, "2026-10-02")).toBeUndefined();
  });

  it("reminds two days after the next charge", () => {
    expect(checkReminder("Netflix", "2026-10-29", "fr")).toMatchObject({ date: "2026-10-31", title: "Vérifier que Netflix ne prélève plus" });
  });

  it("has the same texts in both languages, without dashes as punctuation", () => {
    expect(keys(LETTER_DICTS.fr).sort()).toEqual(keys(LETTER_DICTS.en).sort());
    expect(keys(ASSISTANT_DICTS.fr).sort()).toEqual(keys(ASSISTANT_DICTS.en).sort());
    expect(JSON.stringify(ASSISTANT_DICTS.fr) + JSON.stringify(LETTER_DICTS.fr)).not.toMatch(/[–—]/);
  });
});
