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
  // Costs that are easy to forget: each one has its source and verdict.
  stripeBilling: { v: 0.7, unit: "% des abonnements", label: "Stripe Billing (gestion des abonnements, relances)", note: "sur les paiements d'abonnement, en plus des frais de carte", verdict: "partiellement vérifié" },
  premiumCards: { v: 10, unit: "% des paiements", label: "Paiements par carte premium ou hors d'Europe", verdict: "hypothèse" },
  premiumCardPct: { v: 2.8, unit: "%", label: "Stripe, cartes premium (2,9 à 3,15 % hors d'Europe)", verdict: "partiellement vérifié" },
  refundRate: { v: 2, unit: "% des encaissements", label: "Remboursements accordés (Stripe garde ses frais)", verdict: "hypothèse" },
  disputeRate: { v: 0.2, unit: "% des paiements", label: "Paiements contestés par la banque du client", verdict: "hypothèse" },
  disputeFee: { v: 20, unit: "€ par litige", label: "Frais Stripe par litige (montant perdu en plus)", note: "20 € par litige, 20 € de plus pour le contester, rendus si gagné", verdict: "partiellement vérifié" },
  foreignVat: { v: 20, unit: "%", label: "TVA payée sur les outils étrangers tant que vous ne facturez pas de TVA", note: "en franchise, la TVA des fournisseurs n'est pas récupérable : OpenAI facture par exemple 23 % sans numéro de TVA", verdict: "partiellement vérifié, taux selon le fournisseur" },
  fxFee: { v: 2, unit: "% des factures en dollars", label: "Frais de change de la banque sur les factures en dollars", verdict: "hypothèse, selon votre banque" },
  cfpRate: { v: 0.2, unit: "% du chiffre d'affaires", label: "Contribution à la formation professionnelle (micro-entreprise)", note: "0,1 à 0,3 % selon l'activité, les sources varient pour les services", verdict: "partiellement vérifié" },
  irRate: { v: 1.7, unit: "% du chiffre d'affaires", label: "Impôt sur le revenu, versement libératoire (prestations de services commerciales)", note: "si vous le choisissez et y avez droit ; sinon l'impôt dépend de votre foyer. 0 pour l'ignorer", verdict: "à choisir" },
  cfe: { v: 300, unit: "€ par an", label: "Cotisation foncière des entreprises (CFE)", note: "exonérée l'année du premier chiffre d'affaires, puis sous 5 000 € de chiffre d'affaires ; sinon base de 250 à 1 194 € selon la commune, avant son taux", verdict: "partiellement vérifié, montant selon la commune" },
  bankFeeMicro: { v: 0, unit: "€ par mois", label: "Compte bancaire dédié (micro-entreprise)", note: "obligatoire après deux années à plus de 10 000 € ; des offres en ligne gratuites existent", verdict: "hypothèse" },
  bankFeeCompany: { v: 15, unit: "€ par mois", label: "Compte bancaire professionnel (société)", verdict: "hypothèse" },
  trademark: { v: 190, unit: "€ une fois", label: "Dépôt de la marque à l'INPI (une classe, 10 ans)", verdict: "partiellement vérifié" },
  companySetup: { v: 195, unit: "€ une fois", label: "Création de la société (annonce légale, greffe, bénéficiaires)", verdict: "partiellement vérifié" },
  contingency: { v: 5, unit: "% des dépenses", label: "Réserve pour imprévus", note: "hausses de tarifs, oublis, frais bancaires ; 0 pour l'ignorer", verdict: "à choisir" },
  socialRate: { v: 21.2, unit: "% du chiffre d'affaires", label: "Cotisations micro-entreprise (prestations de services)", note: "21,2 % pour les prestations commerciales (BIC) ; 25,6 % si l'activité est déclarée en profession libérale (BNC)", verdict: "confirmé (2026)" },
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
  // Enable Banking, written startup offer: a monthly licence that includes a quota of active
  // accounts and rises over 3 years, then a price per account beyond the quota, lower with volume.
  ebFee1: { v: 900, unit: "€ par mois", label: "Enable Banking, licence la 1re année (remise de 40 %)", note: "offre écrite Enable Banking « Startup Offer 2026 », septembre 2026", verdict: "confirmé (offre écrite)" },
  ebIncl1: { v: 1800, unit: "comptes", label: "Comptes actifs inclus la 1re année", verdict: "confirmé (offre écrite)" },
  ebFee2: { v: 1200, unit: "€ par mois", label: "Enable Banking, licence la 2e année", verdict: "confirmé (offre écrite)" },
  ebIncl2: { v: 2400, unit: "comptes", label: "Comptes actifs inclus la 2e année", verdict: "confirmé (offre écrite)" },
  ebFee3: { v: 1500, unit: "€ par mois", label: "Enable Banking, licence à partir de la 3e année (tarif normal)", verdict: "confirmé (offre écrite)" },
  ebIncl3: { v: 3000, unit: "comptes", label: "Comptes actifs inclus à partir de la 3e année", verdict: "confirmé (offre écrite)" },
  ebAccount: { v: 0.5, unit: "€ par compte et par mois", label: "Compte au-delà du quota, jusqu'au 5 000e", note: "un compte = un IBAN unique avec un consentement valide, interrogé dans le mois ; reconnexions non recomptées ; le modèle applique les prix par tranche (chaque compte au prix de son rang), lecture de l'offre à confirmer", verdict: "confirmé (offre écrite), tranches à confirmer" },
  ebAccount2: { v: 0.3, unit: "€ par compte et par mois", label: "Compte du 5 001e au 50 000e", verdict: "confirmé (offre écrite)" },
  ebAccount3: { v: 0.2, unit: "€ par compte et par mois", label: "Compte au-delà du 50 000e", verdict: "confirmé (offre écrite)" },
  bankTrigger: { v: 2800, unit: "abonnés Premium", label: "Abonnés Premium à partir desquels signer le contrat (scénarios « au seuil »)", note: "la licence ne se paie que par les abonnés en plus que la banque apporte : licence × conversion ÷ (conversion en plus × marge d'un abonné), soit environ 2 800 pour 1 500 € avec la TVA due", verdict: "calculé, à choisir" },
  accountsPerUser: { v: 1.3, unit: "comptes par utilisateur", label: "Comptes bancaires reliés par utilisateur (Enable Banking facture les comptes, Powens les utilisateurs)", verdict: "hypothèse à mesurer" },
  // Powens, as announced orally on 1 October 2026: a flat monthly price for up to 1 000 users,
  // connections unlimited. The price beyond, the duration and any rise are not known yet.
  pwFee: { v: 900, unit: "€ par mois", label: "Powens, forfait mensuel", note: "annoncé oralement par Powens le 1er octobre 2026, à faire confirmer par écrit (durée, évolution, prix au-delà)", verdict: "non vérifiable (oral)" },
  pwIncl: { v: 1000, unit: "utilisateurs", label: "Utilisateurs inclus dans le forfait Powens (connexions illimitées)", verdict: "non vérifiable (oral)" },
  pwExtra: { v: 0.9, unit: "€ par utilisateur et par mois", label: "Powens, utilisateur au-delà du forfait", note: "non communiqué : le modèle prend le prix moyen du forfait", verdict: "hypothèse" },
  pwTrigger: { v: 1700, unit: "abonnés Premium", label: "Abonnés Premium à partir desquels signer avec Powens (scénarios « au seuil »)", note: "forfait × conversion ÷ (conversion en plus × marge d'un abonné), soit environ 1 700 pour 900 € avec la TVA due", verdict: "calculé, à choisir" },
  convBank: { v: 1, unit: "points", label: "Conversion en Premium en plus quand la banque directe y est incluse", verdict: "hypothèse à mesurer" },
  bankShare: { v: 60, unit: "%", label: "Part des concernés qui connectent leur banque", verdict: "hypothèse" },
  cac: { v: 1.5, unit: "€ par inscrit", label: "Coût d'acquisition en publicité payée", verdict: "hypothèse" },
  paidBoost: { v: 2, unit: "×", label: "Inscriptions multipliées par la publicité", verdict: "hypothèse" },
  // Monetization beyond the monthly Premium (hypotheses to test, one at a time, after launch).
  annualPrice: { v: 39.99, unit: "€ TTC par an", label: "Premium annuel", note: "4 mois offerts (remise de 33 %) par rapport à 12 × 4,99 € = 59,88 € ; 49,99 € ferait 2 mois offerts (16,5 %)", verdict: "hypothèse, remise à choisir" },
  annualShare: { v: 40, unit: "% des nouveaux abonnés", label: "Nouveaux abonnés qui choisissent l'annuel", verdict: "hypothèse" },
  annualChurn: { v: 1.5, unit: "% par mois", label: "Départs des abonnés annuels (non-renouvellement lissé)", verdict: "hypothèse" },
  affRate: { v: 0.3, unit: "% des actifs par mois", label: "Actifs qui changent d'offre (énergie, box, assurance) par l'application", verdict: "hypothèse" },
  affCommission: { v: 25, unit: "€ HT par contrat", label: "Commission d'affiliation par contrat souscrit", note: "Hello Watt, Selectra et Kelwatt déclarent être payés à la commission par les fournisseurs ; montants non publics", verdict: "modèle confirmé, montant non vérifiable" },
  conciergeShare: { v: 2, unit: "% des activés", label: "Activés qui achètent une résiliation assistée", verdict: "hypothèse" },
  conciergePrice: { v: 4.99, unit: "€ TTC", label: "Prix d'une résiliation assistée (lettre prête, envoi, suivi)", verdict: "hypothèse" },
  b2bFrom: { v: 12, unit: "mois", label: "Début des licences professionnelles (marque blanche)", verdict: "hypothèse" },
  b2bPerQuarter: { v: 1, unit: "licences par trimestre", label: "Nouvelles licences professionnelles", note: "conseillers en gestion de patrimoine, courtiers, associations de consommateurs", verdict: "hypothèse" },
  b2bPrice: { v: 149, unit: "€ HT par mois", label: "Prix d'une licence professionnelle", verdict: "hypothèse" },
  b2bChurn: { v: 2, unit: "% par mois", label: "Licences professionnelles arrêtées", verdict: "hypothèse" },
  // Legal status and taxes, which change with the turnover.
  vatThreshold: { v: 37500, unit: "€ HT par an", label: "Seuil de franchise de TVA (prestations de services)", note: "en dessous, pas de TVA facturée : le prix TTC reste acquis ; 41 250 € en seuil majoré", verdict: "confirmé (2026)" },
  microCeiling: { v: 83600, unit: "€ HT par an", label: "Plafond de la micro-entreprise (services)", note: "le modèle passe en société dès le dépassement ; en réalité, après deux années de dépassement", verdict: "confirmé (2026)" },
  accountant: { v: 120, unit: "€ HT par mois", label: "Expert-comptable en ligne (société)", note: "80 à 150 € par mois pour une SASU sans salarié", verdict: "partiellement vérifié" },
  isRate: { v: 15, unit: "%", label: "Impôt sur les sociétés, taux réduit", note: "jusqu'à 42 500 € de bénéfice par an", verdict: "confirmé (2026)" },
  isRate2: { v: 25, unit: "%", label: "Impôt sur les sociétés, taux normal", verdict: "confirmé (2026)" },
  rcPro: { v: 15, unit: "€ par mois", label: "Assurance responsabilité civile professionnelle", verdict: "hypothèse" },
  // Tools that change with the scale.
  tursoDevActives: { v: 6250, unit: "actifs", label: "Actifs qui tiennent dans Turso Developer", note: "5 fois les lectures de l'offre gratuite", verdict: "estimation" },
  tursoScaler: { v: 24.92, unit: "$ par mois", label: "Turso Scaler (29 $ sans engagement annuel)", verdict: "partiellement vérifié" },
  emailsPerActive: { v: 2, unit: "e-mails par mois", label: "E-mails de service par actif (lien de connexion, bilan)", verdict: "hypothèse" },
  resendScale: { v: 90, unit: "$ par mois", label: "Resend Scale (100 000 e-mails)", note: "Pro : 50 000 e-mails ; au-delà de 100 000, 0,90 $ les 1 000", verdict: "partiellement vérifié" },
  sentryFreeActives: { v: 5000, unit: "actifs", label: "Actifs couverts par le suivi d'erreurs gratuit", verdict: "estimation" },
  sentryTeam: { v: 26, unit: "$ par mois", label: "Sentry Team (suivi des erreurs)", verdict: "partiellement vérifié" },
  aiPerActive: { v: 0.003, unit: "€ par actif et par mois", label: "IA dans le produit (libellés inconnus, reçus)", verdict: "estimation" },
  // Staff: who does the work, the founder, the AI or paid people.
  founderHours: { v: 40, unit: "heures par mois", label: "Heures que vous donnez au projet (non payées)", verdict: "hypothèse" },
  founderPay: { v: 0, unit: "€ par mois", label: "Rémunération que vous vous versez après le lancement", note: "0 : le résultat est ce qui reste pour vous", verdict: "à choisir" },
  ticketsPer100: { v: 3, unit: "par 100 actifs et par mois", label: "Demandes d'aide", verdict: "hypothèse" },
  ticketMin: { v: 12, unit: "minutes", label: "Temps humain par demande", verdict: "hypothèse" },
  aiSupportShare: { v: 50, unit: "% des demandes", label: "Demandes réglées par l'assistant IA", note: "Intercom annonce 71 à 76 % ; 45 à 53 % observés en production", verdict: "partiellement vérifié" },
  aiTicketCost: { v: 0.06, unit: "€ par demande", label: "Coût IA d'une demande d'aide", note: "Claude Sonnet 5 à 2 $ et 10 $ le million de jetons lus et écrits, environ 3 échanges de 6 000 jetons lus et 800 écrits", verdict: "calculé sur le tarif de l'API" },
  devHours: { v: 30, unit: "heures par mois", label: "Développement et maintenance, base", verdict: "hypothèse" },
  devPer1000: { v: 2, unit: "heures par 1 000 actifs", label: "Développement en plus avec l'échelle", verdict: "hypothèse" },
  aiDevGain: { v: 30, unit: "%", label: "Temps de développement gagné avec un assistant de code", verdict: "hypothèse" },
  aiDevTool: { v: 100, unit: "$ par mois", label: "Assistant de code (Claude Max 5x)", verdict: "partiellement vérifié" },
  mkHours: { v: 20, unit: "heures par mois", label: "Contenus, réseaux, fiches des sites de mise en avant", verdict: "hypothèse" },
  aiContentGain: { v: 50, unit: "%", label: "Temps de contenu gagné avec l'IA", verdict: "hypothèse" },
  aiContentTool: { v: 20, unit: "$ par mois", label: "Assistant de rédaction (Claude Pro)", verdict: "partiellement vérifié" },
  adminHours: { v: 4, unit: "heures par mois", label: "Administration, comptabilité, conformité", verdict: "hypothèse" },
  adminPer1000: { v: 1, unit: "heures par 1 000 actifs", label: "Administration en plus avec l'échelle", verdict: "hypothèse" },
  aiAdminGain: { v: 30, unit: "%", label: "Temps d'administration gagné avec l'IA", verdict: "hypothèse" },
  b2bSetupHours: { v: 12, unit: "heures par licence", label: "Vente et installation d'une licence professionnelle", verdict: "hypothèse" },
  b2bHours: { v: 1, unit: "heures par licence et par mois", label: "Suivi d'une licence professionnelle", verdict: "hypothèse" },
  freelanceRate: { v: 35, unit: "€ HT de l'heure", label: "Indépendant (support, contenu, développement)", verdict: "hypothèse" },
  employeeCost: { v: 2600, unit: "€ par mois", label: "Coût employeur d'un salarié à temps plein", note: "un salarié au SMIC coûte environ 1 975 € par mois en 2026 ; 2 600 € pour un profil qualifié", verdict: "partiellement vérifié (SMIC), hypothèse (profil)" },
  fteHours: { v: 151.67, unit: "heures par mois", label: "Temps plein (35 heures par semaine)", verdict: "confirmé" },
};

export const defaults = () => Object.fromEntries(Object.entries(PARAMS).map(([k, p]) => [k, p.v]));

/**
 * The strategic choices a scenario is made of.
 * mail: "takeout" (export uploaded, 0 €) | "gmail" (read-only connection for everyone, needs Google verification and CASA) | "outlook"
 * bank: "statements" (no direct connection) | "premium" (direct connection for payers) | "all" (for everyone)
 * acquisition: "organic" | "paid"
 * offer: what is sold besides the monthly Premium; staff: whether AI takes part of the work
 * monetize: false for a free-only phase (no revenue, can stay on free tiers)
 * over: parameter overrides for this scenario (a prudent or ambitious variant)
 */
export const CHOICES = {
  mail: { takeout: "Export Gmail (Takeout)", gmail: "Connexion Gmail pour tous", outlook: "Outlook pour tous, export pour Gmail" },
  bank: { statements: "Relevés seulement", premium: "Banque directe en Premium", all: "Banque directe pour tous" },
  acquisition: { organic: "Bouche-à-oreille", paid: "Publicité payée" },
  offer: { base: "Premium mensuel et rapport unique", annual: "Plus l'abonnement annuel", b2c: "Plus annuel, affiliation et résiliation assistée", full: "Tout, dont les licences professionnelles" },
  vendor: { enable: "Enable Banking (offre écrite)", powens: "Powens (prix annoncé oralement)" },
  staff: { ia: "IA d'abord, puis indépendants ou salariés", humain: "Sans IA : indépendants ou salariés" },
};
const OFFER = {
  base: {},
  annual: { annual: true },
  b2c: { annual: true, aff: true, concierge: true },
  full: { annual: true, aff: true, concierge: true, b2b: true },
};

/**
 * Enable Banking's monthly bill for a number of active accounts, in the given month of the
 * contract: the licence of that contract year, and each account beyond its quota at the price of
 * its rank (0,50 € up to the 5 000th, 0,30 € up to the 50 000th, 0,20 € after).
 */
export function ebCost(p, accounts, contractMonth) {
  if (contractMonth < 1) return 0;
  const year = Math.min(3, Math.ceil(contractMonth / 12));
  const fee = [p.ebFee1, p.ebFee2, p.ebFee3][year - 1];
  const incl = [p.ebIncl1, p.ebIncl2, p.ebIncl3][year - 1];
  const band = (from, to, price) => Math.max(0, Math.min(accounts, to) - Math.max(incl, from)) * price;
  return fee + band(0, 5000, p.ebAccount) + band(5000, 50000, p.ebAccount2) + band(50000, Infinity, p.ebAccount3);
}

/** The bank provider's monthly bill for `users` connected users in the given month of the contract. */
export function bankCost(p, vendor, users, contractMonth) {
  if (contractMonth < 1) return 0;
  if (vendor === "powens") return p.pwFee + Math.max(0, users - p.pwIncl) * p.pwExtra;
  return ebCost(p, users * p.accountsPerUser, contractMonth);
}

/** What paid work costs: freelancers by the hour, or salaried full-time staff when cheaper. */
export function staffCost(p, hours) {
  if (hours <= 0) return { cost: 0, fte: 0, mode: "" };
  const freelance = hours * p.freelanceRate;
  const fte = Math.ceil(hours / p.fteHours);
  const salaried = fte * p.employeeCost;
  return freelance <= salaried ? { cost: freelance, fte: hours / p.fteHours, mode: "indépendants" } : { cost: salaried, fte, mode: "salariés" };
}

/** Month-by-month projection of one scenario. */
export function project(p0, s) {
  const p = s.over ? { ...p0, ...s.over } : p0;
  const offer = OFFER[s.offer ?? "base"] ?? {};
  const aiChoice = (s.staff ?? "ia") === "ia";
  const eur$ = (usd) => usd * p.usdEur;
  // Activation once everything is open (the monthly loop lowers it while Gmail waits for Google).
  const act = Math.min(0.9, (p.actStatements + (s.mail === "gmail" ? p.actGmail : p.actTakeout) + (s.bank === "all" ? p.actBankAll : 0)) / 100);
  // Card fees with the share of premium and foreign cards; subscriptions also pay Stripe Billing.
  const cardPct = p.stripePct + p.premiumCards / 100 * (p.premiumCardPct - p.stripePct);
  const stripe = (ttc, sub = false) => (ttc > 0 ? ttc * (cardPct + (sub ? p.stripeBilling : 0)) / 100 + p.stripeFix : 0);
  const rows = [];
  const turnoverHistory = [];
  let free = 0, paidM = 0, paidY = 0, licences = 0, cumul = 0, costCumul = 0, spendCumul = 0, socialCumul = 0, revCumul = 0, minCumul = 0;
  let vatFrom = null, companyFrom = null, bankFrom = null, revenueFrom = null;
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
    // In a free phase the founder answers and builds alone: no AI subscription, no paid AI support.
    const ai = aiChoice && monetized;
    // Direct bank connection: from launch, or once the payers reach the trigger ("au seuil").
    if (bankFrom === null && s.bank !== "statements" && monetized && (s.bankAt !== "trigger" || paidM + paidY >= (s.vendor === "powens" ? p.pwTrigger : p.bankTrigger))) bankFrom = m;
    const bankOn = bankFrom !== null;
    const newPaid = monetized ? activated * (p.conv + (bankOn && s.bank !== "statements" ? p.convBank : 0)) / 100 : 0;
    const newYearly = offer.annual ? newPaid * p.annualShare / 100 : 0;
    free = free * (1 - p.freeChurn / 100) + (activated - newPaid);
    // A free phase stays on free tiers: new testers are refused beyond Vercel Hobby's capacity (BETA_MAX_TESTERS).
    if (s.cap) free = Math.min(free, p.hobbyCapacity);
    paidM = paidM * (1 - p.paidChurn / 100) + (newPaid - newYearly);
    paidY = paidY * (1 - p.annualChurn / 100) + newYearly;
    const paid = paidM + paidY;
    const active = free + paid;
    const newLicences = monetized && offer.b2b && m >= p.b2bFrom ? p.b2bPerQuarter / 3 : 0;
    licences = licences * (1 - p.b2bChurn / 100) + newLicences;

    // VAT: none while the turnover of the last 12 months stays under the threshold (franchise en
    // base); the consumer price stays the same, so VAT then comes out of the margin.
    const last12 = turnoverHistory.slice(-12).reduce((t, x) => t + x, 0);
    if (vatFrom === null && last12 > p.vatThreshold) vatFrom = m;
    if (companyFrom === null && last12 > p.microCeiling) companyFrom = m;
    const company = companyFrom !== null;
    const vatDue = vatFrom !== null || company;
    const ht = (ttc) => (vatDue ? ttc / (1 + p.vat / 100) : ttc);

    // Revenue: what customers pay, without VAT, then what Stripe keeps.
    const r = { premium: 0, annual: 0, oneOff: 0, aff: 0, concierge: 0, b2b: 0 };
    if (monetized) {
      r.premium = paidM * (ht(p.price) - stripe(p.price, true));
      r.annual = paidY * (ht(p.annualPrice) - stripe(p.annualPrice, true)) / 12;
      const buyers = activated * p.oneOffShare / 100;
      r.oneOff = buyers * (ht(p.oneOff) - stripe(p.oneOff));
      if (offer.aff) r.aff = active * p.affRate / 100 * p.affCommission;
      if (offer.concierge) r.concierge = activated * p.conciergeShare / 100 * (ht(p.conciergePrice) - stripe(p.conciergePrice));
      if (offer.b2b) r.b2b = licences * p.b2bPrice * (1 - (cardPct + p.stripeBilling) / 100);
    }
    // Refunds give the money back but not Stripe's fees; disputes cost a fee plus the amount.
    const cashed = monetized ? paidM * p.price + paidY * p.annualPrice / 12 + activated * p.oneOffShare / 100 * p.oneOff + (offer.concierge ? activated * p.conciergeShare / 100 * p.conciergePrice : 0) : 0;
    const payments = monetized ? paidM + paidY / 12 + activated * p.oneOffShare / 100 + (offer.concierge ? activated * p.conciergeShare / 100 : 0) : 0;
    const refunds = cashed * p.refundRate / 100;
    const disputes = payments * p.disputeRate / 100 * p.disputeFee + cashed * p.disputeRate / 100;
    r.refunds = -(refunds + disputes);
    const revenue = Object.values(r).reduce((t, x) => t + x, 0);
    const turnover = monetized
      ? paidM * ht(p.price) + paidY * ht(p.annualPrice) / 12 + activated * p.oneOffShare / 100 * ht(p.oneOff) + r.aff
        + (offer.concierge ? activated * p.conciergeShare / 100 * ht(p.conciergePrice) : 0) + licences * p.b2bPrice
      : 0;
    turnoverHistory.push(turnover);
    if (revenueFrom === null && turnover > 0) revenueFrom = m;

    // Running costs, by tier of scale.
    const onPro = monetized || active > p.hobbyCapacity;
    const hosting = onPro ? eur$(p.vercelPro) + Math.max(0, active - p.hobbyCapacity) * p.proExtraPerActive : 0;
    const db = active > p.tursoDevActives ? eur$(p.tursoScaler) : active > p.tursoFreeActives ? eur$(p.tursoDev) : 0;
    const emails = paid * p.alertsPerPremium + (monetized ? active * p.emailsPerActive : 0);
    const mailing = emails > 100000 ? eur$(p.resendScale) + (emails - 100000) / 1000 * eur$(0.9) : emails > 50000 ? eur$(p.resendScale) : emails > p.resendFree ? eur$(p.resendPro) : 0;
    const monitoring = active > p.sentryFreeActives ? eur$(p.sentryTeam) : 0;
    // Google's verification and sending alerts both need a domain.
    const needsDomain = monetized || (s.mail === "gmail" && m >= verifyFrom) || emails > 0;
    const domain = needsDomain ? p.domain / 12 : 0;
    // CASA: paid when the assessment is done (end of the delay), then every 12 months.
    const casaMonth = verifyFrom + Math.max(0, p.gmailDelay - 1);
    const casa = s.mail === "gmail" && m >= casaMonth && (m - casaMonth) % 12 === 0 ? p.casa : 0;
    const connected = !bankOn ? 0 : s.bank === "all" ? active * p.bankShare / 100 : paid * p.bankShare / 100;
    const bank = bankOn ? bankCost(p, s.vendor ?? "enable", connected, m - bankFrom + 1) : 0;
    const acquisition = s.acquisition === "paid" && !beta ? signups * p.cac : 0;
    const admin = (company ? p.accountant + p.bankFeeCompany : monetized ? p.bankFeeMicro : 0) + (monetized ? p.rcPro : 0);
    // One-off costs: the trademark at launch, the company's creation when the micro-entreprise ends.
    const oneOff = (monetized && m === p.betaMonths + 1 ? p.trademark : 0) + (company && m === companyFrom ? p.companySetup : 0);
    // CFE: none the year of the first turnover, nor under 5 000 € of turnover a year.
    const cfe = revenueFrom !== null && m - revenueFrom >= 12 && last12 > 5000 ? p.cfe / 12 : 0;

    // Staff: hours of work, part done by AI, the rest by the founder, then by paid people.
    const tickets = active * p.ticketsPer100 / 100;
    const hours = {
      support: tickets * p.ticketMin / 60 * (ai ? 1 - p.aiSupportShare / 100 : 1),
      dev: (p.devHours + p.devPer1000 * active / 1000) * (ai ? 1 - p.aiDevGain / 100 : 1),
      content: monetized ? p.mkHours * (ai ? 1 - p.aiContentGain / 100 : 1) : 0,
      admin: (p.adminHours + p.adminPer1000 * active / 1000) * (ai ? 1 - p.aiAdminGain / 100 : 1),
      b2b: newLicences * p.b2bSetupHours + licences * p.b2bHours,
    };
    const totalHours = Object.values(hours).reduce((t, x) => t + x, 0);
    const paidHours = Math.max(0, totalHours - p.founderHours);
    const team = staffCost(p, paidHours);
    const aiCost = (monetized ? active * p.aiPerActive : 0) + (ai ? tickets * p.aiTicketCost + (monetized ? eur$(p.aiDevTool + p.aiContentTool) : 0) : 0);
    const founder = monetized ? p.founderPay : 0;

    // What the owner pays out of pocket, apart from contributions and taxes, which only exist with turnover.
    // Foreign tools: VAT that cannot be recovered while no VAT is charged, and the bank's exchange fee on dollars.
    const foreign = hosting + db + mailing + monitoring + aiCost + casa + bank;
    const toolTaxes = (vatDue ? 0 : foreign * p.foreignVat / 100) + (foreign - bank) * p.fxFee / 100;
    const outgoings = hosting + db + mailing + monitoring + domain + casa + bank + acquisition + admin + team.cost + aiCost + founder + oneOff + cfe + toolTaxes;
    const reserve = monetized ? outgoings * p.contingency / 100 : 0;
    const spend = outgoings + reserve;
    // Micro-entreprise: contributions on turnover. Company: corporate tax on the profit, by slice:
    // the reduced rate on the first 42 500 € of the year, the normal rate on the rest.
    const beforeTax = revenue - spend;
    const yearly = Math.max(0, beforeTax) * 12;
    const social = company
      ? (Math.min(yearly, 42500) * p.isRate + Math.max(0, yearly - 42500) * p.isRate2) / 100 / 12
      : turnover * (p.socialRate + p.cfpRate + p.irRate) / 100;
    const costs = spend + social;
    const result = revenue - costs;
    cumul += result; costCumul += costs; spendCumul += spend; socialCumul += social; revCumul += revenue; minCumul = Math.min(minCumul, cumul);
    rows.push({
      m, beta, signups, activated, active, paid, paidM, paidY, licences, revenue, spend, social, costs, result, cumul, costCumul, spendCumul,
      vatDue, company, hours, totalHours, paidHours, team, rev: r,
      parts: { hosting, db, mailing, monitoring, domain, casa, bank, acquisition, admin, staff: team.cost, ai: aiCost, founder, social, oneOff, cfe, toolTaxes, reserve, refunds: refunds + disputes },
    });
  }
  const last = rows[rows.length - 1];
  const firstProfit = rows.find((x) => !x.beta && x.result > 0);
  const payback = rows.find((x) => x.cumul > 0 && x.m > p.betaMonths);
  return {
    rows,
    act,
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
      vatFrom,
      companyFrom,
      bankFrom,
      fte: last.team.fte,
    },
  };
}

/** Every combination of the strategic choices, the free-only phases, and realistic plans. */
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
  return [...list, ...realistic()];
}

/**
 * Realistic plans: organic growth, Outlook for everyone, the bank for payers, one monetization
 * package each, with prudent or ambitious variants of the hypotheses.
 */
export function realistic() {
  const o = { mail: "outlook", bank: "premium", bankAt: "trigger", acquisition: "organic", monetize: true, staff: "ia", realistic: true };
  return [
    { ...o, id: "R1-prudent", name: "Prudent (test de résistance) : Premium mensuel et annuel, conversion 3 %, croissance 6 % par mois", offer: "annual", over: { conv: 3, growth: 6 } },
    { ...o, id: "R2-central", name: "Central : Premium, annuel, affiliation et résiliation assistée", offer: "b2c" },
    { ...o, id: "R3-sans-IA", name: "Central sans IA : même offre, tout le travail fait par des personnes", offer: "b2c", staff: "humain" },
    { ...o, id: "R4-gratuit-affil", name: "Gratuit pour tous, payé par l'affiliation (aucun Premium)", offer: "b2c", over: { conv: 0, oneOffShare: 0, conciergeShare: 0, affRate: 0.5 } },
    { ...o, id: "R5-premium-cher", name: "Premium à 7,99 €, conversion 3,5 %, annuel à 59,99 €", offer: "annual", over: { price: 7.99, conv: 3.5, annualPrice: 59.99 } },
    { ...o, id: "R6-pro", name: "Central plus licences professionnelles dès le 12e mois", offer: "full" },
    { ...o, id: "R7-lent", name: "Central avec une croissance lente, 4 % par mois", offer: "b2c", over: { growth: 4 } },
    { ...o, id: "R9-sobre", name: "Central sobre : un seul assistant IA à 20 $ par mois, sans assurance", offer: "b2c", over: { aiDevTool: 20, aiContentTool: 0, aiDevGain: 20, rcPro: 0 } },
    { ...o, id: "R10-banque-tot", name: "Sobre, mais contrat Enable Banking signé dès le lancement", offer: "b2c", bankAt: "launch", over: { aiDevTool: 20, aiContentTool: 0, aiDevGain: 20, rcPro: 0 } },
    { ...o, id: "R11-powens-tot", name: "Sobre, mais contrat Powens signé dès le lancement", offer: "b2c", bankAt: "launch", vendor: "powens", over: { aiDevTool: 20, aiContentTool: 0, aiDevGain: 20, rcPro: 0 } },
    { ...o, id: "R8-ambitieux", name: "Ambitieux : tout, Gmail pour tous au 10e mois, croissance 15 % par mois", offer: "full", mail: "gmail", preMail: "outlook", gmailFrom: 10, over: { growth: 15 } },
  ];
}

/**
 * Steady state for a constant number of sign-ups per month: the average of the last 12 months of
 * a 60-month run without growth, so every tier, tax and staff level has settled.
 */
export function steady(p, s, signupsPerMonth) {
  const run = project({ ...p, ...(s.over ?? {}), growth: 0, signups0: signupsPerMonth, months: 60, betaMonths: 0 }, { ...s, over: undefined });
  const tail = run.rows.slice(-12);
  const avg = (k) => tail.reduce((t, x) => t + x[k], 0) / tail.length;
  const lastRow = run.rows[run.rows.length - 1];
  return { signups: signupsPerMonth, actives: avg("active"), premium: avg("paid"), revenue: avg("revenue"), costs: avg("costs"), result: avg("result"), last: lastRow };
}

/** Smallest value in [lo, hi] for which ok() holds, scanning geometrically then bisecting. */
function smallest(ok, lo, hi, factor = 1.25) {
  let prev = lo;
  for (let x = lo; x <= hi; x *= factor) {
    if (ok(x)) {
      let a = prev, b = x;
      for (let i = 0; i < 25; i++) { const mid = (a + b) / 2; if (ok(mid)) b = mid; else a = mid; }
      return b;
    }
    prev = x;
  }
  return null;
}

/** The break-even point in users: sign-ups per month, active users and payers where the month stops losing money. */
export function breakEven(p, s) {
  if (s.monetize === false) return null;
  const S = smallest((x) => steady(p, s, x).result >= 0, 1, 2_000_000);
  return S === null ? null : steady(p, s, S);
}

/**
 * What it takes to reach a goal by month T: "month" (the month is profitable) or "payback" (the
 * cumulative result is back to zero). Returns the first-month sign-ups needed at the current
 * growth, and the growth needed at the current first-month sign-ups.
 */
export function reachBy(p, s, T, kind = "month") {
  const q = { ...p, ...(s.over ?? {}), months: Math.max(p.months, T) };
  const s2 = { ...s, over: undefined };
  const ok = (pp) => { const r = project(pp, s2).rows[T - 1]; return !r.beta && (kind === "month" ? r.result >= 0 : r.cumul >= 0); };
  const signups0 = smallest((x) => ok({ ...q, signups0: x }), 1, 5_000_000);
  const growthNeeded = ok({ ...q, growth: 0 }) ? 0 : smallest((g) => ok({ ...q, growth: g }), 0.25, 200, 1.15);
  return { signups0, growth: growthNeeded };
}

/** When the projection reaches a number of active users, and what a month looks like at that size. */
export function atUsers(p, s, N) {
  const q = { ...p, ...(s.over ?? {}), months: 120 };
  const rows = project(q, { ...s, over: undefined }).rows;
  const reached = rows.find((x) => x.active >= N)?.m ?? null;
  const unit = steady(p, s, 1000).actives / 1000;
  const st = unit > 0 ? steady(p, s, N / unit) : null;
  return { reached, steady: st };
}

/** Where a strategy starts paying for itself: premium subscribers needed to cover a fixed monthly cost. */
/** What one monthly Premium subscriber leaves each month, after VAT, Stripe, refunds and contributions. */
export function subscriberMargin(p, vatDue = false) {
  const ht = vatDue ? p.price / (1 + p.vat / 100) : p.price;
  const cardPct = p.stripePct + p.premiumCards / 100 * (p.premiumCardPct - p.stripePct);
  const fees = p.price * (cardPct + p.stripeBilling) / 100 + p.stripeFix;
  const losses = p.price * (p.refundRate + p.disputeRate) / 100 + p.disputeRate / 100 * p.disputeFee;
  return ht - fees - losses - ht * (p.socialRate + p.cfpRate + p.irRate) / 100;
}

export function breakEvenSubscribers(p, fixedMonthly, extraPerSubscriber = 0, vatDue = false) {
  const margin = subscriberMargin(p, vatDue) - extraPerSubscriber;
  return margin > 0 ? Math.ceil(fixedMonthly / margin) : Infinity;
}

export const fmtEur = (n, d = 0) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: d, minimumFractionDigits: d }).format(Math.abs(n) < 0.5 / 10 ** d ? 0 : n);
export const fmtInt = (n) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(n);

/** Parameter groups, in the order the page and the document show them. */
export const GROUPS = [
  ["Croissance et fidélité", ["months", "betaMonths", "signups0", "growth", "freeChurn", "paidChurn"]],
  ["Activation", ["actStatements", "actTakeout", "actGmail", "actBankAll", "outlookShare"]],
  ["Prix et revenus", ["conv", "price", "oneOff", "oneOffShare", "vat", "socialRate"]],
  ["Frais de paiement, taxes et dépenses faciles à oublier", ["stripePct", "stripeFix", "stripeBilling", "premiumCards", "premiumCardPct", "refundRate", "disputeRate", "disputeFee", "foreignVat", "fxFee", "cfpRate", "irRate", "cfe", "bankFeeMicro", "bankFeeCompany", "trademark", "companySetup", "contingency"]],
  ["Autres revenus", ["annualPrice", "annualShare", "annualChurn", "affRate", "affCommission", "conciergeShare", "conciergePrice", "b2bFrom", "b2bPerQuarter", "b2bPrice", "b2bChurn"]],
  ["Statut et impôts", ["vatThreshold", "microCeiling", "accountant", "isRate", "isRate2", "rcPro"]],
  ["Hébergement et outils selon l'échelle", ["usdEur", "vercelPro", "hobbyCapacity", "proExtraPerActive", "tursoFreeActives", "tursoDev", "tursoDevActives", "tursoScaler", "domain", "resendFree", "resendPro", "resendScale", "alertsPerPremium", "emailsPerActive", "sentryFreeActives", "sentryTeam", "aiPerActive"]],
  ["Personnel et IA", ["founderHours", "founderPay", "ticketsPer100", "ticketMin", "aiSupportShare", "aiTicketCost", "devHours", "devPer1000", "aiDevGain", "aiDevTool", "mkHours", "aiContentGain", "aiContentTool", "adminHours", "adminPer1000", "aiAdminGain", "b2bSetupHours", "b2bHours", "freelanceRate", "employeeCost", "fteHours"]],
  ["Gmail pour tous", ["casa", "gmailDelay"]],
  ["Banque directe (Enable Banking, Powens)", ["ebFee1", "ebIncl1", "ebFee2", "ebIncl2", "ebFee3", "ebIncl3", "ebAccount", "ebAccount2", "ebAccount3", "bankTrigger", "accountsPerUser", "pwFee", "pwIncl", "pwExtra", "pwTrigger", "convBank", "bankShare"]],
  ["Publicité", ["cac", "paidBoost"]],
];

/** A month at a given number of active users, once settled (see steady). */
export function atScale(p, s, actives) {
  const unit = steady(p, s, 1000).actives / 1000;
  return unit > 0 ? steady(p, s, actives / unit) : null;
}
