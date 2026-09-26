import type { BankRead, Institution } from "./types";
import type { NormalizedTransaction } from "../types";
import { makeTx } from "../parsers/common";
import { toPaypalTransaction, type EbTransaction } from "./enable-banking";
import { addDays, addMonths } from "../dates";

/**
 * A made-up bank, to try the whole flow without a banking contract (BANK_DEMO=1, on by default
 * in development). Twelve months of an ordinary account with a few subscriptions that need the
 * user's help: charges behind PayPal, Google Play and Apple, and an American Express card.
 */
export const DEMO_BANK: Institution = { name: "Demo bank (test data)", country: "XX" };

export const DEMO_PAYPAL: Institution = { name: "Demo PayPal (test data)", country: "XX" };

export function demoEnabled(): boolean {
  return process.env.BANK_DEMO === "1" || (process.env.BANK_DEMO !== "0" && process.env.NODE_ENV === "development");
}

export function demoTransactions(today: string): BankRead {
  const out: NormalizedTransaction[] = [];
  const add = (date: string, amount: number, rawLabel: string) => {
    if (date <= today) out.push(makeTx({ date, amount, currency: "EUR", rawLabel, source: "bank" }));
  };
  const start = addMonths(today.slice(0, 8) + "01", -12);
  for (let m = 0; m <= 12; m++) {
    const month = addMonths(start, m);
    const d = (day: number) => addDays(month, day - 1);
    add(d(1), -2450, "VIR SEPA SALAIRE ACME SAS");
    add(d(2), 890, "VIR SEPA LOYER M DUPONT");
    add(d(3), m < 7 ? 13.49 : 15.99, `CB NETFLIX.COM ${String(m + 1).padStart(2, "0")}/01`);
    add(d(5), 23.99, "PRLV SEPA PAYPAL EUROPE S.A.R.L");
    add(d(8), 29.99, "PRLV SEPA BASIC FIT FRANCE");
    add(d(10), 11.12, "CB SPOTIFY P2A91C7F3E");
    add(d(12), 2.99, "CB APPLE.COM/BILL ITUNES.COM");
    add(d(14), 19.99, "PRLV SEPA FREE MOBILE");
    add(d(24), [412.3, 388.1, 455.72, 390.05, 402.9, 377.4, 468.2, 399.99, 421.15, 380.6, 410.2, 395.5, 430.1][m], "PRLV SEPA AMERICAN EXPRESS CARTE FRANCE");
    // Everyday spending: amounts that move from one week to the next.
    const baskets = [62.4, 48.15, 71.9, 55.3, 23.8, 88.45, 39.1, 66.75, 51.2];
    for (const [k, day] of [4, 11, 18, 25].entries()) add(d(day), baskets[(m * 5 + k * 2) % baskets.length], "CB CARREFOUR CITY PARIS");
    add(d(16), [14.5, 22.8, 9.9, 31.4, 17.2, 12.65, 26.1][m % 7], "CB UBER *TRIP HELP.UBER.COM");
  }
  add(addDays(today, -368), 69.9, "CB AMAZON PRIME FR");
  add(addDays(today, -3), 69.9, "CB AMAZON PRIME FR");
  // A weekly app subscription that started five weeks ago.
  for (let w = 5; w >= 1; w--) add(addDays(today, -7 * w + 2), 9.99, "CB GOOGLE*GOOGLE PLAY APPS G.CO HELPPAY");
  return { accounts: 1, transactions: out };
}

/**
 * A later read of the demo bank: the same account, plus a subscription that started since
 * (Disney+ charged twice), so the nightly check has something to report.
 */
export function demoRefresh(today: string): NormalizedTransaction[] {
  const { transactions } = demoTransactions(today);
  const extra = [addDays(today, -31), addDays(today, -1)].map((date) => makeTx({ date, amount: 11.99, currency: "EUR", rawLabel: "CB DISNEY PLUS", source: "bank" }));
  return [...transactions, ...extra];
}

/**
 * The PayPal account behind the demo bank's monthly "PAYPAL EUROPE" 23.99, as PayPal's PSD2 feed
 * shapes it (date in transaction_date, payee in creditor): the subscription it pays, money sent to
 * a friend, a one-off purchase from the balance and a payout to the bank, which is not a payment.
 */
export function demoPaypalTransactions(today: string): BankRead {
  const lines: EbTransaction[] = [];
  const line = (date: string, amount: number, creditor: EbTransaction["creditor"], indicator: "DBIT" | "CRDT" = "DBIT") => {
    if (date <= today) lines.push({ transaction_date: date, status: "BOOK", credit_debit_indicator: indicator, transaction_amount: { amount: amount.toFixed(2), currency: "EUR" }, creditor, remittance_information: [] });
  };
  const start = addMonths(today.slice(0, 8) + "01", -3);
  for (let m = 0; m <= 3; m++) {
    const month = addMonths(start, m);
    line(addDays(month, 2), 23.99, { name: "Adobe Systems Software Ireland Ltd", contact_details: { email_address: "paypal@adobe.com" } });
  }
  line(addDays(today, -40), 50, { name: "Marie Martin", contact_details: { email_address: "marie.martin@gmail.com" } });
  line(addDays(today, -25), 18.5, { name: "Vinted UAB" });
  line(addDays(today, -20), 120, { name: null });
  return { accounts: 1, transactions: lines.map(toPaypalTransaction).filter((t): t is NormalizedTransaction => !!t) };
}
