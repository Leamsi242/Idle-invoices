import { describe, expect, it } from "vitest";
import fs from "node:fs";
import { decodeHeader, filterMboxStream, splitMbox, subjectOf } from "@/lib/mbox";
import { parseFile } from "@/lib/parsers";

const receipts = ["receipt-spotify.eml", "receipt-notion.eml", "receipt-duolingo.eml"].map((f) => fs.readFileSync(`samples/${f}`, "utf8"));
const newsletter = "From: news@shop.example\nSubject: Nos nouveautés de la semaine\nDate: Mon, 1 Sep 2026 10:00:00 +0000\n\nBonjour !\n";
// A Takeout-style mailbox: a "From " line before each email, newsletters mixed in.
const mbox = [receipts[0], newsletter, receipts[1], newsletter, receipts[2]].map((m, i) => `From 17${i}@xxx Mon Sep 01 10:00:00 +0000 2026\n${m.replace(/\n?$/, "\n")}`).join("\n");

async function* inPieces(text: string, size: number) {
  for (let i = 0; i < text.length; i += size) yield text.slice(i, i + size);
}

describe("Gmail through Google Takeout (.mbox)", () => {
  it("reads subjects, encoded ones included", () => {
    expect(subjectOf("From: a@b.c\nSubject: =?UTF-8?B?Vm90cmUgcmXDp3U=?=\n\nbody")).toBe("Votre reçu");
    expect(decodeHeader("=?utf-8?Q?Re=C3=A7u_de_paiement?=")).toBe("Reçu de paiement");
  });

  it("splits a mailbox into emails", () => {
    expect(splitMbox(mbox)).toHaveLength(5);
  });

  it("keeps only the receipts, even when the file arrives in small pieces", async () => {
    for (const size of [37, 500, 100_000]) {
      const r = await filterMboxStream(inPieces(mbox, size));
      expect([r.kept, r.scanned, r.truncated]).toEqual([3, 5, false]);
      expect(r.mbox).not.toContain("nouveautés");
    }
  });

  it("turns the extract into one charge per receipt on the server", async () => {
    const r = await filterMboxStream(inPieces(mbox, 64));
    const parsed = await parseFile("gmail-recus.mbox", "application/mbox", Buffer.from(r.mbox));
    const one = await Promise.all(receipts.map((m) => parseFile("x.eml", "message/rfc822", Buffer.from(m))));
    expect(parsed.source).toBe("email");
    expect(parsed.transactions.map((t) => t.merchant).sort()).toEqual(one.flatMap((p) => p.transactions.map((t) => t.merchant)).sort());
  });
});
