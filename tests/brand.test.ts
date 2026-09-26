import { describe, expect, it } from "vitest";
import { brandOf, LOGO_DOMAINS } from "@/lib/brand";
import { GET } from "@/app/api/logo/[domain]/route";

describe("service icons", () => {
  it("bundles the real logo of well-known services", () => {
    for (const name of ["Netflix", "Spotify", "Tinder", "Claude", "PayPal", "American Express", "Gmail"]) {
      expect(brandOf(name)?.path, name).toMatch(/^[Mm]/);
      expect(brandOf(name)?.hex, name).toMatch(/^[0-9A-F]{6}$/i);
    }
  });

  it("falls back to the site's own icon for brands without a bundled logo", () => {
    expect(brandOf("Adobe Creative Cloud")).toMatchObject({ domain: "adobe.com" });
    expect(brandOf("Engie")).toMatchObject({ domain: "engie.fr" });
    expect(brandOf("Crédit Mutuel")).toMatchObject({ domain: "creditmutuel.fr" });
    // A merchant name the engine found is matched to its service.
    expect(brandOf("NETFLIX.COM")?.hex).toBe(brandOf("Netflix")?.hex);
    expect(brandOf("Kagi Inc")).toBeUndefined();
  });

  it("fetches icons only for known domains", async () => {
    expect(LOGO_DOMAINS.has("adobe.com")).toBe(true);
    expect(LOGO_DOMAINS.has("service-public.fr")).toBe(false);
    const res = await GET(new Request("http://x/api/logo/evil.example"), { params: Promise.resolve({ domain: "evil.example" }) });
    expect(res.status).toBe(404);
  });
});
