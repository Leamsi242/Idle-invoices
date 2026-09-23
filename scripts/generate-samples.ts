/**
 * Generates the fake test files in /samples (SPEC.md, prompt 2).
 * Deterministic: running it twice gives the same files. No real personal data:
 * the IBANs are the published example IBANs and the card numbers are test numbers.
 *
 * Run with: node scripts/generate-samples.ts
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const OUT = join(import.meta.dirname, "..", "samples");
mkdirSync(OUT, { recursive: true });

// Oct 2025 to Sep 2026: 12 months.
const MONTHS = Array.from({ length: 12 }, (_, i) => {
  const d = new Date(Date.UTC(2025, 9 + i, 1));
  return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1 };
});
const pad = (n: number) => String(n).padStart(2, "0");
const iso = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;
const addDays = (date: string, n: number) => new Date(Date.parse(date) + n * 86_400_000).toISOString().slice(0, 10);

// Small seeded generator so "random" one-off purchases are stable.
let seed = 42;
const rand = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
const between = (lo: number, hi: number) => Math.round((lo + rand() * (hi - lo)) * 100) / 100;

interface Row { date: string; label: string; amount: number; kind?: string; ref?: string }

const monthly = (day: number, label: string, amount: (i: number, y: number, m: number) => number | null, extra: Partial<Row> = {}): Row[] =>
  MONTHS.flatMap(({ y, m }, i) => {
    const a = amount(i, y, m);
    return a === null ? [] : [{ date: iso(y, m, day), label, amount: a, ...extra }];
  });

// ---------------------------------------------------------------------------
// Bank 1: N26-style CSV (main current account)
// ---------------------------------------------------------------------------
const n26: Row[] = [
  // Salary and rent: recurring, but not subscriptions (income and transfers are ignored).
  ...monthly(28, "Example Corp SAS", () => -2850, { kind: "Credit Transfer", ref: "Salaire" }),
  ...monthly(2, "SCI Les Tilleuls", () => 850, { kind: "Outgoing Transfer", ref: "Loyer" }),
  // Netflix: monthly, price increase from April 2026.
  ...monthly(5, "NETFLIX.COM", (_i, y, m) => (y === 2026 && m >= 4 ? 15.99 : 13.49), { kind: "MasterCard Payment" }),
  // Spotify: monthly, one missed payment in February 2026 (card expired).
  ...monthly(12, "SPOTIFY", (_i, y, m) => (y === 2026 && m === 2 ? null : 11.12), { kind: "MasterCard Payment", ref: "P2A91C7F3E" }),
  // Uber One through PayPal, partly readable label.
  ...monthly(20, "PAYPAL *UBER", () => 5.99, { kind: "Direct Debit", ref: "1045987736512 PAYPAL" }),
  // Disney+ through PayPal, fully vague label; bank posts 2 days after PayPal.
  ...monthly(10, "PAYPAL *", () => 9.99, { kind: "Direct Debit", ref: "1038471923 PAYPAL" }),
  // Gym direct debit.
  ...monthly(3, "BASIC-FIT FRANCE", () => 29.99, { kind: "Direct Debit", ref: "PRLV SEPA BF-778123" }),
  // Duolingo yearly plan through PayPal (charged once in the period).
  { date: "2025-11-16", label: "PAYPAL *", amount: 83.99, kind: "Direct Debit", ref: "1039920017 PAYPAL" },
  // A trial that was never cancelled: WeTransfer Pro billed every week since late August.
  ...["2026-08-26", "2026-09-02", "2026-09-09", "2026-09-16", "2026-09-23"].map((date) => ({ date, label: "WETRANSFER.COM", amount: 9.99, kind: "MasterCard Payment" })),
  // One-off eBay purchase through PayPal.
  { date: "2026-05-03", label: "PAYPAL *", amount: 45.0, kind: "Direct Debit", ref: "1041188820 PAYPAL" },
  { date: "2026-03-14", label: "SNCF CONNECT", amount: 67.4, kind: "MasterCard Payment" },
  { date: "2026-07-02", label: "SNCF CONNECT", amount: 112.9, kind: "MasterCard Payment" },
  { date: "2026-06-11", label: "Refund NETFLIX.COM", amount: -2.5, kind: "MasterCard Payment" },
];
// Groceries: frequent, irregular, varying amounts. Must never be detected as a subscription.
for (let d = "2025-10-04"; d < "2026-09-30"; d = addDays(d, 5 + Math.floor(rand() * 6))) {
  n26.push({ date: d, label: rand() > 0.4 ? "LIDL 1234" : "CARREFOUR CITY", amount: between(14, 96), kind: "MasterCard Payment" });
}
for (let i = 0; i < 18; i++) {
  const date = addDays("2025-10-01", Math.floor(rand() * 360));
  n26.push({ date, label: ["LE PETIT BISTROT", "UBER EATS", "PHARMACIE CENTRALE", "CINEMA PATHE"][i % 4], amount: between(8, 55), kind: "MasterCard Payment" });
}
n26.sort((a, b) => a.date.localeCompare(b.date));

const csvCell = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
writeFileSync(
  join(OUT, "bank-n26.csv"),
  [
    ["Date", "Payee", "Account number", "Transaction type", "Payment reference", "Amount (EUR)", "Amount (Foreign Currency)", "Type Foreign Currency", "Exchange Rate"].map(csvCell).join(","),
    ...n26.map((r) =>
      [
        r.date,
        r.label,
        r.kind?.includes("Transfer") ? "DE89 3704 0044 0532 0130 00" : "",
        r.kind ?? "MasterCard Payment",
        r.ref ?? "",
        (-r.amount).toFixed(2),
        "",
        "",
        "",
      ].map(csvCell).join(","),
    ),
  ].join("\n") + "\n",
);

// ---------------------------------------------------------------------------
// Bank 2: French credit card CSV (semicolon separated, comma decimals, preamble)
// ---------------------------------------------------------------------------
const card: Row[] = [
  // Apple One (bundle) and iCloud+ both appear as APPLE.COM/BILL; bank posts 1 day after Apple.
  ...monthly(18, "CB APPLE.COM/BILL", () => 19.95),
  ...monthly(4, "CB APPLE.COM/BILL", () => 0.99),
  // Notion via Paddle: free trial converted to paid on 22 Jan 2026.
  ...monthly(22, "CB PADDLE.NET* NOTION", (_i, y, m) => (y === 2026 && m <= 9 ? 9.5 : null)),
  // Unknown app via Paddle: triggers the "what is this?" question.
  ...monthly(9, "CB PADDLE.NET* FOCUSFLOW", (_i, y, m) => (y === 2026 && m >= 4 ? 4.99 : null)),
  // Deezer: stopped after March 2026 (cancelled).
  ...monthly(15, "CB DEEZER", (_i, y, m) => (y === 2025 || m <= 3 ? 11.99 : null)),
  // Strava: €1 paid trial, then two monthly charges at full price (a subscription started recently).
  { date: "2026-07-28", label: "CB STRAVA", amount: 1.0 },
  { date: "2026-08-11", label: "CB STRAVA", amount: 11.99 },
  { date: "2026-09-11", label: "CB STRAVA", amount: 11.99 },
  // Amazon Prime yearly: two renewals 362 days apart.
  { date: "2025-10-02", label: "CB AMAZON PRIME FR", amount: 69.9 },
  { date: "2026-09-29", label: "CB AMAZON PRIME FR", amount: 69.9 },
];
for (let i = 0; i < 22; i++) {
  const date = addDays("2025-10-01", Math.floor(rand() * 362));
  card.push({ date, label: ["CB AMAZON MKTPLACE", "CB FNAC", "CB IKEA", "CB TOTAL ENERGIES"][i % 4], amount: between(12, 140) });
}
card.sort((a, b) => a.date.localeCompare(b.date));
const frDate = (d: string) => d.split("-").reverse().join("/");
const frAmount = (n: number) => n.toFixed(2).replace(".", ",");
const cardLabel = (r: Row) => (r.label.startsWith("CB ") ? `${r.label} ${frDate(r.date).slice(0, 5)}` : r.label);
writeFileSync(
  join(OUT, "bank-card-fr.csv"),
  [
    "Relevé de carte;;;;",
    "Carte n° 4970 1012 3456 7890;Titulaire: A. MARTIN;;;",
    "",
    "Date opération;Date valeur;Libellé;Débit;Crédit",
    ...card.map((r) => [frDate(r.date), frDate(addDays(r.date, 1)), cardLabel(r), r.amount > 0 ? frAmount(r.amount) : "", r.amount < 0 ? frAmount(-r.amount) : ""].join(";")),
  ].join("\n") + "\n",
);

// ---------------------------------------------------------------------------
// Bank 3: PDF statement (joint account)
// ---------------------------------------------------------------------------
const joint: Row[] = [
  // Telecom bundle that includes Netflix (the user also pays Netflix directly).
  ...monthly(6, "PRLV SEPA CANAL+", () => 34.99),
  ...monthly(7, "PRLV SEPA FREE MOBILE", () => 19.99),
  ...monthly(25, "VIR RECU A MARTIN", () => -400),
];
for (let i = 0; i < 14; i++) {
  const date = addDays("2025-10-01", Math.floor(rand() * 360));
  joint.push({ date, label: ["CB BOULANGERIE DU PORT", "CB DECATHLON", "CB PHARMACIE DU CENTRE"][i % 3], amount: between(3, 80) });
}
joint.sort((a, b) => a.date.localeCompare(b.date));
const pdfLines = [
  "BANQUE EXEMPLE - Releve de compte joint",
  "Titulaires: A. MARTIN et C. MARTIN",
  "IBAN: FR14 2004 1010 0505 0001 3M02 606",
  "Periode du 01/10/2025 au 30/09/2026",
  "",
  "Date        Libelle                                   Montant EUR",
  ...joint.map((r) => `${frDate(r.date)}  ${r.label.padEnd(40)}  ${r.amount > 0 ? "-" : "+"}${frAmount(Math.abs(r.amount))}`),
  "",
  "Fin du releve",
];
writeFileSync(join(OUT, "bank-statement.pdf"), makePdf(pdfLines));

// ---------------------------------------------------------------------------
// PayPal activity export
// ---------------------------------------------------------------------------
interface PpRow { date: string; name: string; type: string; gross: number; email: string; title?: string }
const pp: PpRow[] = [
  ...MONTHS.map(({ y, m }) => ({ date: iso(y, m, 20), name: "Uber", type: "Preapproved Payment Bill User Payment", gross: -5.99, email: "billing@uber.example", title: "Uber One membership" })),
  ...MONTHS.map(({ y, m }) => ({ date: iso(y, m, 8), name: "Disney Plus", type: "Preapproved Payment Bill User Payment", gross: -9.99, email: "billing@disneyplus.example", title: "Disney+ Standard" })),
  { date: "2025-11-14", name: "Duolingo", type: "Preapproved Payment Bill User Payment", gross: -83.99, email: "billing@duolingo.example", title: "Super Duolingo 12 months" },
  { date: "2026-05-02", name: "Vintage Records Shop", type: "Express Checkout Payment", gross: -45.0, email: "seller@vintage-records.example", title: "LP record" },
];
const ppRows = pp
  .flatMap((r) => [r, { ...r, name: "", type: "Bank Deposit to PP Account", gross: -r.gross, email: "", title: "" }])
  .sort((a, b) => a.date.localeCompare(b.date));
let txn = 1000;
writeFileSync(
  join(OUT, "paypal-activity.csv"),
  [
    ["Date", "Time", "TimeZone", "Name", "Type", "Status", "Currency", "Gross", "Fee", "Net", "From Email Address", "To Email Address", "Transaction ID", "Item Title", "Balance Impact"].map(csvCell).join(","),
    ...ppRows.map((r) =>
      [frDate(r.date), "09:14:02", "CEST", r.name, r.type, "Completed", "EUR", r.gross.toFixed(2), "0.00", r.gross.toFixed(2), r.gross < 0 ? "alex.martin@example.com" : "", r.email, `7XK${(txn++).toString().padStart(9, "0")}`, r.title ?? "", r.gross < 0 ? "Debit" : "Credit"].map(csvCell).join(","),
    ),
  ].join("\n") + "\n",
);

// ---------------------------------------------------------------------------
// Receipt emails
// ---------------------------------------------------------------------------
const eml = (from: string, subject: string, date: string, body: string) =>
  [
    `From: ${from}`,
    "To: Alex Martin <alex.martin@example.com>",
    `Subject: ${subject}`,
    `Date: ${new Date(date + "T08:30:00Z").toUTCString()}`,
    `Message-ID: <${Math.floor(rand() * 1e9)}@mail.example>`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=utf-8",
    "",
    body,
    "",
  ].join("\r\n");

writeFileSync(
  join(OUT, "receipt-duolingo.eml"),
  eml("Duolingo <no-reply@duolingo.example>", "Your Super Duolingo receipt", "2025-11-14",
    "Hi Alex,\n\nThanks for subscribing to Super Duolingo.\n\nPlan: Super Duolingo, Annual plan\nTotal: €83.99\nPaid with: PayPal\n\nYour subscription renews automatically on 14 November 2026.\n\nThe Duolingo team"),
);
writeFileSync(
  join(OUT, "receipt-notion.eml"),
  eml("Notion <team@makenotion.example>", "Your free trial has ended: welcome to Notion Plus", "2026-01-22",
    "Hi Alex,\n\nYour 14-day free trial of Notion Plus has ended and your subscription is now active.\n\nPlan: Notion Plus (monthly)\nAmount charged: 9,50 €\nCard ending in 7890\nNext billing date: 22 February 2026\n\nManage your plan in Settings > Billing."),
);
writeFileSync(
  join(OUT, "receipt-spotify.eml"),
  eml("Spotify <no-reply@spotify.example>", "Your Spotify Premium receipt", "2026-09-12",
    "Spotify Premium Individual\n\nDate: 12 September 2026\nTotal: EUR 11.12 (VAT included)\nBilled monthly. Next payment on 12 October 2026.\n\nCard: XXXX XXXX XXXX 1234"),
);

// ---------------------------------------------------------------------------
// App store subscription lists (pasted text)
// ---------------------------------------------------------------------------
writeFileSync(
  join(OUT, "apple-subscriptions.txt"),
  "Subscriptions\n\nActive\n\nApple One\nIndividual (Monthly)\n€19.95/month\nRenews 17 October 2026\n\niCloud+\n50 GB (Monthly)\n€0.99/month\nRenews 3 October 2026\n\nExpired\n\nApple TV+\nExpired 2 March 2025\n",
);
writeFileSync(
  join(OUT, "google-subscriptions.txt"),
  "Payments & subscriptions\n\nGoogle One\n100 GB · €1.99/month\nNext payment: 21 Oct 2026\n\nCalm\nFree trial, then €69.99/year\nRenews on 5 Mar 2027\n",
);

console.log("Samples written to", OUT);

// ---------------------------------------------------------------------------
// Minimal PDF writer: one Helvetica text line per statement line, 50 lines per page.
// ---------------------------------------------------------------------------
function makePdf(lines: string[]): Buffer {
  const pages: string[][] = [];
  for (let i = 0; i < lines.length; i += 50) pages.push(lines.slice(i, i + 50));
  const esc = (s: string) => s.replace(/[\\()]/g, (c) => `\\${c}`);
  const objects: string[] = [];
  const add = (body: string) => objects.push(body) ; // object number = index + 1
  add("<< /Type /Catalog /Pages 2 0 R >>");
  add(""); // pages, filled below
  add("<< /Type /Font /Subtype /Type1 /BaseFont /Courier /Encoding /WinAnsiEncoding >>");
  const kids: number[] = [];
  for (const page of pages) {
    const content = ["BT", "/F1 9 Tf", "11 TL", "40 800 Td", ...page.map((l) => `(${esc(l)}) Tj T*`), "ET"].join("\n");
    add(`<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`);
    const contentNum = objects.length;
    add(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentNum} 0 R >>`);
    kids.push(objects.length);
  }
  objects[1] = `<< /Type /Pages /Kids [${kids.map((k) => `${k} 0 R`).join(" ")}] /Count ${kids.length} >>`;
  let out = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((body, i) => {
    offsets.push(Buffer.byteLength(out));
    out += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xref = Buffer.byteLength(out);
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  out += offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("");
  out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out, "latin1");
}
