import { describe, expect, it } from "vitest";
import { parseSample, readSample, TODAY } from "./helpers";
import { NeedsMappingError, parseBankCsv, previewCsv } from "@/lib/parsers/bank-csv";
import { parseBankStatementText } from "@/lib/parsers/bank-pdf";
import { parsePaypalCsv } from "@/lib/parsers/paypal-csv";
import { parseReceiptText } from "@/lib/parsers/email";
import { appStoreEntriesToTransactions, parseAppStoreList } from "@/lib/parsers/app-store";
import { parseText } from "@/lib/parsers";
import { maskSensitive } from "@/lib/mask";
import { parseAmount } from "@/lib/amount";
import { parseDate } from "@/lib/dates";

const noSensitiveData = (text: string) => {
  expect(text).not.toMatch(/\d{8,}/);
  expect(text).not.toMatch(/FR14|DE89|4970 1012/);
};

describe("helpers", () => {
  it("parses amounts in French and English formats", () => {
    expect(parseAmount("1 234,56")).toBe(1234.56);
    expect(parseAmount("1,234.56")).toBe(1234.56);
    expect(parseAmount("-13.49")).toBe(-13.49);
    expect(parseAmount("9,50 €")).toBe(9.5);
    expect(parseAmount("€83.99")).toBe(83.99);
    expect(parseAmount("(12.00)")).toBe(-12);
    expect(parseAmount("")).toBeNull();
  });

  it("parses dates in several formats", () => {
    expect(parseDate("05/03/2026")).toBe("2026-03-05");
    expect(parseDate("03/05/2026", "MDY")).toBe("2026-03-05");
    expect(parseDate("2026-03-05 10:12:00")).toBe("2026-03-05");
    expect(parseDate("17 October 2026")).toBe("2026-10-17");
    expect(parseDate("March 5, 2026")).toBe("2026-03-05");
    expect(parseDate("22 février 2026")).toBe("2026-02-22");
  });

  it("masks IBANs, card numbers and account numbers", () => {
    expect(maskSensitive("IBAN FR14 2004 1010 0505 0001 3M02 606")).toBe("IBAN IBAN ••••2606");
    expect(maskSensitive("Carte 4970 1012 3456 7890")).toBe("Carte CARD ••••7890");
    expect(maskSensitive("Card XXXX XXXX XXXX 1234")).toBe("Card ••••1234");
    expect(maskSensitive("Ref 1045987736512 PAYPAL")).toBe("Ref ••••6512 PAYPAL");
    expect(maskSensitive("4111111111111111")).toBe("CARD ••••1111");
    expect(maskSensitive("NETFLIX.COM")).toBe("NETFLIX.COM");
  });
});

describe("bank CSV parser", () => {
  it("reads the N26 layout", async () => {
    const { source, transactions } = await parseSample("bank-n26.csv");
    expect(source).toBe("bank");
    expect(transactions.length).toBeGreaterThan(100);
    const netflix = transactions.filter((t) => t.rawLabel === "NETFLIX.COM");
    expect(netflix).toHaveLength(12);
    expect(netflix[0]).toMatchObject({ date: "2025-10-05", amount: 13.49, currency: "EUR", source: "bank" });
    // Salary is income (negative); salary and rent are flagged as transfers.
    expect(transactions.find((t) => t.rawLabel.includes("Example Corp"))?.amount).toBe(-2850);
    expect(transactions.find((t) => t.rawLabel.includes("SCI Les Tilleuls"))?.rawLabel).toMatch(/^TRANSFER /);
    // Refunds stay negative.
    expect(transactions.find((t) => t.rawLabel.startsWith("Refund"))?.amount).toBe(-2.5);
    transactions.forEach((t) => noSensitiveData(t.rawLabel));
  });

  it("reads the French debit/credit layout after a preamble, masking the card number", async () => {
    const { transactions } = await parseSample("bank-card-fr.csv");
    const apple = transactions.filter((t) => t.rawLabel.startsWith("CB APPLE.COM/BILL"));
    expect(apple).toHaveLength(24);
    expect(transactions.find((t) => t.rawLabel.includes("PADDLE.NET* NOTION"))).toMatchObject({ date: "2026-01-22", amount: 9.5 });
    transactions.forEach((t) => noSensitiveData(t.rawLabel));
  });

  it("reads the Revolut and UK layouts", () => {
    const revolut = parseBankCsv("Type,Product,Started Date,Completed Date,Description,Amount,Fee,Currency,State,Balance\nCARD_PAYMENT,Current,2026-01-05 10:12:33,2026-01-06 08:00:00,Spotify,-11.12,0.00,EUR,COMPLETED,100\nTOPUP,Current,2026-01-06 10:00:00,2026-01-06 10:00:00,Top-up by *1234,50.00,0.00,EUR,COMPLETED,150");
    expect(revolut[0]).toMatchObject({ date: "2026-01-05", amount: 11.12, rawLabel: "Spotify", currency: "EUR" });
    expect(revolut[1].rawLabel).toMatch(/^TRANSFER/);
    const uk = parseBankCsv("Transaction Date,Transaction Type,Sort Code,Account Number,Transaction Description,Debit Amount,Credit Amount,Balance\n05/01/2026,DEB,'11-22-33,12345678,NETFLIX.COM,10.99,,500.00");
    expect(uk[0]).toMatchObject({ date: "2026-01-05", amount: 10.99, currency: "GBP", rawLabel: "NETFLIX.COM" });
  });

  it("asks for a column mapping on an unknown layout, then uses it", () => {
    const csv = "Booking day;Text;Value;Curr\n05.01.2026;NETFLIX.COM;-10,99;EUR\n06.01.2026;Salary;2000,00;EUR";
    expect(() => parseBankCsv(csv)).toThrow(NeedsMappingError);
    try { parseBankCsv(csv); } catch (e) {
      expect((e as NeedsMappingError).headers).toEqual(["Booking day", "Text", "Value", "Curr"]);
    }
    expect(previewCsv(csv).preview).toHaveLength(2);
    const txs = parseBankCsv(csv, { date: "Booking day", label: ["Text"], amount: "Value", currency: "Curr", dateOrder: "DMY", chargesAreNegative: true });
    expect(txs).toHaveLength(2);
    expect(txs[0]).toMatchObject({ date: "2026-01-05", amount: 10.99, currency: "EUR" });
    expect(txs[1].amount).toBe(-2000);
  });
});

describe("bank PDF parser", () => {
  it("reads the sample PDF statement", async () => {
    const { source, transactions } = await parseSample("bank-statement.pdf");
    expect(source).toBe("bank");
    expect(transactions.filter((t) => t.rawLabel === "PRLV SEPA CANAL+")).toHaveLength(12);
    expect(transactions.find((t) => t.rawLabel === "PRLV SEPA FREE MOBILE")).toMatchObject({ date: "2025-10-07", amount: 19.99, currency: "EUR" });
    expect(transactions.find((t) => t.rawLabel.startsWith("VIR RECU"))?.amount).toBe(-400);
    transactions.forEach((t) => noSensitiveData(t.rawLabel));
  });

  it("handles value-date columns and trailing currency", () => {
    const txs = parseBankStatementText("05/01/2026 06/01/2026 NETFLIX.COM 13,49 EUR\n07/01/2026 SALAIRE +2 000,00");
    expect(txs[0]).toMatchObject({ date: "2026-01-05", amount: 13.49, rawLabel: "NETFLIX.COM" });
    expect(txs[1].amount).toBe(-2000);
  });
});

describe("PayPal parser", () => {
  it("keeps completed outgoing payments with the real merchant", async () => {
    const { source, transactions } = await parseSample("paypal-activity.csv");
    expect(source).toBe("paypal");
    expect(transactions).toHaveLength(26);
    expect(transactions.every((t) => t.amount > 0 && t.source === "paypal")).toBe(true);
    expect(transactions.find((t) => t.merchant === "Duolingo")).toMatchObject({ date: "2025-11-14", amount: 83.99, plan: "Super Duolingo 12 months" });
    expect(new Set(transactions.map((t) => t.merchant))).toEqual(new Set(["Uber", "Disney Plus", "Duolingo", "Vintage Records Shop"]));
  });

  it("skips pending payments", () => {
    const csv = '"Date","Name","Type","Status","Currency","Gross","Transaction ID"\n"01/02/2026","Shop","Express Checkout Payment","Pending","EUR","-5.00","X1"';
    expect(parsePaypalCsv(csv)).toHaveLength(0);
  });
});

describe("receipt email parser", () => {
  it("reads a yearly receipt", async () => {
    const { source, transactions: [tx] } = await parseSample("receipt-duolingo.eml");
    expect(source).toBe("email");
    expect(tx).toMatchObject({ merchant: "Duolingo", date: "2025-11-14", amount: 83.99, currency: "EUR", frequency: "yearly", isTrial: false, plan: "Super Duolingo, Annual plan" });
  });

  it("detects a trial that converted", async () => {
    const { transactions: [tx] } = await parseSample("receipt-notion.eml");
    expect(tx).toMatchObject({ merchant: "Notion", amount: 9.5, frequency: "monthly", isTrial: true, date: "2026-01-22" });
  });

  it("reads a monthly receipt and masks the card number", async () => {
    const { transactions: [tx] } = await parseSample("receipt-spotify.eml");
    expect(tx).toMatchObject({ merchant: "Spotify", amount: 11.12, frequency: "monthly", date: "2026-09-12" });
    expect(JSON.stringify(tx)).not.toContain("1234 ");
  });

  it("reads a pasted receipt", () => {
    const tx = parseReceiptText("From: Canva <billing@canva.example>\nSubject: Your Canva Pro receipt\nDate: 3 March 2026\n\nCanva Pro, billed yearly\nTotal: 110,00 €");
    expect(tx).toMatchObject({ merchant: "Canva", amount: 110, frequency: "yearly", date: "2026-03-03" });
  });
});

describe("app store lists", () => {
  it("reads the Apple list and skips expired items", () => {
    const entries = parseAppStoreList(readSample("apple-subscriptions.txt").toString());
    expect(entries.map((e) => e.service)).toEqual(["Apple One", "iCloud+"]);
    expect(entries[0]).toMatchObject({ amount: 19.95, currency: "EUR", frequency: "monthly", renewalDate: "2026-10-17", plan: "Individual (Monthly)" });
  });

  it("projects 12 monthly charges back from the renewal date", async () => {
    const { source, transactions } = await parseSample("apple-subscriptions.txt", "apple");
    expect(source).toBe("apple");
    const appleOne = transactions.filter((t) => t.merchant === "Apple One");
    expect(appleOne).toHaveLength(12);
    expect(appleOne[0].date).toBe("2026-09-17");
    expect(appleOne.at(-1)!.date).toBe("2025-10-17");
  });

  it("reads the Google list; trials have no past charges yet", () => {
    const entries = parseAppStoreList(readSample("google-subscriptions.txt").toString());
    expect(entries).toHaveLength(2);
    expect(entries[1]).toMatchObject({ service: "Calm", amount: 69.99, frequency: "yearly", isTrial: true, renewalDate: "2027-03-05" });
    const txs = appStoreEntriesToTransactions(entries, "google", TODAY);
    expect(txs.every((t) => t.merchant === "Google One")).toBe(true);
    expect(parseText(readSample("google-subscriptions.txt").toString(), { today: TODAY }).source).toBe("google");
  });
});
