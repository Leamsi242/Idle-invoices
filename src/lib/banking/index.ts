import type { BankAccess, BankRead, Institution, PsuContext } from "./types";
import type { NormalizedTransaction } from "../types";
import { EnableBanking, enableBankingConfigured, type AccountKind } from "./enable-banking";
import { DEMO_BANK, DEMO_PAYPAL, demoEnabled, demoPaypalTransactions, demoRefresh, demoTransactions } from "./demo";

export type { BankAccess, Institution } from "./types";
export { psuHeaders } from "./types";
export { DEMO_BANK, DEMO_PAYPAL } from "./demo";
export type { AccountKind } from "./enable-banking";

/** PayPal is connected like a bank (a PSD2 account), but its lines are PayPal payments. */
export const isPaypal = (institution: Institution | string) => /^(?:demo )?paypal\b/i.test(typeof institution === "string" ? institution : institution.name);
export const kindOf = (institution: Institution | string): AccountKind => (isPaypal(institution) ? "paypal" : "bank");

/** History asked for, longest first: many banks (Crédit Mutuel) share 90 days only. */
export const HISTORY_DAYS = [730, 395, 89];
/** How long a watched access stays open (most banks allow 90 to 180 days under PSD2). */
export { WATCH_DAYS } from "./cookie";
import { WATCH_DAYS } from "./cookie";

export function bankingConfigured(): boolean {
  return enableBankingConfigured() || demoEnabled();
}

export async function listInstitutions(country: string): Promise<Institution[]> {
  const real = enableBankingConfigured() ? await new EnableBanking().listInstitutions(country) : [];
  return [...(demoEnabled() ? [DEMO_BANK, DEMO_PAYPAL] : []), ...real.sort((a, b) => a.name.localeCompare(b.name))];
}

const isDemo = (i: Institution) => [DEMO_BANK, DEMO_PAYPAL].some((d) => i.name === d.name && i.country === d.country);

/**
 * The bank's sign-in page, and for how many days a watched access will last (the bank may allow
 * less than WATCH_DAYS).
 */
export async function startConnection(institution: Institution, redirectUrl: string, state: string, psu?: PsuContext, watch = false): Promise<{ url: string; days: number }> {
  if (isDemo(institution)) {
    if (!demoEnabled()) throw new Error("Demo bank disabled");
    return { url: `${redirectUrl}?code=demo&state=${encodeURIComponent(state)}`, days: WATCH_DAYS };
  }
  if (!enableBankingConfigured()) throw new Error("No bank connection provider configured");
  return new EnableBanking().start({ institution, redirectUrl, state, psu, keepDays: watch ? WATCH_DAYS : 0 });
}

export const providerOf = (institution: Institution) => (isDemo(institution) ? "demo" : "enable-banking");

export async function finishConnection(institution: Institution, code: string, today: string, psu?: PsuContext, watch = false): Promise<BankRead> {
  if (isDemo(institution)) {
    if (!demoEnabled()) throw new Error("Demo bank disabled");
    const read = isPaypal(institution) ? demoPaypalTransactions(today) : demoTransactions(today);
    return { ...read, access: watch ? { session: "demo", accounts: ["demo"] } : undefined };
  }
  const since = HISTORY_DAYS.map((days) => new Date(Date.parse(`${today}T00:00:00Z`) - days * 86_400_000).toISOString().slice(0, 10));
  return new EnableBanking().finish({ code, since, psu, keep: watch, kind: kindOf(institution) });
}

/** The nightly read of a watched access, from `since` (a few days before the last read). */
export async function readAgain(provider: string, access: BankAccess, since: string, today: string, institution: string): Promise<NormalizedTransaction[]> {
  if (provider === "demo" && !demoEnabled()) throw new Error("Demo bank disabled");
  if (provider === "demo") return isPaypal(institution) ? demoPaypalTransactions(today).transactions : demoRefresh(today);
  return new EnableBanking().read(access, since, kindOf(institution));
}

/**
 * The upload name of a connection read. getConnections reads it back, so it never changes:
 * "Bank connection: Crédit Mutuel (2 accounts)". PayPal reads are told apart by their source.
 */
export const connectionFileName = (institution: string, accounts: number) => `Bank connection: ${institution} (${accounts} account${accounts === 1 ? "" : "s"})`;

/** Stops a watch: the access is deleted at the provider. */
export async function closeAccess(provider: string, access: BankAccess): Promise<void> {
  if (provider === "demo" || !enableBankingConfigured()) return;
  await new EnableBanking().close(access.session);
}
