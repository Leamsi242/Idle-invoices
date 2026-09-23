import { prisma } from "./db";
import { decrypt, decryptOptional, encrypt, encryptOptional } from "./crypto";
import type { DescriptorEntry, DetectedSubscription, Frequency, NormalizedTransaction, Source, Status, Usage } from "./types";
import { analyze } from "./engine/pipeline";
import { buildReport, type Report } from "./engine/flags";
import { descriptorFromAnswer, findDescriptor } from "./engine/descriptors";
import { maskSensitive } from "./mask";
import { upcomingTrials, type UpcomingTrial } from "./engine/trials";

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
    const upload = await db.upload.create({ data: { sessionId, sourceType: source, fileName: maskSensitive(fileName).slice(0, 200), deletedAt: new Date() } });
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
          channel: s.channel,
          trialCharge: s.trialCharge,
          totalPaid: s.totalPaid,
          nextCharge: s.nextCharge,
          isNew: s.isNew,
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

export type ReportTrial = UpcomingTrial & { id?: string; tracked: boolean };

export async function getReport(sessionId: string, today = new Date().toISOString().slice(0, 10)): Promise<Report<StoredSubscription> & { uploads: number; trials: ReportTrial[] }> {
  const [subs, uploads, txs, tracked] = await Promise.all([
    listSubscriptions(sessionId),
    prisma.upload.count({ where: { sessionId } }),
    loadTransactions(sessionId),
    listTrackedTrials(sessionId),
  ]);
  const found: ReportTrial[] = upcomingTrials(txs, today).map((t) => ({ ...t, tracked: false }));
  const trials = [...tracked.filter((t) => t.startsCharging >= today), ...found.filter((f) => !tracked.some((t) => t.serviceName === f.serviceName))]
    .sort((a, b) => a.startsCharging.localeCompare(b.startsCharging));
  return { ...buildReport(subs), uploads, trials };
}

// --- Free trials the user tracks by hand -------------------------------------------------

export interface TrialInput { serviceName: string; endsOn: string; priceAfter?: number; currency?: string; frequency?: Frequency }

export async function addTrackedTrial(sessionId: string, t: TrialInput) {
  return prisma.trackedTrial.create({
    data: {
      sessionId,
      serviceName: encrypt(t.serviceName.trim().slice(0, 100)),
      endsOn: day(t.endsOn),
      priceAfter: t.priceAfter ?? null,
      currency: t.currency ?? "EUR",
      frequency: t.frequency ?? null,
    },
  });
}

export async function listTrackedTrials(sessionId: string): Promise<ReportTrial[]> {
  const rows = await prisma.trackedTrial.findMany({ where: { sessionId }, orderBy: { endsOn: "asc" } });
  return rows.map((r) => {
    const serviceName = decrypt(r.serviceName);
    const d = findDescriptor([serviceName]);
    return {
      id: r.id,
      tracked: true,
      serviceName: d?.serviceName ?? serviceName,
      amount: r.priceAfter ?? 0,
      currency: r.currency,
      frequency: (r.frequency as Frequency | null) ?? undefined,
      startsCharging: iso(r.endsOn),
      cancellationUrl: d?.cancellationUrl,
    };
  });
}

export async function removeTrackedTrial(sessionId: string, id: string) {
  await prisma.trackedTrial.deleteMany({ where: { id, sessionId } });
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
    prisma.trackedTrial.deleteMany({ where: { sessionId } }),
  ]);
}

/** Removes sessions whose last upload is older than the retention period. */
export async function purgeExpired(now = new Date()) {
  const cutoff = new Date(now.getTime() - RETENTION_DAYS * 86_400_000);
  const recent = await prisma.upload.findMany({ where: { uploadedAt: { gte: cutoff } }, select: { sessionId: true }, distinct: ["sessionId"] });
  // Tracked trials count as activity too, and expire 30 days after their end date.
  await prisma.trackedTrial.deleteMany({ where: { endsOn: { lt: cutoff } } });
  const stale = await prisma.upload.findMany({
    where: { uploadedAt: { lt: cutoff }, sessionId: { notIn: recent.map((r) => r.sessionId) } },
    select: { sessionId: true },
    distinct: ["sessionId"],
  });
  for (const { sessionId } of stale) await deleteEverything(sessionId);
  return stale.length;
}
