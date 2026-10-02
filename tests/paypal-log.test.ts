import { describe, expect, it } from "vitest";
import { looksLikeXlsx, readXlsxRows } from "@/lib/xlsx";
import { logDate, looksLikePaypalLog, paypalLogToCsv } from "@/lib/paypal-log";
import { parsePaypalCsv } from "@/lib/parsers/paypal-csv";
import { parseFile } from "@/lib/parsers";

/** A minimal .xlsx: a zip with shared strings and one sheet, the sheet deflated, the rest stored. */
async function makeXlsx(rows: string[][]): Promise<Uint8Array> {
  const strings: string[] = [];
  const idx = (v: string) => (strings.includes(v) ? strings.indexOf(v) : strings.push(v) - 1);
  const col = (i: number) => String.fromCharCode(65 + (i % 26)).padStart(i >= 26 ? 2 : 1, "A");
  const esc = (v: string) => v.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const sheet = `<worksheet><sheetData>${rows.map((r, ri) => `<row r="${ri + 1}">${r.map((v, ci) => (v === "" ? "" : `<c r="${col(ci)}${ri + 1}" t="s"><v>${idx(v)}</v></c>`)).join("")}</row>`).join("")}</sheetData></worksheet>`;
  const shared = `<sst>${strings.map((v) => `<si><t>${esc(v)}</t></si>`).join("")}</sst>`;
  const enc = new TextEncoder();
  const deflate = async (b: Uint8Array) => new Uint8Array(await new Response(new Blob([b as BlobPart]).stream().pipeThrough(new CompressionStream("deflate-raw"))).arrayBuffer());
  const files = [
    { name: "xl/sharedStrings.xml", data: enc.encode(shared), method: 0 },
    { name: "xl/worksheets/sheet1.xml", data: await deflate(enc.encode(sheet)), method: 8 },
  ];
  const parts: number[] = [], central: number[] = [];
  const le = (n: number, bytes: number) => Array.from({ length: bytes }, (_, i) => (n >>> (8 * i)) & 255);
  for (const f of files) {
    const name = [...enc.encode(f.name)], offset = parts.length;
    parts.push(...le(0x04034b50, 4), ...le(20, 2), 0, 0, ...le(f.method, 2), 0, 0, 0, 0, ...le(0, 4), ...le(f.data.length, 4), ...le(0, 4), ...le(name.length, 2), 0, 0, ...name, ...f.data);
    central.push(...le(0x02014b50, 4), ...le(20, 2), ...le(20, 2), 0, 0, ...le(f.method, 2), 0, 0, 0, 0, ...le(0, 4), ...le(f.data.length, 4), ...le(0, 4), ...le(name.length, 2), 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, ...le(offset, 4), ...name);
  }
  const start = parts.length;
  return new Uint8Array([...parts, ...central, ...le(0x06054b50, 4), 0, 0, 0, 0, ...le(files.length, 2), ...le(files.length, 2), ...le(central.length, 4), ...le(start, 4), 0, 0]);
}

const H = ["Date", "User ID", "Account Number", "Name", "To/From", "Transaction ID", "Encrypted Transaction ID", "Gross Amount", "Gross Amount - Currency Code", "Type", "Status", "Subject", "Balance Impact", "To Email Address"];
const row = (o: Partial<Record<string, string>>) => H.map((h) => o[h] ?? "");
// Made-up lines, shaped like PayPal's export.
const ROWS = [
  H,
  row({ Date: "Aug 30,2026 02:30:01 PDT", "Account Number": "111", Name: "Bank Account", "Gross Amount": "-23.99", "Gross Amount - Currency Code": "EUR", Type: "Billing Agreement Payment Sent", Status: "Completed", Subject: "ADOBE  *Adobe", "Transaction ID": "T1" }),
  row({ Date: "Aug 30,2026 02:30:01 PDT", Name: "Bank Account", "Gross Amount": "23.99", "Gross Amount - Currency Code": "EUR", Type: "Inst. Tran. Add Funds from a Bank Account", Status: "Completed" }),
  row({ Date: "Jul 30,2026 03:13:33 PDT", "Account Number": "111", Name: "Adobe Systems Software Ireland LTD", "Gross Amount": "-23.99", "Gross Amount - Currency Code": "EUR", Type: "Billing Agreement Payment Sent", Status: "Completed", "To Email Address": "billing@example-shop.test", "Transaction ID": "T2" }),
  row({ Date: "Sep 02,2026 05:33:45 PDT", Name: "Paypal Credit", "Gross Amount": "-49.33", "Gross Amount - Currency Code": "EUR", Type: "Express Checkout Payment Sent (Flexible In-context)", Status: "Completed" }),
  row({ Date: "Jun 12,2025 05:57:26 PDT", Name: "Example Transfer BV", "Gross Amount": "-228.00", "Gross Amount - Currency Code": "EUR", Type: "Billing Agreement Payment Sent", Status: "Refunded" }),
  row({ Date: "Jan 05,2026 23:30:00 PST", Name: "Example Games Ltd", "Gross Amount": "-9.99", "Gross Amount - Currency Code": "USD", Type: "Recurring Payment Sent", Status: "Completed", Subject: "Monthly Plan" }),
  row({ Date: "Sep 18,2026 13:54:46 PDT", Name: "A Friend", "Gross Amount": "-20.00", "Gross Amount - Currency Code": "EUR", Type: "Mobile Payment Sent (Personal)", Status: "Completed", "To Email Address": "friend@gmail.com" }),
  row({ Date: "Sep 01,2026 10:00:00 PDT", Name: "Example Shop", "Gross Amount": "-5.00", "Gross Amount - Currency Code": "EUR", Type: "Authorization", Status: "Completed" }),
];

describe("PayPal personal data export (.xlsx)", () => {
  it("reads the first sheet of an .xlsx, stored or deflated", async () => {
    const bytes = await makeXlsx(ROWS);
    expect(looksLikeXlsx(bytes)).toBe(true);
    const rows = await readXlsxRows(bytes);
    expect(rows.length).toBe(ROWS.length);
    expect(rows[1][3]).toBe("Bank Account");
    expect(looksLikePaypalLog(rows[0])).toBe(true);
  });

  it("turns Pacific times into the day in Paris", () => {
    expect(logDate("Jan 05,2026 23:30:00 PST")).toBe("2026-01-06");
    expect(logDate("Aug 30,2026 02:30:01 PDT")).toBe("2026-08-30");
    expect(logDate("-")).toBeNull();
  });

  it("keeps the payments sent, finds the merchant behind a funding-source name, drops PayPal itself and refunds", () => {
    const ex = paypalLogToCsv(ROWS);
    const txs = parsePaypalCsv(ex.csv);
    expect(ex.kept).toBe(4);
    const names = txs.map((t) => t.merchant);
    expect(names.filter((n) => n === "Adobe Systems Software Ireland LTD")).toHaveLength(2);
    expect(names).not.toContain("Bank Account");
    expect(names).not.toContain("Paypal Credit");
    expect(names).not.toContain("Example Transfer BV");
    expect(txs.find((t) => t.merchant === "Example Games Ltd")).toMatchObject({ date: "2026-01-06", currency: "USD", amount: 9.99, plan: "Monthly Plan" });
    // Money sent to a person stays a transfer, so the matching bank line is left out too.
    expect(txs.find((t) => t.merchant === "A Friend")?.rawLabel).toMatch(/^TRANSFER PAYPAL/);
    expect([ex.from, ex.to]).toEqual(["2026-01-06", "2026-09-18"]);
  });

  it("is also read on the server when sent as is", async () => {
    const bytes = await makeXlsx(ROWS);
    const parsed = await parseFile("transactionLog.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", Buffer.from(bytes));
    expect(parsed.source).toBe("paypal");
    expect(parsed.transactions).toHaveLength(4);
  });
});
