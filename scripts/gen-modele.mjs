// Writes docs/MODELE-ECONOMIQUE.md from docs/model.mjs, the model the masterplan page uses too.
// Run: npm run modele (after changing a parameter in docs/model.mjs).
import fs from "node:fs";
import { PARAMS, CHOICES, defaults, allScenarios, project, breakEvenSubscribers, fmtEur, fmtInt } from "../docs/model.mjs";

const p = defaults();
const scenarios = allScenarios().map((s) => ({ s, r: project(p, s) }));
const eur = (n) => fmtEur(Math.round(n));
const month = (m) => (m ? `mois ${m}` : "non atteint");
const row = (cells) => `| ${cells.join(" | ")} |`;
const byId = (id) => scenarios.find((x) => x.s.id === id);
const margin = (() => {
  const net = p.price / (1 + p.vat / 100) - (p.price * p.stripePct / 100 + p.stripeFix);
  return net - p.price / (1 + p.vat / 100) * p.socialRate / 100;
})();
const usd = (n) => n * p.usdEur;

const out = [];
out.push(`# Modèle économique et masterplan

Ce document est **généré** à partir de \`docs/model.mjs\`, le même modèle que la page dynamique \`docs/masterplan.html\` (à ouvrir dans un navigateur, ou la version publiée dans la conversation). Pour changer une hypothèse : modifiez sa valeur dans \`docs/model.mjs\`, puis lancez \`npm run modele\`. Sur la page, chaque paramètre se règle en direct.

Projection sur ${p.months} mois, dont ${p.betaMonths} mois de bêta gratuite. Montants en euros. Chaque paramètre porte sa source et son verdict ; les hypothèses sont à remplacer par les mesures de la bêta (\`docs/BETA.md\`, § 7 et 8).

## 1. Les paramètres
`);
out.push(row(["Paramètre", "Valeur", "Verdict", "Source ou remarque"]));
out.push(row(["---", "---", "---", "---"]));
for (const [, q] of Object.entries(PARAMS)) out.push(row([q.label, `${String(q.v).replace(".", ",")} ${q.unit}`, q.verdict ?? "", q.note ?? ""]));

out.push(`
## 2. Tous les scénarios, du meilleur résultat au moins bon

Chaque scénario combine trois choix : **la boîte mail** (${Object.values(CHOICES.mail).join(" ; ")}), **la banque** (${Object.values(CHOICES.bank).join(" ; ")}) et **l'acquisition** (${Object.values(CHOICES.acquisition).join(" ; ")}). « Dépenses » = ce que vous payez de votre poche (hébergement, audit, banque, publicité, domaine) ; « cotisations » = cotisations sociales sur le chiffre d'affaires ; « trésorerie à avancer » = le creux le plus bas du résultat cumulé.
`);
out.push(row(["Code", "Scénario", "Dépenses 24 mois", "Cotisations", "Revenus nets", "Résultat 24 mois", "Trésorerie à avancer", "Premium au mois 24", "Premier mois rentable", "Remboursé au", "Dépenses sous 1 000 €"]));
out.push(row(["---", "---", "---:", "---:", "---:", "---:", "---:", "---:", "---", "---", "---"]));
for (const { s, r } of [...scenarios].filter((x) => x.s.monetize !== false).sort((a, b) => b.r.summary.result24 - a.r.summary.result24)) {
  const x = r.summary;
  out.push(row([s.id, s.name, eur(x.spend24), eur(x.social24), eur(x.revenue24), `**${eur(x.result24)}**`, eur(x.cashNeed), fmtInt(x.premium), month(x.firstProfitMonth), month(x.paybackMonth), x.under1000 ? "oui" : "non"]));
}

out.push(`
**Lecture** : la publicité payée fait perdre de l'argent dans tous les cas (un inscrit rapporte moins que son coût d'acquisition avec ces hypothèses) ; la banque directe ouverte à tous coûte plus qu'elle ne rapporte ; les meilleurs résultats viennent du bouche-à-oreille, avec la banque directe réservée au Premium ou pas de banque directe du tout.

## 3. Les phases gratuites (pas de revenu)
`);
out.push(row(["Code", "Scénario", "Dépenses 24 mois", "Ce que ça permet"]));
out.push(row(["---", "---", "---:", "---"]));
const what = {
  A0: "450 testeurs actifs au plus ; Gmail par export Takeout (0 €), connexion Gmail pour 100 testeurs",
  "A-Outlook": "Comme A0, plus la connexion Outlook ouverte à tous (gratuite, sans plafond trouvé)",
  "A-Gmail": "La connexion Gmail en lecture seule ouverte à tous, 450 testeurs au plus ; validation Google et audit CASA payants",
  "A-Gmail+": "Comme A-Gmail, sans plafond de testeurs (Vercel Pro au-delà de 450 actifs)",
};
for (const { s, r } of scenarios.filter((x) => x.s.monetize === false)) out.push(row([s.id, s.name, eur(r.summary.spend24), what[s.id] ?? ""]));

// Thresholds.
const pro = usd(p.vercelPro);
const casaMonthly = p.casa / 12;
const ebFor = (min) => breakEvenSubscribers(p, min, p.ebAccount * p.bankShare / 100);
out.push(`
## 4. Les seuils où chaque dépense se rembourse

Un abonné Premium à ${String(p.price).replace(".", ",")} € rapporte **${fmtEur(margin, 2)} par mois** une fois retirés la TVA, Stripe et les cotisations.
`);
out.push(row(["Dépense", "Coût par mois", "Abonnés Premium pour la couvrir", "Quand la déclencher"]));
out.push(row(["---", "---:", "---:", "---"]));
out.push(row(["Vercel Pro", eur(pro), fmtInt(breakEvenSubscribers(p, pro)), "Au premier euro encaissé (obligatoire), ou au-delà de 450 testeurs actifs"]));
out.push(row(["Connexion Gmail pour tous (audit CASA annuel)", eur(casaMonthly), fmtInt(breakEvenSubscribers(p, casaMonthly)), "Quand la connexion Gmail apporte au moins ce nombre d'abonnés en plus que l'export (à mesurer pendant la bêta avec les 100 places de test)"]));
out.push(row(["Turso Developer", eur(usd(p.tursoDev)), fmtInt(breakEvenSubscribers(p, usd(p.tursoDev))), `Au-delà de ${fmtInt(p.tursoFreeActives)} actifs`]));
out.push(row(["Resend Pro", eur(usd(p.resendPro)), fmtInt(breakEvenSubscribers(p, usd(p.resendPro))), `Au-delà de ${fmtInt(p.resendFree)} alertes par mois`]));
for (const min of [100, 300]) out.push(row([`Enable Banking, minimum de ${eur(min)}`, eur(min), fmtInt(ebFor(min)), "Signer le contrat quand ce nombre d'abonnés est atteint, connexion réservée au Premium"]));

// Gmail focus.
const T = byId("T-R-org").r.summary, G = byId("G-R-org").r.summary, TG = byId("O>G-R-org").r.summary, O = byId("O-R-org").r.summary;
out.push(`
## 5. Laisser tous les utilisateurs se connecter à Gmail en lecture seule

La connexion en lecture seule rassure davantage qu'un export Takeout à déposer : l'utilisateur clique sur « Autoriser » chez Google, l'application ne lit que les e-mails qui ressemblent à des reçus, ne garde aucun jeton et retire son accès juste après. Mais Google ne l'autorise pour plus de 100 personnes qu'après validation :

- **plafond de 100 utilisateurs pour toute la vie du projet** tant que l'application n'est pas validée, même en « production » (confirmé : [aide Google](https://support.google.com/cloud/answer/7454865)) ;
- **vérification de la marque**, puis **vérification des accès restreints** : page d'accueil publique sur un domaine vérifié, politique de confidentialité sur le même domaine, mention « Limited Use », **vidéo de démonstration en anglais** (celles du kit de lancement servent de base) (confirmé : [vérification de la marque](https://developers.google.com/identity/protocols/oauth2/production-readiness/brand-verification), [règles des données utilisateur](https://developers.google.com/terms/api-services-user-data-policy)) ;
- **audit de sécurité CASA de niveau 2 chaque année**, fait par un laboratoire agréé ; l'auto-analyse gratuite n'existe plus (confirmé pour l'obligation, [CASA](https://appdefensealliance.dev/casa/tier-2/tier2-overview)) ; prix : 540 à 1 800 $ par an chez TAC Security, 800 à 1 200 $ chez Leviathan (partiellement vérifié, sources tierces) ;
- **délai** : quelques jours pour la marque, « plusieurs semaines » pour les accès restreints, souvent 2 à 8 semaines (partiellement vérifié) ;
- aucune portée plus étroite ne lit les reçus sans être « restreinte » (\`gmail.metadata\` l'est aussi ; confirmé : [portées Gmail](https://developers.google.com/workspace/gmail/api/auth/scopes)).

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
Avec ces hypothèses, **Outlook pour tous** donne le meilleur résultat sans avancer d'argent ; **Gmail pour tous dès le départ** apporte le plus d'abonnés mais demande d'avancer l'audit ; **Outlook, puis Gmail au 10e mois** garde le risque bas et n'engage l'audit qu'une fois l'effet mesuré.

Tout dépend de l'hypothèse « ${PARAMS.actGmail.label.charAt(0).toLowerCase() + PARAMS.actGmail.label.slice(1)} » (${p.actGmail} points contre ${p.actTakeout} pour l'export) : **mesurez-la pendant la bêta** avec les 100 places de test Gmail (taux d'analyse terminée avec la connexion, contre avec l'export). Si l'écart réel est inférieur à ${fmtInt(breakEvenSubscribers(p, casaMonthly))} abonnés par mois de différence, l'export suffit.

La connexion **Outlook** peut, elle, être ouverte à tous dès maintenant sans frais (comptes personnels : pas de plafond trouvé, mention « non vérifié » affichée ; la vérification d'éditeur Microsoft est gratuite mais demande un compte partenaire ; partiellement vérifié).

## 6. Le masterplan recommandé
`);
const rec = byId("O>G-P-org");
out.push(`| Phase | Mois | Scénario | Déclencheur pour passer à la suite | Dépense |
| --- | --- | --- | --- | --- |
| 0. Bêta gratuite | 1 à ${p.betaMonths} | A-Outlook : relevés, export Gmail, Outlook pour tous, 100 places Gmail de test pour mesurer l'effet de la connexion | Taux d'analyse terminée et intention de payer mesurés | 0 € |
| 1. Lancement payant | ${p.betaMonths + 1} à 9 | Premium ${String(p.price).replace(".", ",")} €, rapport unique ${p.oneOff} €, Stripe, Vercel Pro, bouche-à-oreille et parrainage | ${fmtInt(breakEvenSubscribers(p, casaMonthly))} abonnés de plus attendus avec Gmail | ${eur(pro)} par mois |
| 2. Gmail pour tous | à partir du 10e mois (validation en ${p.gmailDelay} mois) | Validation Google, audit CASA, connexion Gmail ouverte | Nombre d'abonnés au-dessus du seuil Enable Banking | + ${eur(p.casa)} par an |
| 3. Banque directe en Premium | quand le seuil du devis est atteint | Contrat Enable Banking, connexion directe réservée aux abonnés | | minimum du contrat + ${String(p.ebAccount).replace(".", ",")} € par compte (hypothèse) |

Avec les paramètres actuels, ce plan (${rec.s.id}) donne : dépenses ${eur(rec.r.summary.spend24)}, résultat ${eur(rec.r.summary.result24)} sur 24 mois, trésorerie à avancer ${eur(rec.r.summary.cashNeed)}, ${fmtInt(rec.r.summary.premium)} abonnés Premium au 24e mois.

**Critères d'arrêt** : si la conversion reste sous 1 % des inscrits après 3 mois de lancement, ou si le coût par actif dépasse le revenu par actif, revenir à la phase gratuite et retravailler l'offre avant de dépenser plus.

## 7. Le plan mois par mois
`);
out.push(row(["Mois", "Inscrits", "Actifs", "Premium", "Revenus nets", "Dépenses", "Cotisations", "Résultat", "Cumul"]));
out.push(row(["---:", "---:", "---:", "---:", "---:", "---:", "---:", "---:", "---:"]));
for (const x of rec.r.rows) out.push(row([`${x.m}${x.beta ? " (bêta)" : ""}`, fmtInt(x.signups), fmtInt(x.active), fmtInt(x.paid), eur(x.revenue), eur(x.spend), eur(x.social), eur(x.result), eur(x.cumul)]));

out.push(`
---
Généré le ${new Date().toISOString().slice(0, 10)} par \`scripts/gen-modele.mjs\`. Ne pas modifier à la main : modifiez \`docs/model.mjs\`.
`);
fs.writeFileSync(new URL("../docs/MODELE-ECONOMIQUE.md", import.meta.url), out.join("\n"));
console.log("docs/MODELE-ECONOMIQUE.md:", scenarios.length, "scénarios");
