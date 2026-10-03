import { describe, expect, it } from "vitest";
import { bestAlternative, partnerOffers, type PartnerOffer } from "@/lib/partner-offers";
import configured from "@/data/partner-offers.json";

const today = "2026-10-03";
const offer = (o: Partial<PartnerOffer>): PartnerOffer => ({
  id: "o", category: "telecom", partner: "P", title: { fr: "Forfait", en: "Plan" }, conditions: { fr: "", en: "" },
  monthlyPrice: 9.99, currency: "EUR", url: "https://partner.example/x", checkedOn: "2026-09-20", ...o,
});
const mobile = { category: "telecom", currency: "EUR", currentAmount: 19.99, frequency: "monthly" as const, status: "active" as const, usage: undefined, priceChanges: [] };

describe("partner offers", () => {
  it("ranks by what the user saves, never by commission", () => {
    const offers = [offer({ id: "rich", monthlyPrice: 14.99, commission: 80 }), offer({ id: "cheap", monthlyPrice: 7.99, commission: 5 })];
    const alt = bestAlternative(mobile, offers, today)!;
    expect(alt.offer.id).toBe("cheap");
    expect([alt.savingMonthly, alt.savingYearly]).toEqual([12, 144]);
  });

  it("shows nothing below 2 € a month saved, in another category or currency, or for a cancelled subscription", () => {
    expect(bestAlternative(mobile, [offer({ monthlyPrice: 18.5 })], today)).toBeNull();
    expect(bestAlternative(mobile, [offer({ category: "energy" })], today)).toBeNull();
    expect(bestAlternative(mobile, [offer({ currency: "USD" })], today)).toBeNull();
    expect(bestAlternative({ ...mobile, status: "cancelled" }, [offer({})], today)).toBeNull();
    expect(bestAlternative({ ...mobile, usage: "stopped" }, [offer({})], today)).toBeNull();
  });

  it("hides an offer whose price was not checked for 60 days, an expired one, or a link that is not https", () => {
    expect(bestAlternative(mobile, [offer({ checkedOn: "2026-07-01" })], today)).toBeNull();
    expect(bestAlternative(mobile, [offer({ expiresOn: "2026-10-01" })], today)).toBeNull();
    expect(bestAlternative(mobile, [offer({ url: "http://partner.example/x" })], today)).toBeNull();
  });

  it("compares on the monthly equivalent, and notices a recent price rise", () => {
    const yearly = { ...mobile, currentAmount: 240, frequency: "yearly" as const, priceChanges: [{ date: "2026-09-01", from: 200, to: 240 }] };
    const alt = bestAlternative(yearly, [offer({})], today)!;
    expect(alt.savingMonthly).toBe(10.01);
    expect(alt.priceRose).toBe(true);
  });

  it("ships no real offer until one is signed, and only made-up ones in the demo", () => {
    expect(configured).toEqual([]);
    expect(partnerOffers(false, today)).toEqual([]);
    expect(partnerOffers(true, today).every((o) => /test|fictive/i.test(o.partner + o.conditions.fr))).toBe(true);
  });
});
