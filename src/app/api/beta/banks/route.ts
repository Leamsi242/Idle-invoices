import { NextResponse } from "next/server";
import { cronAuthorized } from "@/lib/cron-auth";
import { EnableBanking, enableBankingConfigured, shownToUsers } from "@/lib/banking/enable-banking";

/**
 * For the owner only (same secret as the cron jobs): every bank Enable Banking lists for a country
 * with this application's keys, and whether the app offers it. Answers "can every French bank be
 * tested?" from the provider itself, since its list is not public.
 */
export async function GET(req: Request) {
  if (!cronAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!enableBankingConfigured()) return NextResponse.json({ error: "Enable Banking is not configured (ENABLE_BANKING_APP_ID, ENABLE_BANKING_PRIVATE_KEY)." }, { status: 404 });
  const country = (new URL(req.url).searchParams.get("country") ?? "FR").toUpperCase();
  if (!/^[A-Z]{2}$/.test(country)) return NextResponse.json({ error: "Invalid country" }, { status: 400 });
  const list = await new EnableBanking().aspsps(country);
  const banks = list
    .map((a) => ({
      name: a.name,
      shown: shownToUsers(a),
      personal: !a.psu_types || a.psu_types.includes("personal"),
      business: !!a.psu_types?.includes("business"),
      consentDays: a.maximum_consent_validity ? Math.floor(a.maximum_consent_validity / 86_400) : null,
      sandbox: a.sandbox ?? null,
      beta: a.beta ?? null,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "fr"));
  return NextResponse.json(
    { country, total: banks.length, shown: banks.filter((b) => b.shown).length, hidden: banks.filter((b) => !b.shown).map((b) => b.name), banks },
    { headers: { "Cache-Control": "no-store" } },
  );
}
