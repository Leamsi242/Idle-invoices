// Writes docs/MODELE-ECONOMIQUE.md from docs/model.mjs, the model the masterplan page uses too.
// Run: npm run modele (after changing a parameter in docs/model.mjs).
import fs from "node:fs";
import { PARAMS, GROUPS, CHOICES, defaults, allScenarios, project, breakEven, reachBy, atScale, breakEvenSubscribers, ebCost, bankCost, fmtEur, fmtInt } from "../docs/model.mjs";

const p = defaults();
const scenarios = allScenarios().map((s) => ({ s, r: project(p, s) }));
const eur = (n) => fmtEur(Math.round(n));
const month = (m) => (m ? `mois ${m}` : "non atteint");
const row = (cells) => `| ${cells.join(" | ")} |`;
const byId = (id) => scenarios.find((x) => x.s.id === id);
const dec = (n) => String(n).replace(".", ",");
const usd = (n) => n * p.usdEur;
const pct = (n) => `${fmtInt(n)} %`;
const REC = "R9-sobre";
const marginOf = (vat) => { const ht = vat ? p.price / (1 + p.vat / 100) : p.price; return ht - (p.price * p.stripePct / 100 + p.stripeFix) - ht * p.socialRate / 100; };
const SCALES = [500, 2000, 10000, 50000, 200000];
/** Break-even in words: sign-ups per month, actives and payers once settled. */
const beText = (be) => (!be ? "jamais (dans la limite testée)" : be.signups < 3 ? "atteint sans utilisateurs (licences seules)" : `${fmtInt(be.signups)} inscrits par mois, ${fmtInt(be.actives)} actifs, ${fmtInt(be.premium)} Premium`);

const out = [];
out.push(`# Modèle économique et masterplan

Ce document est **généré** à partir de \`docs/model.mjs\`, le même modèle que la page dynamique \`docs/masterplan.html\` (publiée dans la conversation). Pour changer une hypothèse : modifiez sa valeur dans \`docs/model.mjs\`, puis lancez \`npm run modele\`. Sur la page, chaque paramètre se règle en direct, et le seuil de rentabilité se calcule pour l'objectif que vous choisissez (un mois ou un nombre d'utilisateurs).

Projection sur ${p.months} mois, dont ${p.betaMonths} mois de bêta gratuite. Montants en euros. Chaque paramètre porte son verdict : **confirmé** (source officielle), **partiellement vérifié** (sources tierces ou tarif public non contractuel), **non vérifiable** (tarif sur devis, montant non public), **hypothèse** (à remplacer par les mesures de la bêta).

## 1. Ce que le modèle prend en compte

- **Les revenus** : Premium mensuel, Premium annuel, rapport unique, commissions d'affiliation, résiliation assistée payante, licences professionnelles.
- **Le statut** : micro-entreprise sans TVA tant que le chiffre d'affaires des 12 derniers mois reste sous ${eur(p.vatThreshold)} (le prix payé reste acquis), puis TVA ; au-delà de ${eur(p.microCeiling)}, société avec expert-comptable et impôt sur les sociétés à la place des cotisations sur le chiffre d'affaires.
- **Les outils selon l'échelle** : Vercel Hobby puis Pro, Turso gratuit puis Developer puis Scaler, Resend gratuit puis Pro puis Scale, suivi d'erreurs gratuit puis payant.
- **Le personnel** : chaque tâche (support, développement, contenus, administration, vente aux professionnels) a un volume d'heures qui grandit avec les utilisateurs. L'IA en prend une part (assistant de support, assistant de code, rédaction) pour un coût mensuel ; vous donnez ${fmtInt(p.founderHours)} heures par mois ; le reste est payé à des indépendants, ou à des salariés dès que c'est moins cher.
- **Le seuil de rentabilité** en utilisateurs, et ce qu'il faut pour l'atteindre à un mois donné.

## 2. Les paramètres
`);
for (const [title, keys] of GROUPS) {
  out.push(`### ${title}\n`);
  out.push(row(["Paramètre", "Valeur", "Verdict", "Source ou remarque"]));
  out.push(row(["---", "---", "---", "---"]));
  for (const k of keys) { const q = PARAMS[k]; out.push(row([q.label, `${dec(q.v)} ${q.unit}`, q.verdict ?? "", q.note ?? ""])); }
  out.push("");
}

// Realistic plans.
const real = scenarios.filter((x) => x.s.realistic);
out.push(`## 3. Les scénarios réalistes

Tous en bouche-à-oreille, Outlook ouvert à tous (export pour Gmail), banque directe réservée au Premium et contrat Enable Banking signé seulement à ${fmtInt(p.bankTrigger)} abonnés (jamais atteint en 24 mois, sauf mention), IA d'abord sauf mention contraire. Chacun change une chose par rapport au scénario central.
`);
out.push(row(["Code", "Scénario", "Dépenses 24 mois", "Résultat 24 mois", "Trésorerie à avancer", "Premium au mois 24", "Remboursé au", "Seuil de rentabilité (régime stable)"]));
out.push(row(["---", "---", "---:", "---:", "---:", "---:", "---", "---"]));
for (const { s, r } of [...real].sort((a, b) => b.r.summary.result24 - a.r.summary.result24)) {
  const x = r.summary;
  out.push(row([s.id, s.name, eur(x.spend24), `**${eur(x.result24)}**`, eur(x.cashNeed), fmtInt(x.premium), month(x.paybackMonth), beText(breakEven(p, s))]));
}
out.push(`
**Lecture** :

- **Le travail coûte plus que les serveurs.** Sans IA (R3), les heures au-delà des vôtres partent chez des indépendants dès le lancement : le même scénario perd de l'argent sur 24 mois. Avec un seul assistant à 20 $ (R9), le seuil tombe à quelques dizaines d'inscrits par mois.
- **L'affiliation seule ne suffit pas** (R4) : il faut des dizaines de milliers d'actifs pour couvrir le travail. Elle complète le Premium, elle ne le remplace pas.
- **Les licences professionnelles** (R6, R8) rendent le projet rentable même avec peu d'utilisateurs, si ${fmtInt(p.b2bPerQuarter)} licence par trimestre à ${eur(p.b2bPrice)} par mois se vend vraiment : c'est l'hypothèse la plus fragile, à tester par 5 entretiens avant d'y consacrer du temps.
- **Un prix plus haut** (R5) reste rentable avec environ 30 % d'abonnés en moins : à tester avec deux prix pendant le lancement.
`);

// Break-even.
const central = byId("R2-central").s;
const be = breakEven(p, central);
const r12 = reachBy(p, central, 12, "month");
const r18 = reachBy(p, central, 18, "payback");
const r24 = reachBy(p, central, 24, "payback");
out.push(`## 4. Le seuil de rentabilité

**En régime stable** (inscriptions constantes, tout s'est tassé : paliers d'outils, TVA, personnel), le scénario central couvre ses coûts à partir de **${beText(be)}**. Un abonné Premium à ${dec(p.price)} € rapporte ${fmtEur(marginOf(false), 2)} par mois sans TVA due, ${fmtEur(marginOf(true), 2)} une fois la TVA due (Stripe et cotisations déduites).

**Pour atteindre un objectif à une date** (scénario central, ${fmtInt(p.signups0)} inscrits le premier mois après la bêta et ${pct(p.growth)} de croissance par mois dans les hypothèses actuelles) :
`);
out.push(row(["Objectif", "Inscrits le 1er mois nécessaires (croissance actuelle)", "Ou croissance nécessaire (inscrits actuels)"]));
out.push(row(["---", "---:", "---:"]));
const g = (x) => (x === null ? "hors d'atteinte" : x === 0 ? "aucune" : `${dec(Math.round(x * 10) / 10)} % par mois`);
const sgn = (x) => (x === null ? "hors d'atteinte" : fmtInt(Math.ceil(x)));
out.push(row(["Mois 12 rentable", sgn(r12.signups0), g(r12.growth)]));
out.push(row(["Investissement remboursé au mois 18", sgn(r18.signups0), g(r18.growth)]));
out.push(row(["Investissement remboursé au mois 24", sgn(r24.signups0), g(r24.growth)]));
out.push(`
Sur la page, choisissez votre objectif (un mois, ou un nombre d'actifs) : elle calcule la même chose pour n'importe quel scénario et peut appliquer la valeur trouvée à vos hypothèses.

Seuil de chaque scénario de la matrice (régime stable) :
`);
out.push(row(["Code", "Seuil"]));
out.push(row(["---", "---"]));
for (const { s } of scenarios.filter((x) => x.s.monetize !== false && !x.s.realistic && x.s.acquisition === "organic")) out.push(row([s.id, beText(breakEven(p, s))]));
out.push(`
Avec la publicité payée, un inscrit coûte ${fmtEur(p.cac, 2)} et rapporte moins : le seuil n'est atteint que très loin, ou jamais.
`);

// Scale.
const scaleTable = (s, title) => {
  out.push(`### ${title}\n`);
  out.push(row(["Actifs", ...SCALES.map(fmtInt)]));
  out.push(row(["---", ...SCALES.map(() => "---:")]));
  const xs = SCALES.map((n) => atScale(p, s, n));
  const L = (f) => xs.map((x) => f(x, x.last));
  out.push(row(["Inscrits par mois", ...L((x) => fmtInt(x.signups))]));
  out.push(row(["Abonnés Premium", ...L((x) => fmtInt(x.premium))]));
  out.push(row(["Revenus nets par mois", ...L((x) => eur(x.revenue))]));
  out.push(row(["Hébergement, base, e-mails, suivi", ...L((_, l) => eur(l.parts.hosting + l.parts.db + l.parts.mailing + l.parts.monitoring + l.parts.domain))]));
  out.push(row(["IA (support, assistants, produit)", ...L((_, l) => eur(l.parts.ai))]));
  out.push(row(["Heures de travail (dont payées)", ...L((_, l) => `${fmtInt(l.totalHours)} h (${fmtInt(l.paidHours)} h)`)]));
  out.push(row(["Personnel payé", ...L((_, l) => (l.team.cost ? `${eur(l.team.cost)}, ${l.team.mode} (${l.team.fte < 0.1 ? "moins de 0,1" : dec(Math.round(l.team.fte * 10) / 10)} ETP)` : "0 €"))]));
  out.push(row(["Banque, comptable, assurance", ...L((_, l) => eur(l.parts.bank + l.parts.admin))]));
  out.push(row(["Statut", ...L((_, l) => (l.company ? "société, TVA" : l.vatDue ? "micro, TVA" : "micro, sans TVA"))]));
  out.push(row(["Cotisations ou impôt", ...L((_, l) => eur(l.social))]));
  out.push(row(["**Résultat par mois**", ...L((x) => `**${eur(x.result)}**`)]));
  out.push(row(["Marge", ...L((x) => (x.revenue > 0 ? pct((x.result / x.revenue) * 100) : ""))]));
  out.push("");
};
out.push(`## 5. Les coûts selon l'échelle

Un mois type, une fois les utilisateurs stabilisés à chaque taille. Les outils changent de palier, la TVA puis la société arrivent avec le chiffre d'affaires, et le personnel passe des indépendants aux salariés quand un temps plein devient moins cher (${eur(p.employeeCost)} par mois contre ${eur(p.freelanceRate)} de l'heure).

La part de Premium parmi les actifs y est élevée (environ un quart) parce que ${pct(p.freeChurn)} des gratuits partent chaque mois alors que les abonnés restent : si la bêta mesure des gratuits plus fidèles, la part baisse et les revenus par actif aussi.
`);
scaleTable(byId(REC).s, `Plan recommandé (${REC})`);
scaleTable(byId("R2-central").s, "Scénario central (R2), IA d'abord");
scaleTable(byId("R3-sans-IA").s, "Même scénario sans IA (R3)");
out.push(`**Ce que l'IA remplace, et ce qu'elle ne remplace pas** :

| Tâche | Avec l'IA | Coût IA | Reste humain |
| --- | --- | --- | --- |
| Support | l'assistant répond aux questions courantes (${pct(p.aiSupportShare)} des demandes, partiellement vérifié) | ${fmtEur(p.aiTicketCost, 2)} par demande | cas de litige, remboursements, bugs |
| Développement | assistant de code, ${pct(p.aiDevGain)} de temps gagné (hypothèse) | ${eur(usd(p.aiDevTool))} par mois | décisions d'architecture, sécurité, relecture |
| Contenus | rédaction, déclinaisons, fiches, ${pct(p.aiContentGain)} de temps gagné (hypothèse) | ${eur(usd(p.aiContentTool))} par mois | relecture, ton, validation |
| Administration | tri des factures, relances, ${pct(p.aiAdminGain)} de temps gagné (hypothèse) | inclus | comptable et déclarations (obligations légales) |
| Vente aux professionnels | aucune part (hypothèse prudente) | | rendez-vous, négociation, installation |
| Libellés inconnus, reçus | analyse automatique dans le produit | ${fmtEur(p.aiPerActive, 3)} par actif et par mois | confirmation par l'utilisateur |

Le premier recrutement arrive quand les heures dépassent les vôtres : d'abord quelques heures d'indépendant (support et contenus), puis un premier salarié quand plus de ${fmtInt(p.employeeCost / p.freelanceRate)} heures par mois sont nécessaires.

## 6. Les options de monétisation

| Option | Retenue | Pourquoi |
| --- | --- | --- |
| Premium mensuel (${dec(p.price)} €) | oui | cœur du modèle, prix du marché (Bankin' Plus 4,99 €, Linxo 4,49 €, partiellement vérifié) |
| Premium annuel (${dec(p.annualPrice)} €) | oui | trésorerie d'avance, moins de départs, un seul paiement Stripe par an |
| Rapport unique (${eur(p.oneOff)}) | oui | pour ceux qui ne veulent pas d'abonnement, ce qui est le sujet de l'application |
| Résiliation assistée (${dec(p.conciergePrice)} €) | oui | lettre ou e-mail prêt, envoi et suivi ; l'IA rédige, le coût est faible |
| Affiliation (énergie, box, assurance) | oui, en complément | modèle des comparateurs (confirmé), commission non publique ; à signaler clairement à l'utilisateur |
| Licences professionnelles | oui, à valider | conseillers en gestion de patrimoine, courtiers, associations ; hypothèse la plus fragile |
| Offre famille | plus tard | utile quand l'application gérera plusieurs comptes |
| Publicité dans l'application | non | contraire à la promesse de confiance, revenu faible à cette échelle |
| Revente de données | non | contraire à la promesse, au RGPD et aux règles Google (« Limited Use ») |
| Paiement dans les magasins d'applications | non | 15 % de commission au lieu de 1,5 % + 0,25 € avec Stripe |
`);

// Full matrix.
out.push(`## 7. Tous les scénarios, du meilleur résultat au moins bon

Chaque scénario combine **la boîte mail** (${Object.values(CHOICES.mail).join(" ; ")}), **la banque** (${Object.values(CHOICES.bank).join(" ; ")}), **l'acquisition** (${Object.values(CHOICES.acquisition).join(" ; ")}), **l'offre** et **le personnel**. Sans mention, l'offre est « ${CHOICES.offer.base} » et le personnel « ${CHOICES.staff.ia} ». « Dépenses » = ce que vous payez de votre poche (outils, IA, personnel, audit, banque, publicité, comptable) ; « cotisations » = cotisations sociales ou impôt sur les sociétés ; « trésorerie à avancer » = le creux le plus bas du résultat cumulé.
`);
out.push(row(["Code", "Scénario", "Dépenses 24 mois", "Cotisations", "Revenus nets", "Résultat 24 mois", "Trésorerie à avancer", "Premium au mois 24", "Premier mois rentable", "Remboursé au"]));
out.push(row(["---", "---", "---:", "---:", "---:", "---:", "---:", "---:", "---", "---"]));
for (const { s, r } of [...scenarios].filter((x) => x.s.monetize !== false).sort((a, b) => b.r.summary.result24 - a.r.summary.result24)) {
  const x = r.summary;
  out.push(row([s.id, s.name, eur(x.spend24), eur(x.social24), eur(x.revenue24), `**${eur(x.result24)}**`, eur(x.cashNeed), fmtInt(x.premium), month(x.firstProfitMonth), month(x.paybackMonth)]));
}
out.push(`
**Lecture** : la publicité payée fait perdre de l'argent dans tous les cas ; la banque directe signée dès le lancement (combinaisons P et T) coûte la licence Enable Banking chaque mois et fait perdre de l'argent sur 24 mois ; les meilleurs résultats viennent du bouche-à-oreille, d'une offre qui ne dépend pas du seul Premium mensuel, et de l'IA pour le travail répétitif.

## 8. Les phases gratuites (pas de revenu)
`);
out.push(row(["Code", "Scénario", "Dépenses 24 mois", "Ce que ça permet"]));
out.push(row(["---", "---", "---:", "---"]));
const what = {
  A0: "450 testeurs actifs au plus ; Gmail par export Takeout (0 €), connexion Gmail pour 100 testeurs",
  "A-Outlook": "Comme A0, plus la connexion Outlook ouverte à tous (gratuite, sans plafond trouvé)",
  "A-Gmail": "La connexion Gmail en lecture seule ouverte à tous, 450 testeurs au plus ; validation Google et audit CASA payants",
  "A-Gmail+": "Comme A-Gmail, sans plafond de testeurs : Vercel Pro, et des heures d'aide payées au-delà des vôtres",
};
for (const { s, r } of scenarios.filter((x) => x.s.monetize === false)) out.push(row([s.id, s.name, eur(r.summary.spend24), what[s.id] ?? ""]));

// Thresholds per expense.
const pro = usd(p.vercelPro);
const casaMonthly = p.casa / 12;
out.push(`
## 9. Les seuils où chaque dépense se rembourse

Nombre d'abonnés Premium à ${dec(p.price)} € (sans TVA due, cotisations déduites) pour couvrir chaque dépense.
`);
out.push(row(["Dépense", "Coût par mois", "Abonnés Premium pour la couvrir", "Quand la déclencher"]));
out.push(row(["---", "---:", "---:", "---"]));
out.push(row(["Vercel Pro", eur(pro), fmtInt(breakEvenSubscribers(p, pro)), "Au premier euro encaissé (obligatoire), ou au-delà de 450 testeurs actifs"]));
out.push(row(["Assistant de code et de rédaction", eur(usd(p.aiDevTool + p.aiContentTool)), fmtInt(breakEvenSubscribers(p, usd(p.aiDevTool + p.aiContentTool))), "Quand il économise plus d'heures payées qu'il ne coûte"]));
out.push(row(["Connexion Gmail pour tous (audit CASA annuel)", eur(casaMonthly), fmtInt(breakEvenSubscribers(p, casaMonthly)), "Quand la connexion Gmail apporte au moins ce nombre d'abonnés en plus que l'export"]));
out.push(row(["Expert-comptable (société)", eur(p.accountant), fmtInt(breakEvenSubscribers(p, p.accountant, 0, true)), `Au passage en société (au-delà de ${eur(p.microCeiling)} de chiffre d'affaires)`]));
out.push(row(["Turso Developer", eur(usd(p.tursoDev)), fmtInt(breakEvenSubscribers(p, usd(p.tursoDev))), `Au-delà de ${fmtInt(p.tursoFreeActives)} actifs`]));
out.push(row(["Resend Pro", eur(usd(p.resendPro)), fmtInt(breakEvenSubscribers(p, usd(p.resendPro))), `Au-delà de ${fmtInt(p.resendFree)} e-mails par mois`]));
out.push(row(["Un salarié à temps plein", eur(p.employeeCost), fmtInt(breakEvenSubscribers(p, p.employeeCost, 0, true)), `Quand plus de ${fmtInt(p.employeeCost / p.freelanceRate)} heures payées par mois sont nécessaires`]));
for (const [y, fee] of [[1, p.ebFee1], [2, p.ebFee2], [3, p.ebFee3]]) out.push(row([`Licence Enable Banking, ${y === 3 ? "3e année et après" : y === 1 ? "1re année" : "2e année"}`, eur(fee), `${fmtInt(breakEvenSubscribers(p, fee))} (${fmtInt(breakEvenSubscribers(p, fee, 0, true))} avec TVA)`, "Mais seuls les abonnés en plus grâce à la banque la paient : voir § 10 bis"]));

// Gmail focus.
const T = byId("T-R-org").r.summary, G = byId("G-R-org").r.summary, TG = byId("O>G-R-org").r.summary, O = byId("O-R-org").r.summary;
out.push(`
## 10. Laisser tous les utilisateurs se connecter à Gmail en lecture seule

La connexion en lecture seule rassure davantage qu'un export Takeout à déposer : l'utilisateur clique sur « Autoriser » chez Google, l'application ne lit que les e-mails qui ressemblent à des reçus, ne garde aucun jeton et retire son accès juste après. Mais Google ne l'autorise pour plus de 100 personnes qu'après validation :

- **plafond de 100 utilisateurs pour toute la vie du projet** tant que l'application n'est pas validée, même en « production » (confirmé : [aide Google](https://support.google.com/cloud/answer/7454865)) ;
- **vérification de la marque**, puis **vérification des accès restreints** : page d'accueil publique sur un domaine vérifié, politique de confidentialité sur le même domaine, mention « Limited Use », **vidéo de démonstration en anglais** (confirmé : [vérification de la marque](https://developers.google.com/identity/protocols/oauth2/production-readiness/brand-verification), [règles des données utilisateur](https://developers.google.com/terms/api-services-user-data-policy)) ;
- **audit de sécurité CASA de niveau 2 chaque année**, fait par un laboratoire agréé (confirmé pour l'obligation, [CASA](https://appdefensealliance.dev/casa/tier-2/tier2-overview)) ; prix : 540 à 1 800 $ par an chez TAC Security, 800 à 1 200 $ chez Leviathan (partiellement vérifié, sources tierces) ;
- **délai** : quelques jours pour la marque, souvent 2 à 8 semaines pour les accès restreints (partiellement vérifié).

Comparaison, relevés seulement et bouche-à-oreille :
`);
out.push(row(["", "Export Takeout (T-R-org)", "Outlook pour tous (O-R-org)", "Gmail pour tous dès le départ (G-R-org)", "Outlook, puis Gmail au 10e mois (O>G-R-org)"]));
out.push(row(["---", "---:", "---:", "---:", "---:"]));
out.push(row(["Dépenses 24 mois", eur(T.spend24), eur(O.spend24), eur(G.spend24), eur(TG.spend24)]));
out.push(row(["Résultat 24 mois", eur(T.result24), eur(O.result24), eur(G.result24), eur(TG.result24)]));
out.push(row(["Trésorerie à avancer", eur(T.cashNeed), eur(O.cashNeed), eur(G.cashNeed), eur(TG.cashNeed)]));
out.push(row(["Premium au mois 24", fmtInt(T.premium), fmtInt(O.premium), fmtInt(G.premium), fmtInt(TG.premium)]));
out.push(row(["Remboursé au", month(T.paybackMonth), month(O.paybackMonth), month(G.paybackMonth), month(TG.paybackMonth)]));
out.push(`
Tout dépend de l'hypothèse « ${PARAMS.actGmail.label.charAt(0).toLowerCase() + PARAMS.actGmail.label.slice(1)} » (${p.actGmail} points contre ${p.actTakeout} pour l'export) : **mesurez-la pendant la bêta** avec les 100 places de test Gmail. Si l'écart réel apporte moins de ${fmtInt(breakEvenSubscribers(p, casaMonthly))} abonnés, l'export suffit.
`);

// Enable Banking.
const ebScen = byId(REC).s;
const accountsList = [50, 500, 1500, 3000, 10000, 60000];
out.push(`## 10 bis. La connexion bancaire directe (Enable Banking)

Offre écrite reçue d'Enable Banking (« Startup Offer 2026 », septembre 2026, verdict : confirmé) : une **licence mensuelle qui inclut un quota de comptes actifs**, avec une remise la 1re année, puis un prix par compte au-delà du quota, dégressif avec le volume. Enable Banking est agréé comme prestataire d'information sur les comptes (DSP2) et laisse les jeunes entreprises travailler sous son agrément : pas d'agrément à demander à l'ACPR. Un compte est facturé une fois par mois s'il a un consentement valide et qu'il est interrogé dans le mois ; le même IBAN reconnecté n'est pas recompté. Les tests avec vos propres comptes restent gratuits.

| | 1re année | 2e année | 3e année et après |
| --- | ---: | ---: | ---: |
| Licence par mois | ${eur(p.ebFee1)} | ${eur(p.ebFee2)} | ${eur(p.ebFee3)} |
| Comptes actifs inclus | ${fmtInt(p.ebIncl1)} | ${fmtInt(p.ebIncl2)} | ${fmtInt(p.ebIncl3)} |
| Compte en plus | ${fmtEur(p.ebAccount, 2)} jusqu'au 5 000e, ${fmtEur(p.ebAccount2, 2)} jusqu'au 50 000e, ${fmtEur(p.ebAccount3, 2)} au-delà (le modèle facture chaque compte au prix de sa tranche ; à confirmer si toute la facture passe au prix de la tranche atteinte) | | |

**Powens** (prix annoncé oralement le 1er octobre 2026, verdict : non vérifiable tant qu'il n'est pas écrit) : **${eur(p.pwFee)} par mois pour ${fmtInt(p.pwIncl)} utilisateurs, connexions illimitées**. Le prix au-delà, la durée et l'évolution n'ont pas été donnés : le modèle prend ${fmtEur(p.pwExtra, 2)} par utilisateur en plus (prix moyen du forfait, hypothèse). Powens annonce aussi jusqu'à 24 mois d'historique (3 mois au minimum), 4 rafraîchissements par jour et un travail sous son agrément (documents commerciaux de Powens, partiellement vérifié).

Enable Banking facture des **comptes**, Powens des **utilisateurs** : avec ${dec(p.accountsPerUser)} compte par utilisateur (hypothèse), coût mensuel selon le nombre d'utilisateurs connectés :
`);
out.push(row(["Utilisateurs connectés", "Enable Banking, 1re année", "Enable Banking, 2e année", "Enable Banking, 3e année et après", "Powens"]));
out.push(row(["---:", "---:", "---:", "---:", "---:"]));
for (const n of [50, 500, 1000, 1500, 3000, 10000]) out.push(row([fmtInt(n), eur(bankCost(p, "enable", n, 1)), eur(bankCost(p, "enable", n, 13)), eur(bankCost(p, "enable", n, 25)), eur(bankCost(p, "powens", n, 1))]));
const withBank = (n, vendor) => atScale(p, { ...ebScen, bankAt: "launch", vendor }, n), noBank = (n) => atScale(p, { ...ebScen, bank: "statements" }, n);
const sizes = [2000, 5000, 10000, 20000, 50000];
out.push(`
**Quand signer.** La licence est un coût fixe, mais elle ne se paie pas par tous les abonnés : ils paieraient de toute façon avec les relevés importés. Elle se paie par les abonnés **en plus** que la connexion directe apporte (hypothèse : +${dec(p.convBank)} point de conversion, à mesurer). Il faut donc environ licence × ${dec(p.conv)} ÷ (${dec(p.convBank)} × marge d'un abonné) abonnés Premium : environ ${fmtInt(p.pwFee * p.conv / (p.convBank * 2.95))} pour les ${eur(p.pwFee)} de Powens, ${fmtInt(p.ebFee3 * p.conv / (p.convBank * 2.95))} pour la licence de ${eur(p.ebFee3)} d'Enable Banking (TVA due). Le modèle signe à **${fmtInt(p.pwTrigger)} abonnés avec Powens** et **${fmtInt(p.bankTrigger)} avec Enable Banking** (réglables). Écart de résultat d'un mois type par rapport à « sans banque directe », plan ${ebScen.id}, en régime stable :
`);
out.push(row(["Actifs", ...sizes.map(fmtInt)]));
out.push(row(["---", ...sizes.map(() => "---:")]));
const N = sizes.map(noBank), E = sizes.map((n) => withBank(n, "enable")), P = sizes.map((n) => withBank(n, "powens"));
out.push(row(["Résultat sans banque directe", ...N.map((x) => eur(x.result))]));
out.push(row(["Utilisateurs connectés", ...E.map((x) => fmtInt(x.premium * p.bankShare / 100))]));
out.push(row(["Écart avec Enable Banking", ...E.map((x, i) => `**${eur(x.result - N[i].result)}**`)]));
out.push(row(["Écart avec Powens", ...P.map((x, i) => `**${eur(x.result - N[i].result)}**`)]));
out.push(`
**Lecture** : Powens coûte moins cher tant que les utilisateurs connectés restent sous ${fmtInt(p.pwIncl)} (forfait fixe, sans hausse annoncée, quand Enable Banking passe à ${eur(p.ebFee2)} puis ${eur(p.ebFee3)}). Au-delà, tout dépend de son prix par utilisateur en plus, **la question à poser par écrit** : à ${fmtEur(p.pwExtra, 2)}, Enable Banking redevient moins cher au-delà d'environ 1 000 utilisateurs connectés la 1re année de son contrat, 1 700 à partir de la 3e. Signer dès le lancement coûte ${eur(-byId("R10-banque-tot").r.summary.result24 + byId(REC).r.summary.result24)} sur 24 mois avec Enable Banking (R10) et ${eur(-byId("R11-powens-tot").r.summary.result24 + byId(REC).r.summary.result24)} avec Powens (R11), par rapport au plan sobre. Tant que le seuil n'est pas atteint, la banque directe reste en test gratuit (comptes du propriétaire chez Enable Banking, sandbox chez Powens) et les utilisateurs importent leurs relevés.

`
);

// Recommended plan.
const rec = byId(REC);
const recBe = breakEven(p, rec.s);
out.push(`## 11. Le masterplan recommandé

| Phase | Mois | Ce qu'on fait | Déclencheur pour passer à la suite | Dépense |
| --- | --- | --- | --- | --- |
| 0. Bêta gratuite | 1 à ${p.betaMonths} | A-Outlook : relevés, export Gmail, Outlook pour tous, 100 places Gmail de test pour mesurer l'effet de la connexion ; vous répondez vous-même | Taux d'analyse terminée, intention de payer, 5 entretiens avec des professionnels | 0 € |
| 1. Lancement sobre | ${p.betaMonths + 1} à 9 | ${rec.s.id} : Premium mensuel et annuel, rapport unique, résiliation assistée, affiliation signalée ; un seul assistant IA ; Stripe, Vercel Pro | Seuil de rentabilité atteint (${beText(recBe)}) | environ ${eur(rec.r.rows[p.betaMonths + 1].spend)} par mois |
| 2. Gmail pour tous | à partir du 10e mois, si l'effet mesuré dépasse ${fmtInt(breakEvenSubscribers(p, casaMonthly))} abonnés | Validation Google, audit CASA | Heures au-delà des vôtres | + ${eur(p.casa)} par an |
| 3. Banque directe en Premium | à ${fmtInt(p.pwTrigger)} abonnés avec Powens, ${fmtInt(p.bankTrigger)} avec Enable Banking | Le moins cher des deux au volume prévu : Powens sous ${fmtInt(p.pwIncl)} utilisateurs connectés, Enable Banking au-delà (selon le prix Powens au-delà du forfait, à obtenir par écrit) | | ${eur(p.pwFee)} par mois chez Powens ; ${eur(p.ebFee1)}, ${eur(p.ebFee2)} puis ${eur(p.ebFee3)} chez Enable Banking |
| 4. Premières personnes | quand les heures dépassent ${fmtInt(p.founderHours)} h par mois | Indépendant pour le support et les contenus, puis un salarié au-delà de ${fmtInt(p.employeeCost / p.freelanceRate)} h | Licences professionnelles validées par des entretiens | ${eur(p.freelanceRate)} de l'heure, puis ${eur(p.employeeCost)} par mois |
| 5. Licences professionnelles | quand 3 professionnels ont dit oui | Marque blanche, ${eur(p.b2bPrice)} par mois | | ${fmtInt(p.b2bSetupHours)} h par licence |

Avec les paramètres actuels, le plan ${rec.s.id} donne sur ${p.months} mois : dépenses ${eur(rec.r.summary.spend24)}, résultat **${eur(rec.r.summary.result24)}**, trésorerie à avancer ${eur(rec.r.summary.cashNeed)}, ${fmtInt(rec.r.summary.premium)} abonnés Premium à la fin, remboursé au ${month(rec.r.summary.paybackMonth)}.

**Critères d'arrêt** : si la conversion reste sous 1 % des inscrits après 3 mois de lancement, ou si le coût par actif dépasse le revenu par actif, revenir à la phase gratuite et retravailler l'offre avant de dépenser plus.

## 12. Le plan recommandé mois par mois
`);
out.push(row(["Mois", "Inscrits", "Actifs", "Premium", "Revenus nets", "Dépenses", "dont IA", "dont personnel", "Cotisations", "Résultat", "Cumul"]));
out.push(row(["---:", "---:", "---:", "---:", "---:", "---:", "---:", "---:", "---:", "---:", "---:"]));
for (const x of rec.r.rows) out.push(row([`${x.m}${x.beta ? " (bêta)" : ""}`, fmtInt(x.signups), fmtInt(x.active), fmtInt(x.paid), eur(x.revenue), eur(x.spend), eur(x.parts.ai), eur(x.parts.staff), eur(x.social), eur(x.result), eur(x.cumul)]));

out.push(`
---
Généré le ${new Date().toISOString().slice(0, 10)} par \`scripts/gen-modele.mjs\`. Ne pas modifier à la main : modifiez \`docs/model.mjs\`.
`);
fs.writeFileSync(new URL("../docs/MODELE-ECONOMIQUE.md", import.meta.url), out.join("\n"));
console.log("docs/MODELE-ECONOMIQUE.md:", scenarios.length, "scénarios");
