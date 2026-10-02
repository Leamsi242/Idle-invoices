import { afterEach, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db";
import { deleteAccount, getAccount, maskEmail, normalizeEmail, previewLogin, purgeAccounts, requestLogin, verifyLogin } from "@/lib/accounts";
import { lookupHash } from "@/lib/crypto";
import { saveUpload, sessionHasData } from "@/lib/store";
import { parseSample } from "./helpers";

const tokenOf = (link: string) => link.split("#t=")[1];

async function link(email: string, now = new Date()) {
  const { devLink } = await requestLogin({ email, appUrl: "http://localhost:3000", locale: "fr", now });
  return tokenOf(devLink!);
}

async function withData(sessionId: string) {
  const parsed = await parseSample("bank-n26.csv");
  await saveUpload(sessionId, "bank-n26.csv", parsed.source, parsed.transactions);
}

describe("accounts by e-mail link", () => {
  afterEach(() => {
    delete process.env.RESEND_API_KEY;
    delete process.env.ALERT_FROM;
  });

  it("accepts real addresses only, compared in lower case", () => {
    expect(normalizeEmail("  Me@Example.COM ")).toBe("me@example.com");
    expect(["", "me", "me@x", "a b@c.de", 42, null].map(normalizeEmail)).toEqual([null, null, null, null, null, null]);
    expect(maskEmail("ismael@example.com")).toBe("is••••@example.com");
  });

  it("stores neither the address nor the token in clear", async () => {
    const email = `${randomUUID()}@example.com`;
    const token = await link(email);
    const rows = await prisma.loginToken.findMany();
    const dump = JSON.stringify(rows);
    expect(dump).not.toContain(email);
    expect(dump).not.toContain(token);
  });

  it("e-mails the link through Resend when it is set up, with the token after #", async () => {
    process.env.RESEND_API_KEY = "re_test";
    process.env.ALERT_FROM = "Subscription Detective <connexion@app.example>";
    const sent: { to: string[]; subject: string; text: string }[] = [];
    const f = (async (_url: string | URL | Request, init?: RequestInit) => {
      sent.push(JSON.parse(init!.body as string));
      return new Response("{}", { status: 200 });
    }) as typeof fetch;
    const r = await requestLogin({ email: "me@example.com", appUrl: "https://app.example/", locale: "fr", send: f });
    expect(r).toEqual({ sent: true });
    expect(sent[0].to).toEqual(["me@example.com"]);
    expect(sent[0].subject).toBe("Votre lien de connexion");
    expect(sent[0].text).toMatch(/https:\/\/app\.example\/account\/confirm#t=[A-Za-z0-9_-]{43}/);
  });

  it("a first sign-in keeps this browser's findings; the link works once", async () => {
    const browser = randomUUID();
    await withData(browser);
    const email = `${randomUUID()}@example.com`;
    const token = await link(email);
    expect(await previewLogin(token, browser)).toBe("new");
    expect(await verifyLogin(token, browser)).toEqual({ sessionId: browser, outcome: "new" });
    expect(await verifyLogin(token, browser)).toBeNull();
    expect((await getAccount(browser))?.email).toBe(email);
  });

  it("refuses an expired link and a link replaced by a newer one", async () => {
    const email = `${randomUUID()}@example.com`;
    const old = new Date(Date.now() - 16 * 60_000);
    const expired = await link(email, old);
    expect(await verifyLogin(expired, null)).toBeNull();
    const first = await link(email);
    const second = await link(email);
    expect(await verifyLogin(first, null)).toBeNull();
    expect(await verifyLogin(second, null)).not.toBeNull();
    expect(await verifyLogin("not-a-token", null)).toBeNull();
  });

  it("on another device, the account's session replaces an anonymous one, which is erased", async () => {
    const email = `${randomUUID()}@example.com`;
    const home = randomUUID();
    await withData(home);
    await verifyLogin(await link(email), home);
    const phone = randomUUID();
    await withData(phone);
    const token = await link(email);
    expect(await previewLogin(token, phone)).toBe("replace");
    expect(await verifyLogin(token, phone)).toEqual({ sessionId: home, outcome: "replace" });
    expect(await sessionHasData(phone)).toBe(false);
    expect(await sessionHasData(home)).toBe(true);
  });

  it("an empty account adopts the browser's findings", async () => {
    const email = `${randomUUID()}@example.com`;
    const { sessionId: empty } = (await verifyLogin(await link(email), null))!;
    const laptop = randomUUID();
    await withData(laptop);
    expect(await verifyLogin(await link(email), laptop)).toEqual({ sessionId: laptop, outcome: "adopt" });
    expect(await getAccount(empty)).toBeNull();
    expect((await getAccount(laptop))?.email).toBe(email);
  });

  it("never hands one account's session to another", async () => {
    const a = `${randomUUID()}@example.com`, b = `${randomUUID()}@example.com`;
    const shared = randomUUID();
    await withData(shared);
    await verifyLogin(await link(a), shared);
    const r = await verifyLogin(await link(b), shared);
    expect(r?.outcome).toBe("new");
    expect(r?.sessionId).not.toBe(shared);
    expect(await sessionHasData(shared)).toBe(true);
  });

  it("deleting the account erases its data, its links and its address", async () => {
    const email = `${randomUUID()}@example.com`;
    const s = randomUUID();
    await withData(s);
    await verifyLogin(await link(email), s);
    await link(email);
    await deleteAccount(s);
    expect(await getAccount(s)).toBeNull();
    expect(await sessionHasData(s)).toBe(false);
    expect(await prisma.loginToken.count({ where: { emailHash: lookupHash(`email:${email}`) } })).toBe(0);
  });

  it("purges used links and accounts unused for a year", async () => {
    const email = `${randomUUID()}@example.com`;
    const { sessionId } = (await verifyLogin(await link(email), null))!;
    await prisma.account.update({ where: { sessionId }, data: { lastLoginAt: new Date(Date.now() - 366 * 86_400_000) } });
    expect(await purgeAccounts()).toBeGreaterThanOrEqual(1);
    expect(await getAccount(sessionId)).toBeNull();
    expect(await prisma.loginToken.count({ where: { usedAt: { not: null } } })).toBe(0);
  });
});
