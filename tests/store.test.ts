import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db";
import { decrypt, encrypt } from "@/lib/crypto";
import { deleteEverything, getAnswers, getOnboarding, saveAnswers, setItemDone, getReport, listSubscriptions, purgeExpired, recompute, saveLabel, saveUpload, setUsage } from "@/lib/store";
import { parseSample } from "./helpers";

const FILES: [string, ("apple" | "google")?][] = [
  ["bank-n26.csv"], ["bank-card-fr.csv"], ["bank-statement.pdf"], ["paypal-activity.csv"],
  ["receipt-duolingo.eml"], ["receipt-notion.eml"], ["receipt-spotify.eml"], ["apple-subscriptions.txt", "apple"],
];

async function uploadAll(sessionId: string) {
  for (const [f, hint] of FILES) {
    const parsed = await parseSample(f, hint);
    await saveUpload(sessionId, f, parsed.source, parsed.transactions);
  }
  return recompute(sessionId);
}

describe("encryption", () => {
  it("round-trips and never stores plain text", () => {
    const c = encrypt("PAYPAL *UBER");
    expect(c).not.toContain("UBER");
    expect(decrypt(c)).toBe("PAYPAL *UBER");
    expect(encrypt("x")).not.toBe(encrypt("x")); // random IV
  });
});

describe("store", () => {
  it("stores transactions, subscriptions and matches, with labels encrypted at rest", async () => {
    const session = randomUUID();
    const counts = await uploadAll(session);
    expect(counts.subscriptions).toBe(16);
    expect(await prisma.match.count({ where: { sessionId: session } })).toBe(counts.matches);
    const raw = await prisma.transaction.findFirst({ where: { sessionId: session, source: "paypal" } });
    expect(raw!.rawLabel.startsWith("v1:")).toBe(true);
    expect(raw!.merchant).not.toMatch(/Uber|Disney|Duolingo/);
    // Uploads are recorded as deleted: the raw file was never kept.
    const uploads = await prisma.upload.findMany({ where: { sessionId: session } });
    expect(uploads.every((u) => u.deletedAt !== null)).toBe(true);
  });

  it("masks account numbers in stored file names", async () => {
    const session = randomUUID();
    const upload = await saveUpload(session, "statement FR14 2004 1010 0505 0001 3M02 606.csv", "bank", []);
    expect(upload.fileName).toBe("statement IBAN ••••2606.csv");
  });

  it("keeps 'Still using this?' answers and user labels across recomputes", async () => {
    const session = randomUUID();
    await uploadAll(session);
    const subs = await listSubscriptions(session);
    const gym = subs.find((s) => s.serviceName === "Basic-Fit")!;
    await setUsage(session, gym.key, "no");
    const unknown = subs.find((s) => s.needsLabel)!;
    await saveLabel(session, unknown.key, "FocusFlow");
    await recompute(session);
    const report = await getReport(session);
    expect(report.idle.map((s) => s.serviceName)).toEqual(["Basic-Fit"]);
    expect(report.potentialSavings).toBe(359.88);
    expect(report.needsLabel).toHaveLength(0);
    expect((await listSubscriptions(session)).some((s) => s.serviceName === "FocusFlow")).toBe(true);
  });

  it("refuses to update another session's subscription", async () => {
    const a = randomUUID();
    await uploadAll(a);
    const [sub] = await listSubscriptions(a);
    await expect(setUsage(randomUUID(), sub.key, "no")).rejects.toThrow();
  });

  it("deletes everything for one session and nothing else", async () => {
    const a = randomUUID();
    const b = randomUUID();
    await uploadAll(a);
    await uploadAll(b);
    await saveLabel(a, "PADDLE.NET* FOCUSFLOW", "FocusFlow");
    await saveAnswers(a, { banks: ["n26"], wallets: ["paypal"] });
    await deleteEverything(a);
    for (const model of [prisma.upload, prisma.transaction, prisma.subscription, prisma.match, prisma.descriptor, prisma.trackedTrial, prisma.profile] as unknown as { count: (q: object) => Promise<number> }[]) {
      expect(await model.count({ where: { sessionId: a } })).toBe(0);
    }
    expect(await prisma.subscription.count({ where: { sessionId: b } })).toBe(16);
  });

  it("purges sessions older than the retention period", async () => {
    const old = randomUUID();
    const parsed = await parseSample("bank-n26.csv");
    const upload = await saveUpload(old, "old.csv", "bank", parsed.transactions);
    await prisma.upload.update({ where: { id: upload.id }, data: { uploadedAt: new Date(Date.now() - 40 * 86_400_000) } });
    expect(await purgeExpired()).toBeGreaterThanOrEqual(1);
    expect(await prisma.transaction.count({ where: { sessionId: old } })).toBe(0);
  });

  it("keeps the onboarding answers encrypted, and ticks items from the uploaded data", async () => {
    const session = randomUUID();
    await saveAnswers(session, { banks: ["n26", "made-up-bank"], wallets: ["paypal"], mailboxes: ["gmail"], password: "hunter2" });
    const row = await prisma.profile.findUnique({ where: { sessionId: session } });
    expect(row!.answers).not.toContain("paypal");
    expect(await getAnswers(session)).toMatchObject({ banks: ["n26"], wallets: ["paypal"], mailboxes: ["gmail"] });
    expect((await getOnboarding(session)).plan.map((i) => [i.id, i.status])).toEqual([["bank:n26", "todo"], ["paypal", "todo"], ["mail:gmail", "todo"]]);

    await uploadAll(session);
    const plan = (await getOnboarding(session)).plan;
    expect(plan.filter((i) => i.status === "done").map((i) => i.id)).toEqual(expect.arrayContaining(["bank:n26", "paypal", "mail:gmail"]));
    await setItemDone(session, "amazon", true);
    expect((await getAnswers(session))!.done).toEqual(["amazon"]);
  });
});

