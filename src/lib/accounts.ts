import { randomBytes, randomUUID } from "node:crypto";
import { prisma } from "./db";
import { decrypt, encrypt, lookupHash } from "./crypto";
import { emailConfigured } from "./notify";
import { deleteEverything, sessionHasData } from "./store";
import { ACCOUNT_DICTS } from "./i18n-account";
import { cancelAllSubscriptions } from "./billing";
import type { Locale } from "./i18n";

/**
 * Accounts without a password: a sign-in link sent by e-mail. An account ties one address to one
 * session id; signing in on another browser puts that session id in its cookie, so every table
 * keeps working by session as before. Only the hash of a link's token is stored, and a link
 * works once, for 15 minutes.
 */
export const LINK_MINUTES = 15;
/** Accounts nobody signed in to for this long are deleted, with their data. */
export const ACCOUNT_IDLE_DAYS = 365;

const EMAIL = /^[^\s@<>()",;:]+@[^\s@<>()",;:]+\.[^\s@<>()",;:]{2,}$/;

/** The address as it is compared: trimmed and lower-cased; null when it does not look like one. */
export function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  return email.length <= 254 && EMAIL.test(email) ? email : null;
}

const emailKey = (email: string) => lookupHash(`email:${email}`);
const tokenKey = (token: string) => lookupHash(`token:${token}`);

/** "ismael@example.com" -> "is••••@example.com", to show which address is signed in without printing it whole. */
export function maskEmail(email: string): string {
  const [user, domain] = email.split("@");
  return `${user.slice(0, Math.min(2, user.length))}••••@${domain}`;
}

export interface LoginRequest {
  email: string;
  appUrl: string;
  locale: Locale;
  now?: Date;
  send?: typeof fetch;
}

/**
 * Creates a sign-in link and e-mails it. Returns the link only when no e-mail service is set up
 * outside production, so it can be tried locally; otherwise the caller says the same thing
 * whether the address has an account or not.
 */
export async function requestLogin({ email, appUrl, locale, now = new Date(), send = fetch }: LoginRequest): Promise<{ sent: boolean; devLink?: string }> {
  const token = randomBytes(32).toString("base64url");
  const emailHash = emailKey(email);
  // One live link per address: a new request replaces the previous one.
  await prisma.loginToken.deleteMany({ where: { emailHash, usedAt: null } });
  await prisma.loginToken.create({
    data: { tokenHash: tokenKey(token), emailHash, email: encrypt(email), expiresAt: new Date(now.getTime() + LINK_MINUTES * 60_000) },
  });
  // The token travels after "#": browsers do not send it to the server or in the Referer header.
  const link = `${appUrl.replace(/\/$/, "")}/account/confirm#t=${token}`;
  if (!emailConfigured()) return process.env.NODE_ENV === "production" ? { sent: false } : { sent: false, devLink: link };
  const t = ACCOUNT_DICTS[locale];
  const res = await send("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: process.env.ALERT_FROM, to: [email], subject: t.mailSubject, text: t.mailBody(link) }),
  });
  return { sent: res.ok };
}

async function liveToken(token: string, now: Date) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  const row = await prisma.loginToken.findUnique({ where: { tokenHash: tokenKey(token) } });
  return row && !row.usedAt && row.expiresAt > now ? row : null;
}

export type LoginOutcome = "new" | "adopt" | "replace" | "same";

/**
 * What signing in would do to this browser's data, without using the link:
 * "new" (a new account keeps this browser's data), "adopt" (the account was empty and takes this
 * browser's data), "replace" (both hold data: this browser's is erased), "same" (nothing moves).
 */
export async function previewLogin(token: string, currentSession: string | null, now = new Date()): Promise<LoginOutcome | null> {
  const row = await liveToken(token, now);
  if (!row) return null;
  return outcome(row.emailHash, currentSession);
}

async function outcome(emailHash: string, current: string | null): Promise<LoginOutcome> {
  const account = await prisma.account.findUnique({ where: { emailHash } });
  const ownedElsewhere = current ? !!(await prisma.account.findFirst({ where: { sessionId: current, NOT: { emailHash } } })) : false;
  // Another account's session is never taken over: the new sign-in starts from that account's own data.
  const anonymousData = !!current && !ownedElsewhere && (await sessionHasData(current));
  if (!account) return "new";
  if (current === account.sessionId || !anonymousData) return "same";
  return (await sessionHasData(account.sessionId)) ? "replace" : "adopt";
}

/**
 * Uses the link (once) and returns the session id the browser must carry from now on.
 * A browser signed in to another account, or without a session, gets the account's own session.
 */
export async function verifyLogin(token: string, currentSession: string | null, now = new Date()): Promise<{ sessionId: string; outcome: LoginOutcome } | null> {
  const row = await liveToken(token, now);
  if (!row) return null;
  // Marked used before anything else, so two clicks at once cannot both sign in.
  const { count } = await prisma.loginToken.updateMany({ where: { id: row.id, usedAt: null }, data: { usedAt: now } });
  if (count !== 1) return null;
  const result = await outcome(row.emailHash, currentSession);
  const ownedElsewhere = currentSession ? !!(await prisma.account.findFirst({ where: { sessionId: currentSession, NOT: { emailHash: row.emailHash } } })) : false;
  const keep = currentSession && !ownedElsewhere ? currentSession : null;

  if (result === "new") {
    const account = await prisma.account.create({ data: { emailHash: row.emailHash, email: row.email, sessionId: keep ?? randomUUID(), lastLoginAt: now } });
    return { sessionId: account.sessionId, outcome: result };
  }
  const account = (await prisma.account.findUnique({ where: { emailHash: row.emailHash } }))!;
  if (result === "adopt" && keep) {
    // The account had nothing yet: it takes this browser's session and its data.
    await deleteEverything(account.sessionId);
    await prisma.account.update({ where: { id: account.id }, data: { sessionId: keep, lastLoginAt: now } });
    return { sessionId: keep, outcome: result };
  }
  if (result === "replace" && keep) await deleteEverything(keep);
  await prisma.account.update({ where: { id: account.id }, data: { lastLoginAt: now } });
  return { sessionId: account.sessionId, outcome: result };
}

export interface AccountView {
  id: string;
  email: string;
  plan: string;
  createdAt: string;
  stripeCustomerId: string | null;
  subscriptionStatus: string | null;
  premiumUntil: string | null;
}

export async function getAccount(sessionId: string | null): Promise<AccountView | null> {
  if (!sessionId) return null;
  const a = await prisma.account.findUnique({ where: { sessionId } });
  return a
    ? {
        id: a.id,
        email: decrypt(a.email),
        plan: a.plan,
        createdAt: a.createdAt.toISOString().slice(0, 10),
        stripeCustomerId: a.stripeCustomerId,
        subscriptionStatus: a.subscriptionStatus,
        premiumUntil: a.premiumUntil?.toISOString().slice(0, 10) ?? null,
      }
    : null;
}

/**
 * The account, its pending links and every row of its session. A paying account's subscription
 * is stopped at Stripe first: if Stripe cannot be reached, nothing is deleted (the error goes up),
 * so nobody keeps paying for an account that is gone.
 */
export async function deleteAccount(sessionId: string, f: typeof fetch = fetch) {
  const a = await prisma.account.findUnique({ where: { sessionId } });
  if (a?.stripeCustomerId) await cancelAllSubscriptions(a.stripeCustomerId, f);
  await deleteEverything(sessionId);
  if (!a) return;
  await prisma.loginToken.deleteMany({ where: { emailHash: a.emailHash } });
  await prisma.account.delete({ where: { id: a.id } });
}

/** Spent and expired links, and accounts nobody used for a year (never one still paying). */
export async function purgeAccounts(now = new Date()) {
  await prisma.loginToken.deleteMany({ where: { OR: [{ expiresAt: { lt: now } }, { usedAt: { not: null } }] } });
  const idle = new Date(now.getTime() - ACCOUNT_IDLE_DAYS * 86_400_000);
  const stale = await prisma.account.findMany({
    where: { plan: "free", OR: [{ lastLoginAt: { lt: idle } }, { lastLoginAt: null, createdAt: { lt: idle } }] },
    select: { sessionId: true },
  });
  for (const { sessionId } of stale) await deleteAccount(sessionId);
  return stale.length;
}
