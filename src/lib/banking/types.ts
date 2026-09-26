import type { NormalizedTransaction } from "../types";

/** A bank the user can connect (an ASPSP in PSD2 terms). */
export interface Institution { name: string; country: string }

/**
 * Read-only bank connection through a licensed PSD2 account information provider. The user
 * signs in on their bank's own page: we never see a password, and the access can only read.
 * One connection is used once: we read the transactions, then close the access.
 */
export interface BankProvider {
  id: string;
  listInstitutions(country: string): Promise<Institution[]>;
  /** Returns the bank's sign-in page, and what we need to remember until the user comes back. */
  start(opts: { institution: Institution; redirectUrl: string; state: string; psu?: PsuContext; keepDays?: number }): Promise<{ url: string }>;
  /**
   * Called on the way back: reads every account of the connection, then closes the access. The
   * first date the bank accepts is used (`since` lists them, oldest first): many banks share
   * 90 days only.
   */
  finish(opts: { code: string; since: string[]; psu?: PsuContext; keep?: boolean }): Promise<BankRead>;
}

/**
 * The user's browser, passed on while they are present: banks list the "PSU" headers they
 * require (Crédit Mutuel among others) and rate-limit reads made without them.
 */
export type PsuContext = Record<string, string>;

/** PSU headers from the user's request: IP address, user agent, accept headers, referer. */
export function psuHeaders(req: Request): PsuContext {
  const h: PsuContext = {};
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || undefined;
  if (ip) h["psu-ip-address"] = ip;
  for (const [from, to] of [["user-agent", "psu-user-agent"], ["accept", "psu-accept"], ["accept-language", "psu-accept-language"], ["accept-encoding", "psu-accept-encoding"], ["referer", "psu-referer"]]) {
    const v = req.headers.get(from);
    if (v) h[to] = v.slice(0, 500);
  }
  return h;
}

export interface BankRead {
  accounts: number;
  transactions: NormalizedTransaction[];
  /** When the access is kept to watch the account: what is needed to read it again. */
  access?: BankAccess;
  /** Lines the bank sent and why some were left out, to explain an empty read. */
  stats?: { raw: number; pending: number; skipped: number; fields: string[] };
}

/** A kept access: the provider's session and the accounts the user shared. */
export interface BankAccess { session: string; accounts: string[] }
