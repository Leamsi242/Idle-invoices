import { NextResponse } from "next/server";
import { bankingConfigured, listInstitutions, type Institution } from "@/lib/banking";

// The list changes rarely: keep it an hour per country.
const cache = new Map<string, { at: number; list: Institution[] }>();

export async function GET(req: Request) {
  if (!bankingConfigured()) return NextResponse.json({ error: "Bank connection is not configured." }, { status: 404 });
  const country = (new URL(req.url).searchParams.get("country") ?? "FR").toUpperCase();
  if (!/^[A-Z]{2}$/.test(country)) return NextResponse.json({ error: "Invalid country" }, { status: 400 });
  const hit = cache.get(country);
  if (hit && Date.now() - hit.at < 3_600_000) return NextResponse.json({ institutions: hit.list });
  try {
    const list = await listInstitutions(country);
    cache.set(country, { at: Date.now(), list });
    return NextResponse.json({ institutions: list });
  } catch {
    return NextResponse.json({ error: "The list of banks is unavailable right now." }, { status: 502 });
  }
}
