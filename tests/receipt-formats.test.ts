import { describe, expect, it } from "vitest";
import { detectFrequency, looksLikeReceipt, nextCharge, parseReceiptText } from "@/lib/parsers/email";

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
    expect(tx).toMatchObject({ isCancellation: true, amount: 0, merchant: "WeTransfer Ultimate", nextChargeDate: "2026-09-29" });
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

describe("formats found in older emails", () => {
  const r = (from: string, subject: string, date: string, body: string) => parseReceiptText(`From: ${from}\nSubject: ${subject}\nDate: ${date}\n\n${body}`);

  it("Paddle receipts in French and English", () => {
    expect(r("Paddle <help@paddle.example>", "Le reçu de la transaction pour votre abonnement CleanShot Cloud Pro Monthly", "30 June 2024", "Montant réglé 12,00 $US")).toMatchObject({ merchant: "CleanShot Cloud", amount: 12, currency: "USD", frequency: "monthly" });
    expect(r("Paddle <help@paddle.example>", "Your Enhancv subscription receipt", "5 May 2024", "Amount Paid €48.98\nQuarterly Pro")).toMatchObject({ merchant: "Enhancv", amount: 48.98, frequency: "quarterly" });
  });

  it("Stripe receipts with a weekly item and renewal reminders without amount", () => {
    expect(r("Teal Labs <invoice+statements@stripe.example>", "Your receipt from Teal Labs, Inc. #1234-5678", "5 May 2024", "Receipt from Teal Labs, Inc. $9.00 Paid May 5, 2024\nTeal+ (1 Week) Qty 1 $9.00")).toMatchObject({ merchant: "Teal Labs", amount: 9, frequency: "weekly" });
    expect(nextCharge("Your subscription will automatically renew on October 28, 2023. Your card ending in 0000 will be charged")).toEqual({ date: "2023-10-28", amount: undefined });
  });

  it("Amazon Channels introductory price and trial", () => {
    const intro = r("Amazon <digital-no-reply@amazon.example>", "Votre abonnement OCS a commencé", "4 July 2021", "Vous avez été débité de 5,99 € (TTC). Ce prix mensuel vous sera facturé pendant 2 mois. Après cela, vous serez débité de 11,99 € par mois.");
    expect(intro).toMatchObject({ amount: 5.99, frequency: "monthly", nextChargeDate: "2021-09-04", nextChargeAmount: 11.99 });
    const trial = r("Amazon <digital-no-reply@amazon.example>", "Votre abonnement PASS WARNER a commencé", "28 March 2023", "À l'issue de votre essai gratuit de 30 jours, vous serez débité de 9,99 € (TTC) par mois.");
    expect(trial).toMatchObject({ isTrial: true, nextChargeDate: "2023-04-27", nextChargeAmount: 9.99 });
  });

  it("Cdiscount, Amazon Prime, gym and Babbel wording", () => {
    expect(r("Cdiscount <no-reply@servicenotification.example>", "Cdiscount à volonté : prolongement de votre abonnement", "4 March 2025", "Votre abonnement sera automatiquement renouvelé le 09/04/2025 avec un prélèvement unique de 29 euros.")).toMatchObject({ amount: 29, nextChargeDate: "2025-04-09" });
    expect(nextCharge("votre abonnement Amazon Prime se renouvellera automatiquement le 17 octobre 2025")).toEqual({ date: "2025-10-17", amount: undefined });
    expect(r("ON AIR <club@fitness.example>", "Votre échéancier", "4 October 2024", "Mensualité | 29.95 €\nDate de prélèvement | 04")).toMatchObject({ amount: 29.95, frequency: "monthly" });
    expect(r("Babbel <sales@babbel.example>", "Votre facture Babbel", "9 February 2021", "Babbel Polonais 1Y (PREMIUM-POL-1Y) : 59,99 €")).toMatchObject({ amount: 59.99, frequency: "yearly" });
  });

  it("ignores promotions, trial invitations and failed renewals", () => {
    expect(looksLikeReceipt("Babbel à Vie -60 %", "Total 199 €")).toBe(false);
    expect(looksLikeReceipt("Alex, réactivez votre essai Premium", "0 €")).toBe(false);
    expect(r("Huawei <no-reply@huawei.example>", "Échec du renouvellement du package Cloud Argent", "24 July 2022", "Montant 0,99 €")).toBeNull();
  });
});

describe("more store formats", () => {
  it("reads a plan billed every 3 months", () => {
    const r = parseReceiptText(`From: Google Play <googleplay-noreply@google.com>
Subject: Confirmation de votre commande Google Play du 17 oct. 2025
Date: 17 October 2025

Vous avez souscrit un abonnement auprès de Google Commerce Limited sur
Google Play. Votre abonnement sera automatiquement renouvelé le 17 janv.
2026, sauf si vous le résiliez avant.
Article Prix
3 Month HingeX Membership (Hinge Dating App: Match & Date) de Hinge, Inc.
69,99 € pour 3 mois
Montant total : 69,99 € pour 3 mois`)!;
    expect([r.merchant, r.plan, r.amount, r.frequency, r.nextChargeDate]).toEqual(["Hinge Dating App", "3 Month HingeX Membership", 69.99, "quarterly", "2026-01-17"]);
  });

  it("names the service behind a PayPal payment to Google from the item line", () => {
    const r = parseReceiptText(`From: PayPal <service@paypal.fr>
Subject: Reçu pour votre paiement à Google Payment Irela...
Date: 3 December 2025

| Vous avez payé 21,99 € EUR à Google Payment Irela.... |
| Marchand | Google Payment Irela... noreply+support@goog... |
| Google AI Pro (2 TB)... Qté : 1 | 21,99 € |
| Total | 21,99 € EUR |`)!;
    expect([r.merchant, r.plan, r.amount]).toEqual(["Google AI Pro", "Google AI Pro (2 TB)", 21.99]);
  });
});
