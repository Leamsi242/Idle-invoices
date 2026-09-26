import Papa from "papaparse";
import type { NormalizedTransaction } from "../types";
import { parseAmount } from "../amount";
import { parseDate } from "../dates";
import { makeTx } from "./common";

// English and French headers of PayPal's Activity download.
const H = {
  date: ["Date"],
  name: ["Name", "Nom"],
  type: ["Type"],
  status: ["Status", "État", "Etat"],
  currency: ["Currency", "Devise"],
  gross: ["Gross", "Brut", "Avant commission"],
  title: ["Item Title", "Titre de l'objet"],
};

export function looksLikePaypalCsv(text: string): boolean {
  const head = text.slice(0, 2000);
  return /"?(Gross|Brut|Avant commission)"?/.test(head) && /"?(Name|Nom)"?/.test(head) && /Transaction ID|Numéro de transaction/.test(head);
}

/**
 * Rows that are not money paid to a merchant. A card-style payment (Uber, Bolt) appears twice:
 * an "Autorisation standard" / "General Authorization" and the payment itself ("Paiement
 * préapprouvé...", or "Autre" / "Other" when it captures the authorization). Holds, voids,
 * funding, conversions, refunds and transfers are left out too.
 */
const NOT_A_PAYMENT = /autori[sz]ation|suspension|hold|annulation|void|reversal|remboursement|refund|conversion|approvisionnement|funding|d[ée]p[ôo]t|deposit|transfer|virement|withdraw|retrait/i;

/**
 * Stores and payment processors hide the service in the item title: Google Play writes
 * "Pro (SoundType AI - Voice To Text)", Paddle "[CLEANSHOTX] 1x CleanShot Cloud Pro Monthly".
 */
export function serviceBehind(name: string, title: string): string | undefined {
  if (!title) return undefined;
  if (/^(google payment|apple (?:services|distribution))/i.test(name)) {
    const app = title.match(/\(([^()]+)\)\s*$/)?.[1];
    return app ? app.split(/\s+[–-]\s+|:\s/)[0].trim() : undefined;
  }
  if (/^(paddle|fastspring|stripe)/i.test(name)) {
    const item = title.replace(/^\[[^\]]*\]\s*/, "").replace(/^\d+x\s+/i, "").replace(/\s+(?:Monthly|Yearly|Annual|Weekly|Mensuel|Annuel)$/i, "").trim();
    return item || undefined;
  }
  return undefined;
}

/** Keeps outgoing, completed payments; the Name column is the real merchant. */
export function parsePaypalCsv(text: string): NormalizedTransaction[] {
  const { data } = Papa.parse<Record<string, string>>(text.replace(/^﻿/, ""), { header: true, skipEmptyLines: "greedy" });
  const get = (row: Record<string, string>, keys: string[]) => keys.map((k) => row[k]).find((v) => v !== undefined)?.trim() ?? "";
  const out: NormalizedTransaction[] = [];
  for (const row of data) {
    const name = get(row, H.name);
    const gross = parseAmount(get(row, H.gross));
    const status = get(row, H.status);
    const type = get(row, H.type);
    if (!name || gross === null || gross >= 0) continue; // funding rows and incoming money
    if (status && !/completed|terminé|termine/i.test(status)) continue;
    if (NOT_A_PAYMENT.test(type)) continue;
    const date = parseDate(get(row, H.date), "DMY");
    if (!date) continue;
    const title = get(row, H.title);
    const named = serviceBehind(name, title);
    out.push(makeTx({
      date,
      amount: -gross,
      currency: get(row, H.currency) || "EUR",
      rawLabel: `PAYPAL ${named ?? name}`,
      source: "paypal",
      merchant: named ?? name,
      plan: title || undefined,
    }));
  }
  return out;
}
