import { describe, expect, it } from "vitest";
import { authUrl, GMAIL_SCOPE, listMessageIds, scanGmail } from "@/lib/gmail";
import { looksLikeReceipt, parseReceiptText } from "@/lib/parsers/email";
import { readSample } from "./helpers";

const eml = (from: string, subject: string, body: string) =>
  `From: ${from}\r\nTo: a@example.com\r\nSubject: ${subject}\r\nDate: Tue, 26 Aug 2026 08:00:00 +0000\r\nContent-Type: text/plain; charset=utf-8\r\n\r\n${body}\r\n`;

const MAILBOX: Record<string, string> = {
  m1: readSample("receipt-duolingo.eml").toString(),
  m2: eml("WeTransfer <billing@wetransfer.example>", "Your WeTransfer Pro receipt", "WeTransfer Pro, billed weekly\nTotal: €9.99\nYour free trial has ended."),
  m3: eml("Shop <news@shop.example>", "Subscription deals: 50% off everything", "Only €4.99! Limited time."),
  m4: eml("Friend <friend@example.com>", "Re: payment for dinner", "Thanks, see you soon."),
  m5: eml("PayPal <service@paypal.example>", "Receipt for your payment to Uber BV", "You sent €5.99 EUR to Uber BV\nTotal €5.99"),
};

/** A fake Gmail API: two pages of ids, then raw messages. */
function fakeGmail(calls: string[]): typeof fetch {
  return (async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    calls.push(url);
    expect((init?.headers as Record<string, string>).Authorization).toBe("Bearer token-123");
    const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });
    if (url.includes("/messages?")) {
      return url.includes("pageToken=p2") ? json({ messages: [{ id: "m4" }, { id: "m5" }] }) : json({ messages: [{ id: "m1" }, { id: "m2" }, { id: "m3" }], nextPageToken: "p2" });
    }
    const id = url.match(/messages\/(\w+)\?format=raw/)![1];
    return json({ id, raw: Buffer.from(MAILBOX[id]).toString("base64url") });
  }) as typeof fetch;
}

describe("Gmail scan", () => {
  it("pages through the search results with the receipts query", async () => {
    const calls: string[] = [];
    expect(await listMessageIds("token-123", fakeGmail(calls))).toEqual(["m1", "m2", "m3", "m4", "m5"]);
    expect(decodeURIComponent(calls[0])).toContain("subject:(receipt");
    expect(decodeURIComponent(calls[0])).not.toContain("newer_than");
  });

  it("keeps receipts only, with the merchant behind PayPal", async () => {
    const { scanned, receipts } = await scanGmail("token-123", fakeGmail([]));
    expect(scanned).toBe(5);
    expect(receipts.map((r) => [r.merchant, r.amount, r.frequency, r.isTrial])).toEqual([
      ["Duolingo", 83.99, "yearly", false],
      ["WeTransfer", 9.99, "weekly", true],
      ["Uber BV", 5.99, undefined, false],
    ]);
  });

  it("asks Google for read-only access, without a refresh token, with PKCE", () => {
    const url = new URL(authUrl({ clientId: "cid", redirectUri: "https://app.example/api/gmail/callback", state: "s", codeChallenge: "c" }));
    expect(url.searchParams.get("scope")).toBe(GMAIL_SCOPE);
    expect(GMAIL_SCOPE).toBe("https://www.googleapis.com/auth/gmail.readonly");
    expect(url.searchParams.get("access_type")).toBe("online");
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
  });
});

describe("receipt filter", () => {
  it("tells receipts from promotions and personal mail", () => {
    expect(looksLikeReceipt("Your receipt from Canva", "Total: €11.99")).toBe(true);
    expect(looksLikeReceipt("Votre facture Free Mobile", "Montant : 19,99 €")).toBe(true);
    expect(looksLikeReceipt("Black Friday: 40% off", "Subscription from €2.99")).toBe(false);
    expect(looksLikeReceipt("Lunch?", "See you at noon")).toBe(false);
  });

  it("reads the merchant of a PayPal receipt from its subject", () => {
    const tx = parseReceiptText("From: PayPal <service@paypal.example>\nSubject: Receipt for your payment to Disney Plus\n\nTotal €9.99");
    expect(tx?.merchant).toBe("Disney Plus");
  });
});

describe("Gmail scan time limit and quota", () => {
  it("stops starting downloads once the deadline has passed, and says where to resume", async () => {
    const { scanned, receipts, next, total } = await scanGmail("token-123", fakeGmail([]), { deadline: Date.now() - 1 });
    expect([scanned, receipts, next, total]).toEqual([0, [], 0, 5]);
  });

  it("reads a large mailbox in parts", async () => {
    const part1 = await scanGmail("token-123", fakeGmail([]), { from: 0, batchMs: 0 });
    expect(part1).toMatchObject({ scanned: 5, next: undefined, total: 5 });
    const part2 = await scanGmail("token-123", fakeGmail([]), { from: 3, batchMs: 0 });
    expect(part2.scanned).toBe(2);
    expect(part2.receipts.map((r) => r.merchant)).toEqual(["Uber BV"]);
  });

  it("waits and retries when Gmail answers with its per-minute limit", async () => {
    let refused = 0;
    const base = fakeGmail([]);
    const f = (async (input: string | URL | Request, init?: RequestInit) => {
      if (String(input).includes("/m2?") && refused < 2) {
        refused++;
        return new Response(JSON.stringify({ error: { errors: [{ reason: "rateLimitExceeded" }] } }), { status: 403 });
      }
      return base(input, init);
    }) as typeof fetch;
    const { scanned, receipts } = await scanGmail("token-123", f, { backoffMs: 1, batchMs: 0 });
    expect(refused).toBe(2);
    expect(scanned).toBe(5);
    expect(receipts.map((r) => r.merchant)).toContain("WeTransfer");
  });

  it("stops when Gmail keeps refusing, and reads that batch again in the next part", async () => {
    const base = fakeGmail([]);
    const f = (async (input: string | URL | Request, init?: RequestInit) =>
      String(input).includes("/m2?") ? new Response("", { status: 429 }) : base(input, init)) as typeof fetch;
    const { scanned, next, nextId, receipts } = await scanGmail("token-123", f, { backoffMs: 1, batchMs: 0 });
    // Nothing of the refused batch is counted yet, so its receipts are not counted twice later.
    expect([scanned, next, nextId, receipts]).toEqual([0, 0, "m1", []]);
  });

  it("resumes at the same email when the list shifted between parts", async () => {
    // "m1" was moved to the bin after the first part: positions shift, the id does not.
    const base = fakeGmail([]);
    const f = (async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/messages?") && !url.includes("pageToken")) return new Response(JSON.stringify({ messages: [{ id: "m2" }, { id: "m3" }], nextPageToken: "p2" }));
      return base(input, init);
    }) as typeof fetch;
    const part = await scanGmail("token-123", f, { from: 2, fromId: "m3", batchMs: 0 });
    expect(part.scanned).toBe(3); // m3, m4, m5
    expect(part.receipts.map((r) => r.merchant)).toEqual(["Uber BV"]);
  });

  it("does not retry other errors", async () => {
    const base = fakeGmail([]);
    const f = (async (input: string | URL | Request, init?: RequestInit) =>
      String(input).includes("/m2?") ? new Response("forbidden", { status: 403 }) : base(input, init)) as typeof fetch;
    await expect(scanGmail("token-123", f, { backoffMs: 1, batchMs: 0 })).rejects.toThrow(/403/);
  });
});
