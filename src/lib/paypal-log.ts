import Papa from "papaparse";

/**
 * PayPal's personal data download ("transactionLog", .xlsx): every movement of the account since
 * it was opened, in English, with times in Pacific time. It holds much more than the app needs
 * (IP addresses, account and card numbers, balances, funding lines), so the browser keeps only
 * the payments sent and turns them into the Activity download's CSV, which the server already
 * reads. Runs in the browser and on the server (no Node-only API).
 */

/** The export's own columns: the ones the Activity download does not have. */
export const looksLikePaypalLog = (header: string[]) => ["Gross Amount", "Balance Impact", "Encrypted Transaction ID"].every((h) => header.includes(h));

/** Payments sent to someone: subscriptions ("Billing Agreement", "Recurring"), checkouts, transfers. */
const SENT = /payment sent/i;
/** Payments to PayPal itself: Pay Later instalments, its own credit. */
const PAYPAL_ITSELF = /^paypal(?: credit| funds| inc\.?)?$/i;
/**
 * Some payments carry the funding source as their name ("Bank Account", "Card") or no name at all:
 * the merchant is found again from its PayPal account number or e-mail on its other payments.
 */
const PLACEHOLDER = /^(?:bank account|card|)$/i;
const DONE = /^(?:completed|partially refunded)$/i;

/** "Sep 23,2026 15:49:48 PDT" -> the day in Paris (a payment at 23:30 in California is the next day in France). */
export function logDate(value: string, timeZone = "Europe/Paris"): string | null {
  const m = value.match(/^([A-Z][a-z]{2}) (\d{1,2}),\s*(\d{4}) (\d{2}):(\d{2}):(\d{2}) (PDT|PST)$/);
  if (!m) return null;
  const month = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].indexOf(m[1]);
  if (month < 0) return null;
  const utc = Date.UTC(+m[3], month, +m[2], +m[4] + (m[7] === "PDT" ? 7 : 8), +m[5], +m[6]);
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(utc));
}

export interface LogExtract { csv: string; kept: number; scanned: number; from?: string; to?: string }

/** Keeps the payments sent, as Activity CSV rows (day/month/year dates, English headers). */
export function paypalLogToCsv(rows: string[][]): LogExtract {
  const [header, ...lines] = rows;
  const col = (name: string) => header.indexOf(name);
  const c = { date: col("Date"), name: col("Name"), type: col("Type"), status: col("Status"), gross: col("Gross Amount"), currency: col("Gross Amount - Currency Code"), subject: col("Subject"), to: col("To Email Address"), id: col("Transaction ID"), account: col("Account Number") };
  const cell = (r: string[], i: number) => (i >= 0 ? (r[i] ?? "").trim() : "");
  // The merchants' real names, by PayPal account number and by e-mail, from the payments that have one.
  const byAccount = new Map<string, string>(), byEmail = new Map<string, string>();
  for (const r of lines) {
    const name = cell(r, c.name);
    if (!SENT.test(cell(r, c.type)) || PLACEHOLDER.test(name) || PAYPAL_ITSELF.test(name)) continue;
    if (cell(r, c.account) && !byAccount.has(cell(r, c.account))) byAccount.set(cell(r, c.account), name);
    if (cell(r, c.to) && !byEmail.has(cell(r, c.to))) byEmail.set(cell(r, c.to), name);
  }
  const out: string[][] = [];
  let from: string | undefined, to: string | undefined;
  for (const r of lines) {
    const type = cell(r, c.type), status = cell(r, c.status);
    const given = cell(r, c.name);
    const name = PLACEHOLDER.test(given) ? byAccount.get(cell(r, c.account)) ?? byEmail.get(cell(r, c.to)) ?? "" : given;
    const gross = Number(String(r[c.gross] ?? "").replace(/[^\d.-]/g, ""));
    if (!SENT.test(type) || !name || PAYPAL_ITSELF.test(name) || !DONE.test(status) || !Number.isFinite(gross) || gross >= 0) continue;
    const day = logDate(r[c.date] ?? "");
    if (!day) continue;
    if (!from || day < from) from = day;
    if (!to || day > to) to = day;
    const [y, mo, d] = day.split("-");
    // A partly refunded payment was still paid: it reads as completed.
    out.push([`${d}/${mo}/${y}`, name, type, "Completed", r[c.currency] || "EUR", gross.toFixed(2), r[c.subject] ?? "", r[c.to] ?? "", r[c.id] ?? ""]);
  }
  const csv = Papa.unparse({ fields: ["Date", "Name", "Type", "Status", "Currency", "Gross", "Item Title", "To Email Address", "Transaction ID"], data: out });
  return { csv, kept: out.length, scanned: lines.length, from, to };
}
