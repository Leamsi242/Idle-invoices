/**
 * Gmail without the Gmail connection: Google Takeout exports a mailbox as one .mbox file (all the
 * emails one after the other, each starting with a "From " line). It can weigh gigabytes, so the
 * browser reads it in pieces and keeps only the emails whose subject looks like a receipt, with
 * the same words as the Gmail scan. Only that small extract is sent. Runs in the browser and on
 * the server (no Node-only API).
 */

// The Gmail scan's subject words (lib/gmail.ts GMAIL_QUERY), as one pattern.
export const RECEIPT_SUBJECT = /receipt|invoice|facture|re[çc]u|payment|paiement|subscription|abonnement|renewal|renouvellement|trial|essai|membership|billing|facturation|commande|annul[ée]|cancell?ed|r[ée]siliation|order|votre achat|your purchase/i;

/** Where the extract stops: under the upload limit (4 MB) and the Gmail scan's 500 emails. */
export const MBOX_MAX_BYTES = 3_500_000;
export const MBOX_MAX_MESSAGES = 500;
/** One receipt rarely needs more; bigger ones carry attachments, cut at the limit. */
const MESSAGE_MAX_BYTES = 150_000;

/** Decodes =?utf-8?B?...?= and =?utf-8?Q?...?= words in a header. */
export function decodeHeader(value: string): string {
  return value.replace(/=\?([^?]+)\?([BbQq])\?([^?]*)\?=/g, (_, charset: string, enc: string, text: string) => {
    try {
      const bytes =
        enc.toUpperCase() === "B"
          ? Uint8Array.from(atob(text), (c) => c.charCodeAt(0))
          : Uint8Array.from(text.replace(/_/g, " ").replace(/=([0-9A-F]{2})/gi, (_m, h: string) => String.fromCharCode(parseInt(h, 16))), (c) => c.charCodeAt(0));
      return new TextDecoder(charset.toLowerCase()).decode(bytes);
    } catch {
      return text;
    }
  });
}

/** The Subject header of one raw email (headers end at the first blank line; folded lines joined). */
export function subjectOf(raw: string): string {
  const end = raw.search(/\r?\n\r?\n/);
  const headers = (end === -1 ? raw : raw.slice(0, end)).replace(/\r?\n[ \t]+/g, " ");
  const m = headers.match(/^Subject:[ \t]*(.*)$/im);
  return m ? decodeHeader(m[1]).trim() : "";
}

/** Splits mbox text into raw emails ("From " lines only start a message after a blank line or at the start). */
export function splitMbox(text: string): string[] {
  const parts = text.split(/(?:^|\r?\n)(?=From \S+.*\r?\n)/);
  return parts.map((p) => p.replace(/^From \S+.*\r?\n/, "")).filter((p) => /\S/.test(p) && /^[\w-]+:/m.test(p));
}

export interface MboxFilterResult { mbox: string; kept: number; scanned: number; truncated: boolean }

/**
 * Keeps the receipts of an mbox read in pieces (the browser passes File.stream() chunks). The
 * extract is itself an mbox, read on the server by parseMbox.
 */
export async function filterMboxStream(chunks: AsyncIterable<string>): Promise<MboxFilterResult> {
  const kept: string[] = [];
  let size = 0;
  let scanned = 0;
  let truncated = false;
  let carry = "";
  const take = (raw: string) => {
    scanned++;
    if (kept.length >= MBOX_MAX_MESSAGES || size >= MBOX_MAX_BYTES) return void (truncated = true);
    if (!RECEIPT_SUBJECT.test(subjectOf(raw))) return;
    const msg = raw.length > MESSAGE_MAX_BYTES ? raw.slice(0, MESSAGE_MAX_BYTES) : raw;
    if (size + msg.length > MBOX_MAX_BYTES) return void (truncated = true);
    kept.push(msg);
    size += msg.length + 40;
  };
  for await (const chunk of chunks) {
    carry += chunk;
    // Everything before the last message start is complete.
    const lastStart = carry.lastIndexOf("\nFrom ");
    if (lastStart <= 0) continue;
    const complete = carry.slice(0, lastStart);
    carry = carry.slice(lastStart + 1);
    for (const raw of splitMbox(complete)) take(raw);
  }
  for (const raw of splitMbox(carry)) take(raw);
  return { mbox: kept.map((m) => `From receipts@subscription-detective ${new Date(0).toUTCString()}\n${m.replace(/\n?$/, "\n")}`).join("\n"), kept: kept.length, scanned, truncated };
}
