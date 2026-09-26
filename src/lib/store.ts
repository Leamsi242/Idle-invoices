import { prisma } from "./db";
import { decrypt, decryptOptional, encrypt, encryptOptional } from "./crypto";
import type { DescriptorEntry, DetectedSubscription, Frequency, NormalizedTransaction, Source, Status, Usage } from "./types";
import { analyze } from "./engine/pipeline";
import { buildReport, type Report } from "./engine/flags";
import { descriptorFromAnswer, findDescriptor } from "./engine/descriptors";
import { maskSensitive } from "./mask";
import { upcomingTrials, type UpcomingTrial } from "./engine/trials";
import { reconcile } from "./engine/reconcile";
import { findDoubts, type Connections, type Doubt } from "./doubts";
import type { Locale } from "./i18n";
import { diffSubscriptions, type Change } from "./engine/changes";
import { closeAccess, readAgain, type BankAccess } from "./banking";
import { sendAlertEmail } from "./notify";
import { buildPlan, collectFacts, EMPTY_ANSWERS, sanitizeAnswers, type Answers, type Facts, type PlanItem } from "./onboarding";

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
          isCancellation: t.isCancellation ?? false,
          nextChargeDate: t.nextChargeDate ? day(t.nextChargeDate) : null,
          nextChargeAmount: t.nextChargeAmount ?? null,
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
    uploadId: r.uploadId,
    date: iso(r.date),
    amount: r.amount,
    currency: r.currency,
    rawLabel: decrypt(r.rawLabel),
    source: r.source as Source,
    merchant: decryptOptional(r.merchant),
    plan: decryptOptional(r.plan),
    frequency: (r.frequency as Frequency | null) ?? undefined,
    isTrial: r.isTrial,
    isCancellation: r.isCancellation,
    nextChargeDate: r.nextChargeDate ? iso(r.nextChargeDate) : undefined,
    nextChargeAmount: r.nextChargeAmount ?? undefined,
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
  const { subscriptions, matches } = analyze(txs, { userDescriptors, usage, today: new Date().toISOString().slice(0, 10) });

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
          cancelledOn: s.cancelledOn,
          endsOn: s.endsOn,
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
      kind: "trial" as const,
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

/** "Delete everything": every row of this session, in every table, and any bank access kept open. */
export async function deleteEverything(sessionId: string) {
  for (const link of await prisma.bankLink.findMany({ where: { sessionId } })) await closeLink(link);
  await prisma.$transaction([
    prisma.bankLink.deleteMany({ where: { sessionId } }),
    prisma.alert.deleteMany({ where: { sessionId } }),
    prisma.match.deleteMany({ where: { sessionId } }),
    prisma.subscription.deleteMany({ where: { sessionId } }),
    prisma.transaction.deleteMany({ where: { sessionId } }),
    prisma.upload.deleteMany({ where: { sessionId } }),
    prisma.descriptor.deleteMany({ where: { sessionId } }),
    prisma.trackedTrial.deleteMany({ where: { sessionId } }),
    prisma.profile.deleteMany({ where: { sessionId } }),
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
  // Answers without any recent upload expire too.
  await prisma.profile.deleteMany({ where: { updatedAt: { lt: cutoff }, sessionId: { notIn: recent.map((r) => r.sessionId) } } });
  return stale.length;
}

// --- Onboarding ---------------------------------------------------------------------------

export async function getAnswers(sessionId: string): Promise<Answers | null> {
  const row = await prisma.profile.findUnique({ where: { sessionId } });
  if (!row) return null;
  try {
    return sanitizeAnswers(JSON.parse(decrypt(row.answers)));
  } catch {
    return null;
  }
}

export async function saveAnswers(sessionId: string, input: unknown): Promise<Answers> {
  const answers = sanitizeAnswers(input);
  const data = encrypt(JSON.stringify(answers));
  await prisma.profile.upsert({ where: { sessionId }, create: { sessionId, answers: data }, update: { answers: data } });
  return answers;
}

/** Ticks or unticks one checklist item. */
export async function setItemDone(sessionId: string, itemId: string, done: boolean): Promise<Answers> {
  const current = (await getAnswers(sessionId)) ?? EMPTY_ANSWERS;
  const set = new Set(current.done);
  if (done) set.add(itemId);
  else set.delete(itemId);
  return saveAnswers(sessionId, { ...current, done: [...set] });
}

export interface Onboarding { answers: Answers | null; facts: Facts; plan: PlanItem[] }

export async function getOnboarding(sessionId: string | null): Promise<Onboarding> {
  const [answers, txs] = sessionId ? await Promise.all([getAnswers(sessionId), loadTransactions(sessionId)]) : [null, []];
  const explained = new Set(reconcile(txs).map((m) => m.bankTransactionId));
  const facts = collectFacts(txs, explained);
  return { answers, facts, plan: buildPlan(answers ?? EMPTY_ANSWERS, facts) };
}

// --- Connections and doubts ---------------------------------------------------------------

/** What the session has connected: banks and mailboxes read through an API, and manual files. */
export async function getConnections(sessionId: string | null): Promise<Connections> {
  if (!sessionId) return { banks: [], mailboxes: [], files: 0 };
  const uploads = await prisma.upload.findMany({ where: { sessionId }, select: { fileName: true, sourceType: true }, orderBy: { uploadedAt: "asc" } });
  const banks = new Set<string>();
  const mailboxes = new Set<string>();
  let files = 0;
  for (const { fileName, sourceType } of uploads) {
    const bank = fileName.match(/^Bank connection: (.+?) \(\d+ accounts?\)$/)?.[1];
    const mail = fileName.match(/^(Gmail|Outlook) scan\b/)?.[1];
    if (bank) banks.add(bank);
    else if (mail) mailboxes.add(mail);
    else {
      files++;
      // Receipts added by hand answer the same questions as a mailbox scan.
      if (sourceType === "email") mailboxes.add("Receipts");
    }
  }
  return { banks: [...banks], mailboxes: [...mailboxes], files };
}

export async function getDoubts(sessionId: string, locale: Locale = "en"): Promise<Doubt[]> {
  const [subs, onboarding, connections] = await Promise.all([listSubscriptions(sessionId), getOnboarding(sessionId), getConnections(sessionId)]);
  return findDoubts(subs, onboarding.facts, connections, locale);
}

// --- Watching: a bank access kept open and read again every night --------------------------------

type LinkRow = { id: string; sessionId: string; provider: string; institution: string; access: string; alertEmail: string | null; locale: string; validUntil: Date; lastReadAt: Date };

async function closeLink(link: LinkRow) {
  try {
    await closeAccess(link.provider, JSON.parse(decrypt(link.access)) as BankAccess);
  } catch {
    // Already closed or expired at the provider: nothing left to revoke.
  }
}

export interface WatchInfo { id: string; institution: string; validUntil: string; lastReadAt: string; hasEmail: boolean }

export async function saveWatch(sessionId: string, w: { provider: string; institution: string; access: BankAccess; locale: Locale; days: number }) {
  const now = new Date();
  return prisma.bankLink.create({
    data: {
      sessionId,
      provider: w.provider,
      institution: encrypt(w.institution),
      access: encrypt(JSON.stringify(w.access)),
      locale: w.locale,
      validUntil: new Date(now.getTime() + w.days * 86_400_000),
      lastReadAt: now,
    },
  });
}

export async function listWatches(sessionId: string | null): Promise<WatchInfo[]> {
  if (!sessionId) return [];
  const rows = await prisma.bankLink.findMany({ where: { sessionId }, orderBy: { createdAt: "asc" } });
  return rows.map((r) => ({ id: r.id, institution: decrypt(r.institution), validUntil: iso(r.validUntil), lastReadAt: iso(r.lastReadAt), hasEmail: !!r.alertEmail }));
}

export async function setWatchEmail(sessionId: string, id: string, email: string | null) {
  const { count } = await prisma.bankLink.updateMany({ where: { id, sessionId }, data: { alertEmail: email ? encrypt(email) : null } });
  if (!count) throw new Error("Unknown watch");
}

export async function stopWatch(sessionId: string, id: string) {
  const link = await prisma.bankLink.findFirst({ where: { id, sessionId } });
  if (!link) return;
  await closeLink(link);
  await prisma.bankLink.delete({ where: { id } });
}

/** Reads a watched account again, re-analyses, and records what changed. */
export async function refreshWatch(link: LinkRow, now = new Date(), appUrl = ""): Promise<Change[]> {
  const today = iso(now);
  const since = iso(new Date(link.lastReadAt.getTime() - 7 * 86_400_000));
  const access = JSON.parse(decrypt(link.access)) as BankAccess;
  const transactions = await readAgain(link.provider, access, since, today);
  const before = await listSubscriptions(link.sessionId);
  await saveUpload(link.sessionId, `Bank connection: ${decrypt(link.institution)} (${access.accounts.length} account${access.accounts.length === 1 ? "" : "s"})`, "bank", transactions);
  await recompute(link.sessionId);
  const changes = diffSubscriptions(before, await listSubscriptions(link.sessionId));
  if (changes.length) await prisma.alert.createMany({ data: changes.map((c) => ({ sessionId: link.sessionId, kind: c.kind, details: encrypt(JSON.stringify(c)) })) });
  await prisma.bankLink.update({ where: { id: link.id }, data: { lastReadAt: now } });
  if (changes.length && link.alertEmail) await sendAlertEmail(decrypt(link.alertEmail), changes, link.locale === "en" ? "en" : "fr", appUrl).catch(() => false);
  return changes;
}

/** The nightly job: every watch still valid is read again; expired ones are closed. */
export async function refreshAllWatches(now = new Date(), appUrl = "") {
  let read = 0;
  let changes = 0;
  let failed = 0;
  for (const link of await prisma.bankLink.findMany()) {
    if (link.validUntil <= now) {
      await closeLink(link);
      await prisma.bankLink.delete({ where: { id: link.id } });
      continue;
    }
    try {
      changes += (await refreshWatch(link, now, appUrl)).length;
      read++;
    } catch {
      failed++; // the bank refused this time (consent revoked, rate limit): tried again tomorrow
    }
  }
  return { read, changes, failed };
}

export interface StoredAlert { id: string; change: Change; createdAt: string }

export async function listAlerts(sessionId: string): Promise<StoredAlert[]> {
  const rows = await prisma.alert.findMany({ where: { sessionId, seenAt: null }, orderBy: { createdAt: "desc" }, take: 20 });
  return rows.map((r) => ({ id: r.id, change: JSON.parse(decrypt(r.details)) as Change, createdAt: iso(r.createdAt) }));
}

export async function dismissAlerts(sessionId: string) {
  await prisma.alert.updateMany({ where: { sessionId, seenAt: null }, data: { seenAt: new Date() } });
}
