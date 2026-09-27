/**
 * Subscription Detective: the economic model, one source of truth.
 * Used by docs/masterplan.html (in the browser) and scripts/gen-modele.mjs (writes
 * docs/MODELE-ECONOMIQUE.md). Every figure that comes from outside carries its source and verdict
 * in PARAMS; everything else is a hypothesis to replace with beta measurements.
 * Amounts in euros; dollar prices are converted with `usdEur`.
 */

/** Parameters: default value, unit, label, source, verdict. */
export const PARAMS = {
  months: { v: 24, unit: "mois", label: "Durée de la projection" },
  betaMonths: { v: 2, unit: "mois", label: "Bêta gratuite avant le lancement", verdict: "hypothèse" },
  signups0: { v: 100, unit: "inscrits", label: "Inscriptions le premier mois après la bêta", verdict: "hypothèse" },
  growth: { v: 10, unit: "% par mois", label: "Croissance des inscriptions", verdict: "hypothèse" },
  freeChurn: { v: 25, unit: "% par mois", label: "Départs des utilisateurs gratuits", verdict: "hypothèse" },
  paidChurn: { v: 5, unit: "% par mois", label: "Résiliations Premium", verdict: "hypothèse" },
  // Activation: the share of sign-ups who reach a first analysis. The source of emails and bank data
  // changes it; these are hypotheses to measure during the beta (step "import" abandonment).
  actStatements: { v: 30, unit: "%", label: "Activation avec relevés seulement", verdict: "hypothèse à mesurer" },
  actTakeout: { v: 10, unit: "points", label: "Activation en plus avec l'export Gmail (Takeout)", verdict: "hypothèse à mesurer" },
  actGmail: { v: 30, unit: "points", label: "Activation en plus avec la connexion Gmail en lecture seule", verdict: "hypothèse à mesurer" },
  outlookShare: { v: 15, unit: "% des inscrits", label: "Inscrits dont la boîte principale est Outlook ou Hotmail", verdict: "hypothèse à mesurer" },
  actBankAll: { v: 25, unit: "points", label: "Activation en plus si tout le monde connecte sa banque", verdict: "hypothèse à mesurer" },
  conv: { v: 5, unit: "% des activés", label: "Conversion en Premium des utilisateurs activés", note: "5 % des activés, soit environ 2 % des inscrits avec 40 % d'activation (médiane freemium 2,1 %, RevenueCat 2025)", verdict: "partiellement vérifié" },
  price: { v: 4.99, unit: "€ TTC par mois", label: "Prix Premium", note: "Bankin' Plus 4,99 €, Linxo 4,49 €", verdict: "partiellement vérifié" },
  oneOff: { v: 9, unit: "€ TTC", label: "Rapport unique sans abonnement", verdict: "hypothèse" },
  oneOffShare: { v: 3, unit: "% des activés", label: "Activés qui achètent le rapport unique", verdict: "hypothèse" },
  vat: { v: 20, unit: "%", label: "TVA", verdict: "confirmé (taux normal français)" },
  stripePct: { v: 1.5, unit: "%", label: "Stripe, part variable (cartes EEE standard)", verdict: "partiellement vérifié" },
  stripeFix: { v: 0.25, unit: "€", label: "Stripe, part fixe par paiement", verdict: "partiellement vérifié" },
  socialRate: { v: 21.2, unit: "% du chiffre d'affaires", label: "Cotisations micro-entreprise (prestations de services)", note: "taux à vérifier sur autoentrepreneur.urssaf.fr selon l'activité déclarée", verdict: "non vérifiable ici" },
  usdEur: { v: 0.92, unit: "€ pour 1 $", label: "Conversion dollar vers euro", verdict: "hypothèse, à ajuster" },
  vercelPro: { v: 20, unit: "$ par mois", label: "Vercel Pro (obligatoire dès un revenu)", verdict: "partiellement vérifié" },
  hobbyCapacity: { v: 450, unit: "actifs", label: "Actifs qui tiennent dans Vercel Hobby", note: "mesuré : 16 s de calcul par actif et par mois, marge ×2", verdict: "mesuré en local" },
  proExtraPerActive: { v: 0.002, unit: "€ par actif et par mois", label: "Calcul facturé en plus sur Vercel Pro", verdict: "estimation" },
  tursoFreeActives: { v: 1250, unit: "actifs", label: "Actifs qui tiennent dans Turso Free", verdict: "estimation à partir de mesures" },
  tursoDev: { v: 4.99, unit: "$ par mois", label: "Turso Developer", verdict: "partiellement vérifié" },
  domain: { v: 12, unit: "€ par an", label: "Nom de domaine", verdict: "estimation" },
  resendFree: { v: 3000, unit: "e-mails par mois", label: "Resend gratuit", verdict: "partiellement vérifié" },
  resendPro: { v: 20, unit: "$ par mois", label: "Resend Pro", verdict: "partiellement vérifié" },
  alertsPerPremium: { v: 4, unit: "e-mails par mois", label: "Alertes envoyées par abonné Premium", verdict: "hypothèse" },
  casa: { v: 700, unit: "€ par an", label: "Audit de sécurité CASA pour Gmail (niveau 2, puis chaque année)", note: "TAC Security : 540 $ (Basic), 720 $ (Premium, nouveaux passages illimités), 1 800 $ (Enterprise) ; Leviathan 800 à 1 200 $. Pas de voie gratuite depuis la fin de l'auto-analyse", verdict: "partiellement vérifié (sources tierces)" },
  gmailDelay: { v: 2, unit: "mois", label: "Délai de validation Google avant d'ouvrir Gmail à tous", note: "vérification de la marque en quelques jours, accès restreint « plusieurs semaines » selon Google, 2 à 8 semaines d'après des retours d'expérience", verdict: "partiellement vérifié" },
  ebAccount: { v: 0.5, unit: "€ par compte et par mois", label: "Enable Banking, par compte connecté", verdict: "hypothèse, tarif sur devis" },
  ebMin: { v: 0, unit: "€ par mois", label: "Enable Banking, minimum mensuel", verdict: "hypothèse, tarif sur devis" },
  bankShare: { v: 60, unit: "%", label: "Part des concernés qui connectent leur banque", verdict: "hypothèse" },
  cac: { v: 1.5, unit: "€ par inscrit", label: "Coût d'acquisition en publicité payée", verdict: "hypothèse" },
  paidBoost: { v: 2, unit: "×", label: "Inscriptions multipliées par la publicité", verdict: "hypothèse" },
};

export const defaults = () => Object.fromEntries(Object.entries(PARAMS).map(([k, p]) => [k, p.v]));

/**
 * The strategic choices a scenario is made of.
 * mail: "takeout" (export uploaded, 0 €) | "gmail" (read-only connection for everyone, needs Google verification and CASA)
 * bank: "statements" (no direct connection) | "premium" (direct connection for payers) | "all" (for everyone)
 * acquisition: "organic" | "paid"
 * monetize: false for a free-only phase (no revenue, can stay on free tiers)
 */
export const CHOICES = {
  mail: { takeout: "Export Gmail (Takeout)", gmail: "Connexion Gmail pour tous", outlook: "Outlook pour tous, export pour Gmail" },
  bank: { statements: "Relevés seulement", premium: "Banque directe en Premium", all: "Banque directe pour tous" },
  acquisition: { organic: "Bouche-à-oreille", paid: "Publicité payée" },
};

/** Month-by-month projection of one scenario. */
export function project(p, s) {
  const eur$ = (usd) => usd * p.usdEur;
  // Activation once everything is open (the monthly loop lowers it while Gmail waits for Google).
  const act = Math.min(0.9, (p.actStatements + (s.mail === "gmail" ? p.actGmail : p.actTakeout) + (s.bank === "all" ? p.actBankAll : 0)) / 100);
  const netOf = (price) => (price > 0 ? price / (1 + p.vat / 100) - (price * p.stripePct / 100 + p.stripeFix) : 0);
  const netPremium = netOf(p.price);
  const netOneOff = netOf(p.oneOff);
  const rows = [];
  let free = 0, paid = 0, cumul = 0, costCumul = 0, spendCumul = 0, socialCumul = 0, revCumul = 0, minCumul = 0;
  for (let m = 1; m <= p.months; m++) {
    const beta = m <= p.betaMonths;
    // Google's verification starts in month gmailFrom (1 by default) and takes gmailDelay months:
    // until then Gmail stays limited to 100 test users, so e-mail mostly comes from exports.
    const verifyFrom = s.gmailFrom ?? 1;
    const gmailOpen = s.mail === "gmail" && m >= verifyFrom + p.gmailDelay;
    const mailNow = s.mail === "gmail" && !gmailOpen ? (s.preMail ?? "takeout") : s.mail;
    const mailBonus = mailNow === "gmail" ? p.actGmail : mailNow === "outlook" ? p.actTakeout + (p.actGmail - p.actTakeout) * p.outlookShare / 100 : p.actTakeout;
    const actNow = Math.min(0.9, (p.actStatements + mailBonus + (s.bank === "all" && !beta ? p.actBankAll : 0)) / 100);
    const k = beta ? m : m - p.betaMonths;
    const base = beta ? p.signups0 * 0.5 : p.signups0 * Math.pow(1 + p.growth / 100, k - 1);
    const signups = s.acquisition === "paid" && !beta ? base * p.paidBoost : base;
    const activated = signups * actNow;
    const monetized = s.monetize !== false && !beta;
    const newPaid = monetized ? activated * p.conv / 100 : 0;
    free = free * (1 - p.freeChurn / 100) + (activated - newPaid);
    // A free phase stays on free tiers: new testers are refused beyond Vercel Hobby's capacity (BETA_MAX_TESTERS).
    if (s.cap) free = Math.min(free, p.hobbyCapacity);
    paid = paid * (1 - p.paidChurn / 100) + newPaid;
    const active = free + paid;
    // Revenue (net of VAT and Stripe), then social contributions on turnover.
    const subsRev = paid * netPremium;
    const oneOffRev = monetized ? activated * p.oneOffShare / 100 * netOneOff : 0;
    const turnover = monetized ? paid * p.price / (1 + p.vat / 100) + activated * p.oneOffShare / 100 * p.oneOff / (1 + p.vat / 100) : 0;
    const social = turnover * p.socialRate / 100;
    const revenue = subsRev + oneOffRev;
    // Costs.
    const onPro = monetized || active > p.hobbyCapacity;
    const hosting = onPro ? eur$(p.vercelPro) + Math.max(0, active - p.hobbyCapacity) * p.proExtraPerActive : 0;
    const db = active > p.tursoFreeActives ? eur$(p.tursoDev) : 0;
    const emails = paid * p.alertsPerPremium;
    const mailing = emails > p.resendFree ? eur$(p.resendPro) : 0;
    // Google's verification and sending alerts both need a domain.
    const needsDomain = monetized || (s.mail === "gmail" && m >= verifyFrom) || emails > 0;
    const domain = needsDomain ? p.domain / 12 : 0;
    // CASA: paid when the assessment is done (end of the delay), then every 12 months.
    const casaMonth = verifyFrom + Math.max(0, p.gmailDelay - 1);
    const casa = s.mail === "gmail" && m >= casaMonth && (m - casaMonth) % 12 === 0 ? p.casa : 0;
    const connected = s.bank === "all" && !beta ? active * p.bankShare / 100 : s.bank === "premium" ? paid * p.bankShare / 100 : 0;
    const bank = s.bank !== "statements" && !beta ? Math.max(connected * p.ebAccount, p.ebMin) : 0;
    const acquisition = s.acquisition === "paid" && !beta ? signups * p.cac : 0;
    // What the owner pays out of pocket (running costs and advertising), apart from social
    // contributions, which only exist when there is turnover.
    const spend = hosting + db + mailing + domain + casa + bank + acquisition;
    const costs = spend + social;
    const result = revenue - costs;
    cumul += result; costCumul += costs; spendCumul += spend; socialCumul += social; revCumul += revenue; minCumul = Math.min(minCumul, cumul);
    rows.push({ m, beta, signups, activated, active, paid, revenue, spend, social, costs, result, cumul, costCumul, spendCumul, parts: { hosting, db, mailing, domain, casa, bank, acquisition, social } });
  }
  const last = rows[rows.length - 1];
  const firstProfit = rows.find((r) => !r.beta && r.result > 0);
  const payback = rows.find((r) => r.cumul > 0 && r.m > p.betaMonths);
  return {
    rows,
    act,
    netPremium,
    summary: {
      costs24: last.costCumul,
      spend24: last.spendCumul,
      social24: socialCumul,
      revenue24: revCumul,
      result24: last.cumul,
      cashNeed: -minCumul,
      premium: last.paid,
      actives: last.active,
      firstProfitMonth: firstProfit?.m ?? null,
      paybackMonth: payback?.m ?? null,
      under1000: last.spendCumul <= 1000,
    },
  };
}

/** Every combination of the strategic choices, plus the free-only phases. */
export function allScenarios() {
  const list = [
    { id: "A0", name: "Gratuit, export Gmail, 450 testeurs au plus", mail: "takeout", bank: "statements", acquisition: "organic", monetize: false, cap: true },
    { id: "A-Gmail", name: "Gratuit, connexion Gmail pour tous, 450 testeurs au plus", mail: "gmail", bank: "statements", acquisition: "organic", monetize: false, cap: true },
    { id: "A-Outlook", name: "Gratuit, connexion Outlook pour tous et export pour Gmail, 450 testeurs au plus", mail: "outlook", bank: "statements", acquisition: "organic", monetize: false, cap: true },
    { id: "A-Gmail+", name: "Gratuit, connexion Gmail pour tous, sans plafond", mail: "gmail", bank: "statements", acquisition: "organic", monetize: false },
  ];
  // Start with the export, open Gmail to everyone once the subscribers pay for the audit.
  list.push({ id: "O>G-R-org", name: "Outlook pour tous et export Gmail, puis connexion Gmail pour tous au 10e mois, relevés seulement, bouche-à-oreille", mail: "gmail", preMail: "outlook", gmailFrom: 10, bank: "statements", acquisition: "organic", monetize: true });
  list.push({ id: "O>G-P-org", name: "Outlook pour tous et export Gmail, puis connexion Gmail pour tous au 10e mois, banque directe en premium, bouche-à-oreille", mail: "gmail", preMail: "outlook", gmailFrom: 10, bank: "premium", acquisition: "organic", monetize: true });
  for (const mail of Object.keys(CHOICES.mail))
    for (const bank of Object.keys(CHOICES.bank))
      for (const acquisition of Object.keys(CHOICES.acquisition))
        list.push({ id: `${{ gmail: "G", takeout: "T", outlook: "O" }[mail]}-${{ statements: "R", premium: "P", all: "T" }[bank]}-${acquisition === "paid" ? "pub" : "org"}`, name: `${CHOICES.mail[mail]}, ${CHOICES.bank[bank].toLowerCase()}, ${CHOICES.acquisition[acquisition].toLowerCase()}`, mail, bank, acquisition, monetize: true });
  return list;
}

/** Where a strategy starts paying for itself: premium subscribers needed to cover a fixed monthly cost. */
export function breakEvenSubscribers(p, fixedMonthly, extraPerSubscriber = 0) {
  const netOf = (price) => price / (1 + p.vat / 100) - (price * p.stripePct / 100 + p.stripeFix);
  const margin = netOf(p.price) - p.price / (1 + p.vat / 100) * p.socialRate / 100 - extraPerSubscriber;
  return margin > 0 ? Math.ceil(fixedMonthly / margin) : Infinity;
}

export const fmtEur = (n, d = 0) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: d, minimumFractionDigits: d }).format(Math.abs(n) < 0.5 / 10 ** d ? 0 : n);
export const fmtInt = (n) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(n);
