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
  start(opts: { institution: Institution; redirectUrl: string; state: string; psu?: PsuContext }): Promise<{ url: string }>;
  /** Called on the way back: reads every account of the connection since `since`, then closes the access. */
  finish(opts: { code: string; since: string; psu?: PsuContext }): Promise<BankRead>;
}

/** The user's browser, passed on while they are present (banks rate-limit unattended reads). */
export interface PsuContext { ip?: string; userAgent?: string }

export interface BankRead { accounts: number; transactions: NormalizedTransaction[] }
