import type { NormalizedTransaction, Source } from "../types";
import { looksLikeBankCsv, parseBankCsv, type ColumnMapping, NeedsMappingError } from "./bank-csv";
import { parseBankPdf } from "./bank-pdf";
import { looksLikePaypalCsv, parsePaypalCsv } from "./paypal-csv";
import { parseEml, parseReceiptText } from "./email";
import { appStoreEntriesToTransactions, parseAppStoreList } from "./app-store";
import { isSupportedImage, screenshotToText } from "./screenshot";

export { NeedsMappingError, type ColumnMapping };

export interface ParsedFile { source: Source; transactions: NormalizedTransaction[] }

export interface ParseOptions {
  /** For pasted text and screenshots: which store the list comes from. */
  hint?: "apple" | "google" | "email";
  mapping?: ColumnMapping;
  today?: string;
}

/** Works out what a file is and runs the matching parser. The buffer is never written to disk. */
export async function parseFile(name: string, type: string, data: Buffer, opts: ParseOptions = {}): Promise<ParsedFile> {
  const ext = name.toLowerCase().split(".").pop() ?? "";
  if (ext === "pdf" || type === "application/pdf") return { source: "bank", transactions: await parseBankPdf(new Uint8Array(data)) };
  if (ext === "eml" || type === "message/rfc822") {
    const tx = await parseEml(data);
    return { source: "email", transactions: tx ? [tx] : [] };
  }
  if (isSupportedImage(type)) {
    const text = await screenshotToText(data, type);
    const source = opts.hint === "google" ? "google" : "apple";
    return { source, transactions: appStoreEntriesToTransactions(parseAppStoreList(text), source, opts.today) };
  }
  const text = data.toString("utf8");
  if (ext === "csv" || type === "text/csv") {
    if (looksLikePaypalCsv(text)) return { source: "paypal", transactions: parsePaypalCsv(text) };
    return { source: "bank", transactions: parseBankCsv(text, opts.mapping) };
  }
  return parseText(text, opts);
}

/** Pasted text: an app store list or a receipt. */
export function parseText(text: string, opts: ParseOptions = {}): ParsedFile {
  if (opts.hint === "email" || /^(From|Subject):/im.test(text)) {
    const tx = parseReceiptText(text);
    return { source: "email", transactions: tx ? [tx] : [] };
  }
  if (looksLikeBankCsv(text)) return { source: "bank", transactions: parseBankCsv(text, opts.mapping) };
  const source = opts.hint === "google" || /play store|google play|payments & subscriptions/i.test(text) ? "google" : "apple";
  return { source, transactions: appStoreEntriesToTransactions(parseAppStoreList(text), source, opts.today) };
}
