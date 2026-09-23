import { describe, expect, it } from "vitest";
import { detectFrequency, nextCharge, parseReceiptText } from "@/lib/parsers/email";

// Synthetic receipts written in the formats seen in a real mailbox (no personal data).
const googlePlayWeekly = `From: Google Play <googleplay-noreply@google.com>
Subject: Confirmation de votre commande Google Play du 14 juil. 2026
Date: 14 July 2026

Google Play
Merci
Vous avez souscrit un abonnement auprès de Google Commerce Limited sur
Google Play. Votre abonnement sera automatiquement renouvelé le 21 juil.
2026, sauf si vous le résiliez avant.
Numéro de commande : GPA.0000-0000-0000-00000
Article Prix
Tinder Gold (Tinder Dating App: Date & Chat) de Tinder LLC 19,99 € par
semaine
Renouvellement automatique de l'abonnement
Montant total : 19,99 € par semaine
(dont 3,33 € de TVA)
Mode de paiement :
Amex-0000`;

const googleOneIntro = `From: Google Play <googleplay-noreply@google.com>
Subject: Confirmation de votre commande Google Play du 26 déc. 2025
Date: 26 December 2025

Vous avez souscrit un abonnement auprès de Google Commerce Limited sur
Google Play. La somme de 49,99 € vous sera automatiquement facturée pendant
1 an, puis 99,99 € par an à partir du 26 déc. 2026, sauf si vous résiliez.
Article Prix
2 TB (Google One) de Google LLC 49,99 €
Montant total : 49,99 €`;

const pdfTrial = `From: PDF Guru <info@pdfguru.example>
Subject: Welcome to PDFGuru! Trial and Subscription Details
Date: 7 September 2026

Payment details
Transaction date: September 7, 2026
Amount: €0.99
You have started a 7-day trial of PDF Guru, which will automatically convert into a paid monthly subscription unless you cancel before your trial ends. On September 14, 2026, and every month thereafter, you will be automatically charged €49.99 per monthly access at your selected payment method.`;

const paypalGeneric = `From: service@paypal.fr
Subject: Reçu de votre paiement PayPal
Date: 15 September 2026

Merci d'avoir payé avec PayPal.
| Paiement à WeTransfer B.V. pro@wetransfer.example | Remarque au vendeur |
| Description | Prix unitaire | Qté | Montant |
| WeTransfer Ultimate | 8,32 € EUR | 1 | 8,32 € EUR |
| Paiement | 9,99 € EUR |`;

describe("real-world receipt formats", () => {
  it("reads the service, weekly price and renewal date of a Google Play order", () => {
    const tx = parseReceiptText(googlePlayWeekly)!;
    expect(tx).toMatchObject({ merchant: "Tinder Dating App", plan: "Tinder Gold", amount: 19.99, frequency: "weekly", nextChargeDate: "2026-07-21", date: "2026-07-14" });
    expect(tx.rawLabel).toMatch(/Google Play/);
  });

  it("reads an introductory price and the price it goes up to", () => {
    const tx = parseReceiptText(googleOneIntro)!;
    expect(tx).toMatchObject({ merchant: "Google One", plan: "2 TB", amount: 49.99, frequency: "yearly", nextChargeDate: "2026-12-26", nextChargeAmount: 99.99 });
  });

  it("reads trial terms: trial price now, full price and date of the first real charge", () => {
    const tx = parseReceiptText(pdfTrial)!;
    expect(tx).toMatchObject({ amount: 0.99, isTrial: true, frequency: "monthly", nextChargeDate: "2026-09-14", nextChargeAmount: 49.99 });
  });

  it("finds the merchant in the body of a generic PayPal receipt", () => {
    expect(parseReceiptText(paypalGeneric)).toMatchObject({ merchant: "WeTransfer B.V", amount: 9.99 });
  });

  it("cleans PayPal subjects and unmasks Google Play", () => {
    expect(parseReceiptText("From: service@paypal.fr\nSubject: Votre paiement à Uber Payments BV a été traité \n\nVous avez envoyé un paiement de €18,23 EUR le 20 septembre 2026 à Uber Payments BV")?.merchant).toBe("Uber Payments BV");
    expect(parseReceiptText("From: service@paypal.fr\nSubject: Reçu pour votre paiement à Google Payment Irela...\n\nVous avez payé 5,99 € EUR à Google Payment Irela.... Marchand Google Payment Irela...")).toMatchObject({ merchant: "Google Play", amount: 5.99 });
    expect(parseReceiptText("From: Stripe <invoice+statements@stripe.example>\nSubject: Your receipt from Anthropic Ireland, Limited #2780-7700\n\nAmount paid €21.60")?.merchant).toBe("Anthropic Ireland");
  });

  it("skips instalment plans, transfers to people, refunds and failed payments", () => {
    for (const subject of ["Confirmation de votre Paiement en 4X", "Vous avez envoyé un paiement", "Vous avez reçu un remboursement de Uber BV", "Le paiement de votre abonnement Deliveroo Plus a échoué"]) {
      expect(parseReceiptText(`From: service@paypal.fr\nSubject: ${subject}\n\nVous avez effectué un paiement de 13,76 € EUR`), subject).toBeNull();
    }
  });

  it("turns cancellation emails into evidence records", () => {
    const tx = parseReceiptText("From: WeTransfer <noreply@wetransfer.example>\nSubject: Your WeTransfer Ultimate subscription has been cancelled\nDate: 22 September 2026\n\nThis will take effect on 29 September 2026.")!;
    expect(tx).toMatchObject({ isCancellation: true, amount: 0, merchant: "WeTransfer" });
    const play = parseReceiptText("From: Google Play <googleplay-noreply@google.com>\nSubject: Votre abonnement à Tinder - appli de rencontre sera annulé\nDate: 14 August 2026\n\nVotre abonnement à Tinder - appli de rencontre, proposé par Google Commerce Limited sur Google Play, sera annulé le 18 août 2026.")!;
    expect(play).toMatchObject({ isCancellation: true, merchant: "Tinder" });
  });

  it("understands French billing periods", () => {
    expect(detectFrequency("19,99 € par semaine")).toBe("weekly");
    expect(detectFrequency("prélevé chaque mois")).toBe("monthly");
    expect(detectFrequency("billed weekly")).toBe("weekly");
    expect(nextCharge("At your next renewal on 15 September 2026, your plan will renew for EUR 9.99, billed weekly.")).toEqual({ date: "2026-09-15", amount: 9.99 });
  });
});

import { analyze } from "@/lib/engine/pipeline";
import { upcomingTrials } from "@/lib/engine/trials";

const eml = (from: string, subject: string, date: string, body: string) => parseReceiptText(`From: ${from}\nSubject: ${subject}\nDate: ${date}\n\n${body}`)!;
const play = (date: string) => eml("Google Play <googleplay-noreply@google.com>", `Confirmation de votre commande Google Play du ${date}`, date,
  "Article Prix\nTinder Gold (Tinder Dating App: Date & Chat) de Tinder LLC 19,99 € par semaine\nMontant total : 19,99 € par semaine");

describe("a mailbox on its own (no bank statement)", () => {
  const mailbox = [
    ...["14 July 2026", "21 July 2026", "28 July 2026", "4 August 2026", "11 August 2026"].map(play),
    eml("Google Play <googleplay-noreply@google.com>", "Votre abonnement à Tinder - appli de rencontre sera annulé", "14 August 2026",
      "Votre abonnement à Tinder - appli de rencontre, proposé par Google Commerce Limited sur Google Play, sera annulé le 18 août 2026."),
    ...["20 October 2025", "20 November 2025", "20 December 2025"].map((d) =>
      eml("service@paypal.fr", "Reçu pour votre paiement à Coursera Europe B.V.", d, "Vous avez payé 33,00 € EUR à Coursera Europe BV. Marchand Coursera Europe BV")),
    eml("PDF Guru <info@pdfguru.example>", "Welcome to PDFGuru! Trial and Subscription Details", "7 September 2026",
      "Amount: €0.99\nYou have started a 7-day trial of PDF Guru. On September 14, 2026, and every month thereafter, you will be automatically charged €49.99 per monthly access."),
    eml("Google Play <googleplay-noreply@google.com>", "Confirmation de votre commande Google Play du 26 déc. 2025", "26 December 2025",
      "La somme de 49,99 € vous sera automatiquement facturée pendant 1 an, puis 99,99 € par an à partir du 26 déc. 2026.\nArticle Prix\n2 TB (Google One) de Google LLC 49,99 €"),
  ];

  it("detects subscriptions from receipts alone, with cancellations", () => {
    const { subscriptions } = analyze(mailbox, { today: "2026-09-23" });
    const tinder = subscriptions.find((s) => s.serviceName === "Tinder")!;
    expect(tinder).toMatchObject({ frequency: "weekly", status: "cancelled", totalPaid: 99.95, cancelledOn: "2026-08-14", endsOn: "2026-08-18", channel: "google" });
    const coursera = subscriptions.find((s) => s.serviceName === "Coursera Plus")!;
    expect(coursera).toMatchObject({ frequency: "monthly", totalPaid: 99, channel: "paypal" });
  });

  it("flags a trial that converted without any cancellation", () => {
    const { subscriptions } = analyze(mailbox, { today: "2026-09-23" });
    const pdf = subscriptions.find((s) => s.serviceName === "PDF Guru")!;
    expect(pdf).toMatchObject({ frequency: "monthly", currentAmount: 49.99, yearlyCost: 599.88, confidence: 0.4 });
    expect(pdf.forgottenReasons[0]).toMatch(/Trial ended on 2026-09-14 and no cancellation was found/);
  });

  it("announces the Google One price doubling", () => {
    expect(upcomingTrials(mailbox, "2026-09-23")).toEqual([
      expect.objectContaining({ kind: "price-increase", serviceName: "Google One", previousAmount: 49.99, amount: 99.99, startsCharging: "2026-12-26" }),
    ]);
  });
});
