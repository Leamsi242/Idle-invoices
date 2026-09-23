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
  gross: ["Gross", "Brut"],
  title: ["Item Title", "Titre de l'objet"],
};

export function looksLikePaypalCsv(text: string): boolean {
  const head = text.slice(0, 2000);
  return /"?(Gross|Brut)"?/.test(head) && /"?(Name|Nom)"?/.test(head) && /Transaction ID|Numéro de transaction/.test(head);
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
    if (/deposit|transfer|withdraw|virement/i.test(type)) continue;
    const date = parseDate(get(row, H.date), "DMY");
    if (!date) continue;
    out.push(makeTx({
      date,
      amount: -gross,
      currency: get(row, H.currency) || "EUR",
      rawLabel: `PAYPAL ${name}`,
      source: "paypal",
      merchant: name,
      plan: get(row, H.title) || undefined,
    }));
  }
  return out;
}
