import type { BankRead, Institution, PsuContext } from "./types";
import { EnableBanking, enableBankingConfigured } from "./enable-banking";
import { DEMO_BANK, demoEnabled, demoTransactions } from "./demo";

export type { Institution } from "./types";
export { psuHeaders } from "./types";
export { DEMO_BANK } from "./demo";

/** History asked for, longest first: many banks (Crédit Mutuel) share 90 days only. */
export const HISTORY_DAYS = [730, 395, 89];

export function bankingConfigured(): boolean {
  return enableBankingConfigured() || demoEnabled();
}

export async function listInstitutions(country: string): Promise<Institution[]> {
  const real = enableBankingConfigured() ? await new EnableBanking().listInstitutions(country) : [];
  return [...(demoEnabled() ? [DEMO_BANK] : []), ...real.sort((a, b) => a.name.localeCompare(b.name))];
}

const isDemo = (i: Institution) => i.name === DEMO_BANK.name && i.country === DEMO_BANK.country;

export async function startConnection(institution: Institution, redirectUrl: string, state: string, psu?: PsuContext): Promise<string> {
  if (isDemo(institution)) {
    if (!demoEnabled()) throw new Error("Demo bank disabled");
    return `${redirectUrl}?code=demo&state=${encodeURIComponent(state)}`;
  }
  if (!enableBankingConfigured()) throw new Error("No bank connection provider configured");
  return (await new EnableBanking().start({ institution, redirectUrl, state, psu })).url;
}

export async function finishConnection(institution: Institution, code: string, today: string, psu?: PsuContext): Promise<BankRead> {
  if (isDemo(institution)) return demoTransactions(today);
  const since = HISTORY_DAYS.map((days) => new Date(Date.parse(`${today}T00:00:00Z`) - days * 86_400_000).toISOString().slice(0, 10));
  return new EnableBanking().finish({ code, since, psu });
}
