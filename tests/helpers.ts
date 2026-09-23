import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { NormalizedTransaction } from "@/lib/types";
import { parseFile } from "@/lib/parsers";

export const SAMPLES = join(__dirname, "..", "samples");
export const readSample = (name: string) => readFileSync(join(SAMPLES, name));
// The sample period ends on 30 Sep 2026.
export const TODAY = "2026-09-30";

const TYPES: Record<string, string> = { csv: "text/csv", pdf: "application/pdf", eml: "message/rfc822", txt: "text/plain" };

export async function parseSample(name: string, hint?: "apple" | "google") {
  const ext = name.split(".").pop()!;
  return parseFile(name, TYPES[ext], readSample(name), { hint, today: TODAY });
}

export async function loadAllSamples(): Promise<NormalizedTransaction[]> {
  const files: [string, ("apple" | "google")?][] = [
    ["bank-n26.csv"], ["bank-card-fr.csv"], ["bank-statement.pdf"], ["paypal-activity.csv"],
    ["receipt-duolingo.eml"], ["receipt-notion.eml"], ["receipt-spotify.eml"],
    ["apple-subscriptions.txt", "apple"], ["google-subscriptions.txt", "google"],
  ];
  const all = await Promise.all(files.map(([f, h]) => parseSample(f, h)));
  return all.flatMap((p) => p.transactions);
}
