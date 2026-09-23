import { prisma } from "./db";
import { decrypt, decryptOptional, encrypt, encryptOptional } from "./crypto";
import type { DescriptorEntry, DetectedSubscription, Frequency, NormalizedTransaction, Source, Status, Usage } from "./types";
import { analyze } from "./engine/pipeline";
import { buildReport, type Report } from "./engine/flags";
import { descriptorFromAnswer } from "./engine/descriptors";

/** Data older than this is purged automatically (see the privacy page). */
export const RETENTION_DAYS = 30;

const day = (d: string) => new Date(`${d}T00:00:00.000Z`);
const iso = (d: Date) => d.toISOString().slice(0, 10);

/**
 * Stores the normalized transactions of one parsed file. The raw file itself is never
 * written anywhere: it only lived in memory while parsing, so the upload is recorded as
 * deleted straight away.
 */
export async function saveUpload(sessionId: string, fileName: string, source: Source, txs: NormalizedTransaction[]) {
  return prisma.$transaction(async (db) => {
    const upload = await db.upload.create({ data: { sessionId, sourceType: source, fileName: fileName.slice(0, 200), deletedAt: new Date() } });
    if (txs.length) {
      await db.transaction.createMany({
        data: txs.map((t) => ({
          sessionId,
          uploadId: upload.id,
          date: day(t.date),
          amount: t.amount,
          currency: t.currency,
          rawLabel: encrypt(t.rawLabel),
          source: t.source,
          merchant: encryptOptional(t.merchant),
          plan: encryptOptional(t.plan),
          frequency: t.frequency ?? null,
          isTrial: t.isTrial ?? false,
        })),
      });
    }
    return upload;
  });
}

export async function loadTransactions(sessionId: string): Promise<NormalizedTransaction[]> {
  const rows = await prisma.transaction.findMany({ where: { sessionId }, orderBy: { date: "asc" } });
  return rows.map((r) => ({
    id: r.id,
    date: iso(r.date),
    amount: r.amount,
    currency: r.currency,
    rawLabel: decrypt(r.rawLabel),
    source: r.source as Source,
    merchant: decryptOptional(r.merchant),
    plan: decryptOptional(r.plan),
    frequency: (r.frequency as Frequency | null) ?? undefined,
    isTrial: r.isTrial,
  }));
}

async function loadDescriptors(sessionId: string): Promise<DescriptorEntry[]> {
  const rows = await prisma.descriptor.findMany({ where: { sessionId } });
  return rows.map((r) => ({ pattern: r.pattern, serviceName: r.serviceName, category: r.category ?? undefined, cancellationUrl: r.cancellationUrl ?? undefined }));
}

/** Re-runs the engine over everything the session uploaded and replaces the stored results. */
export async function recompute(sessionId: string) {
  const [txs, userDescriptors, previous] = await Promise.all([
    loadTransactions(sessionId),
    loadDescriptors(sessionId),
    prisma.subscription.findMany({ where: { sessionId }, select: { labelKey: true, usage: true } }),
  ]);
  const usage = Object.fromEntries(previous.filter((p) => p.usage).map((p) => [p.labelKey, p.usage as Usage]));
  const { subscriptions, matches } = analyze(txs, { userDescriptors, usage });

  await prisma.$transaction([
    prisma.match.deleteMany({ where: { sessionId } }),
    prisma.subscription.deleteMany({ where: { sessionId } }),
    prisma.match.createMany({
      data: matches.map((m) => ({ sessionId, bankTransactionId: m.bankTransactionId, intermediaryTransactionId: m.intermediaryTransactionId, confidence: m.confidence, candidateCount: m.candidateCount })),
    }),
    prisma.subscription.createMany({
      data: subscriptions.map((s) => ({
        sessionId,
        serviceName: s.serviceName,
        category: s.category ?? null,
        frequency: s.frequency,
        averageAmount: s.averageAmount,
        currentAmount: s.currentAmount,
        currency: s.currency,
        yearlyCost: s.yearlyCost,
        firstSeen: day(s.firstSeen),
        lastSeen: day(s.lastSeen),
        status: s.status,
        confidence: s.confidence,
        usage: s.usage ?? null,
        labelKey: s.key,
        details: encrypt(JSON.stringify({
          forgottenReasons: s.forgottenReasons,
          bundle: s.bundle,
          includedIn: s.includedIn,
          cancellationUrl: s.cancellationUrl,
          priceChanges: s.priceChanges,
          missedPayments: s.missedPayments,
          needsLabel: s.needsLabel,
          matchedSources: s.matchedSources,
          merchant: s.merchant,
          chargeCount: s.transactions.length,
        })),
      })),
    }),
  ]);
  return { subscriptions: subscriptions.length, matches: matches.length };
}

export type StoredSubscription = Omit<DetectedSubscription, "transactions" | "key"> & { id: string; key: string; chargeCount: number };

export async function listSubscriptions(sessionId: string): Promise<StoredSubscription[]> {
  const rows = await prisma.subscription.findMany({ where: { sessionId }, orderBy: { yearlyCost: "desc" } });
  return rows.map((r) => {
    const d = JSON.parse(decrypt(r.details));
    return {
      id: r.id,
      key: r.labelKey,
      serviceName: r.serviceName,
      category: r.category ?? undefined,
      frequency: r.frequency as Frequency,
      averageAmount: r.averageAmount,
      currentAmount: r.currentAmount,
      currency: r.currency,
      yearlyCost: r.yearlyCost,
      firstSeen: iso(r.firstSeen),
      lastSeen: iso(r.lastSeen),
      status: r.status as Status,
      confidence: r.confidence,
      usage: (r.usage as Usage | null) ?? undefined,
      ...d,
    };
  });
}

export async function getReport(sessionId: string): Promise<Report<StoredSubscription> & { uploads: number }> {
  const subs = await listSubscriptions(sessionId);
  const uploads = await prisma.upload.count({ where: { sessionId } });
  return { ...buildReport(subs), uploads };
}

/** Row ids change on every recompute, so answers are keyed by the subscription's label key. */
export async function setUsage(sessionId: string, labelKey: string, usage: Usage) {
  const { count } = await prisma.subscription.updateMany({ where: { labelKey, sessionId }, data: { usage } });
  if (count === 0) throw new Error("Subscription not found");
  await recompute(sessionId);
}

/** Saves the user's answer to "what is this charge?" so the label is known from now on. */
export async function saveLabel(sessionId: string, labelKey: string, serviceName: string, cancellationUrl?: string) {
  const d = descriptorFromAnswer(labelKey, serviceName, cancellationUrl);
  await prisma.descriptor.upsert({
    where: { sessionId_pattern: { sessionId, pattern: d.pattern } },
    create: { sessionId, pattern: d.pattern, serviceName: d.serviceName, category: d.category ?? null, cancellationUrl: d.cancellationUrl ?? null },
    update: { serviceName: d.serviceName, category: d.category ?? null, cancellationUrl: d.cancellationUrl ?? null },
  });
  await recompute(sessionId);
}

/** "Delete everything": every row of this session, in every table. */
export async function deleteEverything(sessionId: string) {
  await prisma.$transaction([
    prisma.match.deleteMany({ where: { sessionId } }),
    prisma.subscription.deleteMany({ where: { sessionId } }),
    prisma.transaction.deleteMany({ where: { sessionId } }),
    prisma.upload.deleteMany({ where: { sessionId } }),
    prisma.descriptor.deleteMany({ where: { sessionId } }),
  ]);
}

/** Removes sessions whose last upload is older than the retention period. */
export async function purgeExpired(now = new Date()) {
  const cutoff = new Date(now.getTime() - RETENTION_DAYS * 86_400_000);
  const recent = await prisma.upload.findMany({ where: { uploadedAt: { gte: cutoff } }, select: { sessionId: true }, distinct: ["sessionId"] });
  const stale = await prisma.upload.findMany({
    where: { uploadedAt: { lt: cutoff }, sessionId: { notIn: recent.map((r) => r.sessionId) } },
    select: { sessionId: true },
    distinct: ["sessionId"],
  });
  for (const { sessionId } of stale) await deleteEverything(sessionId);
  return stale.length;
}
