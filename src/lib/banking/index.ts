import type { BankAccess, BankRead, Institution, PsuContext } from "./types";
import type { NormalizedTransaction } from "../types";
import { EnableBanking, enableBankingConfigured } from "./enable-banking";
import { DEMO_BANK, demoEnabled, demoRefresh, demoTransactions } from "./demo";

export type { BankAccess, Institution } from "./types";
export { psuHeaders } from "./types";
export { DEMO_BANK } from "./demo";

/** History asked for, longest first: many banks (Crédit Mutuel) share 90 days only. */
export const HISTORY_DAYS = [730, 395, 89];
/** How long a watched access stays open (most banks allow 90 to 180 days under PSD2). */
export const WATCH_DAYS = 90;

export function bankingConfigured(): boolean {
  return enableBankingConfigured() || demoEnabled();
}

export async function listInstitutions(country: string): Promise<Institution[]> {
  const real = enableBankingConfigured() ? await new EnableBanking().listInstitutions(country) : [];
  return [...(demoEnabled() ? [DEMO_BANK] : []), ...real.sort((a, b) => a.name.localeCompare(b.name))];
}

const isDemo = (i: Institution) => i.name === DEMO_BANK.name && i.country === DEMO_BANK.country;

export async function startConnection(institution: Institution, redirectUrl: string, state: string, psu?: PsuContext, watch = false): Promise<string> {
  if (isDemo(institution)) {
    if (!demoEnabled()) throw new Error("Demo bank disabled");
    return `${redirectUrl}?code=demo&state=${encodeURIComponent(state)}`;
  }
  if (!enableBankingConfigured()) throw new Error("No bank connection provider configured");
  return (await new EnableBanking().start({ institution, redirectUrl, state, psu, keepDays: watch ? WATCH_DAYS : 0 })).url;
}

export const providerOf = (institution: Institution) => (isDemo(institution) ? "demo" : "enable-banking");

export async function finishConnection(institution: Institution, code: string, today: string, psu?: PsuContext, watch = false): Promise<BankRead> {
  if (isDemo(institution)) return { ...demoTransactions(today), access: watch ? { session: "demo", accounts: ["demo"] } : undefined };
  const since = HISTORY_DAYS.map((days) => new Date(Date.parse(`${today}T00:00:00Z`) - days * 86_400_000).toISOString().slice(0, 10));
  return new EnableBanking().finish({ code, since, psu, keep: watch });
}

/** The nightly read of a watched access, from `since` (a few days before the last read). */
export async function readAgain(provider: string, access: BankAccess, since: string, today: string): Promise<NormalizedTransaction[]> {
  if (provider === "demo") return demoRefresh(today);
  return new EnableBanking().read(access, since);
}

/** Stops a watch: the access is deleted at the provider. */
export async function closeAccess(provider: string, access: BankAccess): Promise<void> {
  if (provider === "demo" || !enableBankingConfigured()) return;
  await new EnableBanking().close(access.session);
}
