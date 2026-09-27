import { cookies } from "next/headers";
import { createHash } from "node:crypto";
import { prisma } from "./db";
import { inDemo } from "./demo-mode";

/**
 * Closed beta rules. Everything the app pays for, or that a provider limits, goes through here
 * before it starts: a real bank connection, a mailbox scan, a file or screenshot upload, a nightly
 * watch. Counts come from the database (not memory), so they hold across server instances.
 * The demo is never limited: it uses no provider.
 */
export const BETA_COOKIE = "sd_beta";
export const OWNER_COOKIE = "sd_owner";

const num = (v: string | undefined, fallback: number) => {
  const n = Number(v);
  return v !== undefined && v !== "" && Number.isFinite(n) && n >= 0 ? n : fallback;
};

export function betaRules() {
  return {
    /** Invitation code asked once per browser before any real connection. Empty: no code. */
    code: process.env.BETA_ACCESS_CODE?.trim() ?? "",
    /** Browsers that may connect real data. The Google OAuth "testing" status allows 100 test users. */
    maxTesters: num(process.env.BETA_MAX_TESTERS, 100),
    /** Per tester, over 24 hours. */
    bankPerDay: num(process.env.BETA_BANK_CONNECTIONS_PER_DAY, 3),
    uploadsPerDay: num(process.env.BETA_UPLOADS_PER_DAY, 30),
    screenshotsPerDay: num(process.env.BETA_SCREENSHOTS_PER_DAY, 5),
    /** For everyone, per calendar month: screenshots are the only per-use cost (Claude API). */
    screenshotsPerMonth: num(process.env.BETA_SCREENSHOTS_PER_MONTH, 200),
    /**
     * "owner": only the owner's browser connects banks and PayPal directly. Enable Banking's free
     * "restricted production" returns only accounts linked in the owner's Control Panel, so testers
     * import statements instead. "all" once a production contract is signed.
     */
    bankMode: process.env.BETA_BANK_MODE === "owner" ? ("owner" as const) : ("all" as const),
    /** Bank accounts watched every night at the same time (each keeps a consent open). */
    maxWatches: num(process.env.BETA_MAX_WATCHES, 100),
  };
}

export type BetaKind = "bank" | "mail" | "upload" | "screenshot" | "watch";
export type BetaRefusal = "demo" | "code" | "full" | "quota" | "watch" | "owner";

const DEMO_FILE = "%(test data)%";
const IMAGE = /\.(png|jpe?g|webp|gif)$/i;
const dayAgo = () => new Date(Date.now() - 86_400_000);
const monthStart = () => {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
};

export const codeToken = (code: string) => createHash("sha256").update(`sd-beta:${code}`).digest("base64url").slice(0, 32);

/** The owner's browser (it gave BETA_OWNER_CODE): no beta limit applies to it. */
export async function isOwner(): Promise<boolean> {
  const owner = process.env.BETA_OWNER_CODE?.trim();
  if (!owner) return false;
  return (await cookies()).get(OWNER_COOKIE)?.value === codeToken(`owner:${owner}`);
}

/** Whether this browser may connect a bank or PayPal directly. */
export async function bankOpenToMe(): Promise<boolean> {
  return betaRules().bankMode === "all" || (await isOwner());
}

/** Whether this browser gave the invitation code (always true when no code is set). */
export async function hasBetaAccess(): Promise<boolean> {
  const { code } = betaRules();
  if (!code || (await isOwner())) return true;
  return (await cookies()).get(BETA_COOKIE)?.value === codeToken(code);
}

/** Browsers that connected or imported real data, the demo left out. */
export async function testerCount(): Promise<number> {
  const rows = await prisma.upload.findMany({ where: { NOT: { fileName: { contains: "(test data)" } } }, distinct: ["sessionId"], select: { sessionId: true } });
  return rows.length;
}

async function isTester(sessionId: string): Promise<boolean> {
  return (await prisma.upload.count({ where: { sessionId, NOT: { fileName: { contains: "(test data)" } } } })) > 0;
}

/** null when the action may go ahead, otherwise why not. */
export async function betaCheck(kind: BetaKind, sessionId: string | null, opts: { files?: string[] } = {}): Promise<BetaRefusal | null> {
  const r = betaRules();
  if (await inDemo()) return "demo";
  if (await isOwner()) return null;
  if ((kind === "bank" || kind === "watch") && r.bankMode === "owner") return "owner";
  if (!(await hasBetaAccess())) return "code";
  if (sessionId && !(await isTester(sessionId)) && (await testerCount()) >= r.maxTesters) return "full";
  if (!sessionId) return (await testerCount()) >= r.maxTesters ? "full" : null;
  const since = dayAgo();
  if (kind === "bank") {
    const n = await prisma.upload.count({ where: { sessionId, uploadedAt: { gte: since }, fileName: { startsWith: "Bank connection:" }, NOT: { fileName: { contains: "(test data)" } } } });
    if (n >= r.bankPerDay) return "quota";
  }
  if (kind === "upload" || kind === "screenshot") {
    const n = await prisma.upload.count({ where: { sessionId, uploadedAt: { gte: since }, NOT: [{ fileName: { startsWith: "Bank connection:" } }, { fileName: { contains: "scan (" } }] } });
    if (n + (opts.files?.length ?? 1) > r.uploadsPerDay) return "quota";
  }
  const images = (opts.files ?? []).filter((f) => IMAGE.test(f)).length;
  if (kind === "screenshot" && images > 0) {
    const [mine, all] = await Promise.all([
      prisma.upload.findMany({ where: { sessionId, uploadedAt: { gte: since } }, select: { fileName: true } }),
      prisma.upload.findMany({ where: { uploadedAt: { gte: monthStart() } }, select: { fileName: true } }),
    ]);
    if (mine.filter((u) => IMAGE.test(u.fileName)).length + images > r.screenshotsPerDay) return "quota";
    if (all.filter((u) => IMAGE.test(u.fileName)).length + images > r.screenshotsPerMonth) return "quota";
  }
  if (kind === "watch") {
    const n = await prisma.bankLink.count({ where: { validUntil: { gt: new Date() }, provider: { not: "demo" } } });
    if (n >= r.maxWatches) return "watch";
  }
  return null;
}

/** A snapshot for the owner: how much of the beta is used (GET /api/beta/usage with the cron secret). */
export async function betaUsage() {
  const r = betaRules();
  const [testers, watches, monthUploads, bankToday] = await Promise.all([
    testerCount(),
    prisma.bankLink.count({ where: { validUntil: { gt: new Date() }, provider: { not: "demo" } } }),
    prisma.upload.findMany({ where: { uploadedAt: { gte: monthStart() }, NOT: { fileName: { contains: "(test data)" } } }, select: { fileName: true, sourceType: true } }),
    prisma.upload.count({ where: { uploadedAt: { gte: dayAgo() }, fileName: { startsWith: "Bank connection:" }, NOT: { fileName: { contains: "(test data)" } } } }),
  ]);
  return {
    rules: { ...r, code: r.code ? "set" : "none" },
    testers,
    activeWatches: watches,
    bankConnectionsLast24h: bankToday,
    thisMonth: {
      bankConnections: monthUploads.filter((u) => u.fileName.startsWith("Bank connection:")).length,
      mailScans: monthUploads.filter((u) => u.fileName.includes("scan (")).length,
      screenshots: monthUploads.filter((u) => IMAGE.test(u.fileName)).length,
      files: monthUploads.filter((u) => !u.fileName.startsWith("Bank connection:") && !u.fileName.includes("scan (")).length,
    },
  };
}
