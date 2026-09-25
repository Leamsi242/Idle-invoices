import { expect, it } from "vitest";
import { analyze } from "@/lib/engine/pipeline";
import { upcomingTrials } from "@/lib/engine/trials";
import { parseReceiptText } from "@/lib/parsers/email";
import { tx } from "./factory";
const gp = (date: string, subject: string, body: string) => parseReceiptText(`From: Google Play <googleplay-noreply@google.com>\nSubject: ${subject}\nDate: ${date}\n\n${body}`)!;
const order = (date: string, item: string, price: string, renew?: string) => gp(date, `Confirmation de votre commande Google Play`, `Vous avez souscrit un abonnement auprès de Google Commerce Limited sur Google Play.${renew ? ` Votre abonnement sera automatiquement renouvelé le ${renew}, sauf si vous le résiliez avant.` : ""}\nArticle Prix\n${item} ${price}\nMontant total : ${price}`);
const renewal = (date: string, item: string, price: string) => gp(date, `Confirmation de votre commande Google Play`, `Votre abonnement au marchand Google Commerce Limited sur Google Play a été prolongé et facturé en conséquence.\nArticle Prix\n${item} ${price}\nMontant total : ${price}`);
const cancel = (date: string, app: string, end: string) => gp(date, `Votre abonnement à ${app} sera annulé`, `Votre abonnement à ${app}, proposé par Google Commerce Limited sur Google Play, sera annulé le ${end}.`);
// A real case, anonymized: dating apps and courses behind "GOOGLE PLAY APPS", Google One paid
// twice (card and PayPal), then a yearly plan whose price doubles after the first year.
it("unmasks every Google Play subscription and warns about the coming price increase", () => {
  const A = "AMEX GOOGLE*GOOGLE PLAY APPS G.CO HELPPAY#";
  const bank = [
    ...["2026-07-14", "2026-07-20", "2026-07-27", "2026-08-03", "2026-08-10"].map((d) => tx(d, 19.99, A)),
    tx("2025-09-19", 69.99, A), tx("2025-10-17", 69.99, A), tx("2025-10-17", 69.99, "AMEX GOOGLE *GOOGLE PLAY AP G.CO/HELPPAY#"), tx("2025-11-17", 69.99, "AMEX GOOGLE *GOOGLE PLAY AP G.CO/HELPPAY#"), tx("2025-12-17", 69.99, A),
    ...["2025-07-27", "2025-08-27", "2025-09-27", "2025-10-27"].map((d) => tx(d, 21.99, "AMEX GOOGLE *GOOGLE ONE G.CO/HELPPAY#")),
    ...["2025-10-03", "2025-11-03", "2025-12-03"].map((d) => tx(d, 21.99, "PRLV SEPA PAYPAL EUROPE S.A.R.L")),
    tx("2025-12-26", 49.99, "AMEX GOOGLE*GOOGLE ONE GOOGL G.CO HELPPAY#"),
  ];
  const tinder = "Tinder Gold (Tinder Dating App: Date & Chat) de Tinder LLC";
  const coursera = "Coursera Subscription (Coursera: Grow your career) de Coursera, Inc.";
  const mails = [
    order("14 July 2026", tinder, "19,99 € par semaine", "21 juil. 2026"),
    ...["21 July 2026", "28 July 2026", "4 August 2026", "11 August 2026"].map((d) => renewal(d, tinder, "19,99 € par semaine")),
    cancel("14 August 2026", "Tinder - appli de rencontre", "18 août 2026"),
    order("19 September 2025", coursera, "69,99 € par mois", "19 oct. 2025"),
    ...["19 October 2025", "19 November 2025", "19 December 2025"].map((d) => renewal(d, coursera, "69,99 € par mois")),
    gp("25 December 2025", "Your Coursera: Grow your career subscription will be canceled", "Your Coursera: Grow your career subscription from Google Commerce Limited on Google Play will be canceled on Jan 19, 2026."),
    order("17 October 2025", "3 Month HingeX Membership (Hinge Dating App: Match & Date) de Hinge, Inc.", "69,99 € pour 3 mois", "17 janv. 2026"),
    cancel("29 November 2025", "Hinge: Rencontre, Date & Tchat", "17 janv. 2026"),
    cancel("29 November 2025", "Google One", "29 nov. 2025"),
    gp("26 December 2025", "Confirmation de votre commande Google Play", "Vous avez souscrit un abonnement auprès de Google Commerce Limited sur Google Play. La somme de 49,99 € vous sera automatiquement facturée pendant 1 an, puis 99,99 € par an à partir du 26 déc. 2026, sauf si vous résiliez.\nArticle Prix\n2 TB (Google One) de Google LLC 49,99 €\nMontant total : 49,99 €"),
    ...["3 October 2025", "3 November 2025", "3 December 2025"].map((d) => parseReceiptText(`From: PayPal <service@paypal.fr>\nSubject: Reçu pour votre paiement à Google Payment Irela...\nDate: ${d}\n\n| Vous avez payé 21,99 € EUR à Google Payment Irela.... |\n| Marchand | Google Payment Irela... noreply+support@goog... |\n| Google AI Pro (2 TB)... Qté : 1 | 21,99 € |\n| Total | 21,99 € EUR |`)!),
  ];
  const all = [...bank, ...mails];
  const { subscriptions } = analyze(all, { today: "2026-09-25" });
  const summary = subscriptions.map((s) => [s.serviceName, s.frequency, s.currentAmount, s.transactions.length, s.status]);
  expect(summary).toEqual([
    ["Tinder", "weekly", 19.99, 5, "cancelled"],
    ["Coursera Plus", "monthly", 69.99, 4, "cancelled"],
    ["Hinge", "quarterly", 69.99, 1, "cancelled"],
    ["Google One", "monthly", 21.99, 4, "cancelled"],
    ["Google One", "monthly", 21.99, 3, "cancelled"],
    ["Google One", "yearly", 49.99, 1, "forgotten"],
  ]);
  const twice = subscriptions.filter((s) => s.forgottenReasons.some((r) => r.startsWith("Charged twice")));
  expect(twice.map((s) => s.frequency)).toEqual(["monthly", "monthly"]);
  expect(subscriptions[0].forgottenReasons[0]).toBe("Billed every week, about €86.62 a month");
  expect(upcomingTrials(all.filter((t) => t.source !== "bank"), "2026-09-25")).toEqual([
    expect.objectContaining({ serviceName: "Google One", kind: "price-increase", startsCharging: "2026-12-26", amount: 99.99, previousAmount: 49.99 }),
  ]);
});
