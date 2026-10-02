# Modèle économique et masterplan

Ce document est **généré** à partir de `docs/model.mjs`, le même modèle que la page dynamique `docs/masterplan.html` (publiée dans la conversation). Pour changer une hypothèse : modifiez sa valeur dans `docs/model.mjs`, puis lancez `npm run modele`. Sur la page, chaque paramètre se règle en direct, et le seuil de rentabilité se calcule pour l'objectif que vous choisissez (un mois ou un nombre d'utilisateurs).

Projection sur 24 mois, dont 2 mois de bêta gratuite. Montants en euros. Chaque paramètre porte son verdict : **confirmé** (source officielle), **partiellement vérifié** (sources tierces ou tarif public non contractuel), **non vérifiable** (tarif sur devis, montant non public), **hypothèse** (à remplacer par les mesures de la bêta).

## 1. Ce que le modèle prend en compte

- **Les revenus** : Premium mensuel, Premium annuel, rapport unique, commissions d'affiliation, résiliation assistée payante, licences professionnelles.
- **Le statut** : micro-entreprise sans TVA tant que le chiffre d'affaires des 12 derniers mois reste sous 37 500 € (le prix payé reste acquis), puis TVA ; au-delà de 83 600 €, société avec expert-comptable et impôt sur les sociétés à la place des cotisations sur le chiffre d'affaires.
- **Les outils selon l'échelle** : Vercel Hobby puis Pro, Turso gratuit puis Developer puis Scaler, Resend gratuit puis Pro puis Scale, suivi d'erreurs gratuit puis payant.
- **Le personnel** : chaque tâche (support, développement, contenus, administration, vente aux professionnels) a un volume d'heures qui grandit avec les utilisateurs. L'IA en prend une part (assistant de support, assistant de code, rédaction) pour un coût mensuel ; vous donnez 40 heures par mois ; le reste est payé à des indépendants, ou à des salariés dès que c'est moins cher.
- **Le seuil de rentabilité** en utilisateurs, et ce qu'il faut pour l'atteindre à un mois donné.

## 1 bis. Les dépenses faciles à oublier, comptées

Pour ne découvrir aucune dépense après coup, le modèle compte aussi :

| Dépense | Montant retenu | Verdict | Source |
| --- | --- | --- | --- |
| Stripe Billing, pour gérer les abonnements | 0,7 % des paiements d'abonnement, en plus des frais de carte | partiellement vérifié | [Flexprice](https://flexprice.io/blog/stripe-pricing-breakdown-2026) |
| Cartes premium ou hors d'Europe | 10 % des paiements à 2,8 % + 0,25 € au lieu de 1,5 % | partiellement vérifié (part : hypothèse) | [Indy](https://www.indy.fr/guide/comptabilite-en-ligne/commerce/stripe-comptabilite/frais-stripe/) |
| Remboursements accordés | 2 % des encaissements, Stripe gardant ses frais | hypothèse | |
| Litiges (paiement contesté par la banque du client) | 0,2 % des paiements, 20 € de frais chacun plus le montant perdu | frais partiellement vérifiés, taux hypothèse | [Chargeflow](https://www.chargeflow.io/blog/stripe-dispute-fees) |
| TVA des outils étrangers, non récupérable en franchise | 20 % des factures des outils (hébergement, base, e-mails, IA, banque, audit) tant que vous ne facturez pas de TVA | partiellement vérifié, taux selon le fournisseur | [Tailride, factures OpenAI](https://tailride.so/fr/blog/telecharger-factures-openai-api) |
| Frais de change sur les factures en dollars | 2 % | hypothèse, selon votre banque | |
| Contribution à la formation professionnelle | 0,2 % du chiffre d'affaires | partiellement vérifié (0,1 à 0,3 % selon l'activité) | [entreprises.gouv.fr](https://www.entreprises.gouv.fr/espace-entreprises/faq/mon-entreprise-au-quotidien/quel-est-le-taux-de-contribution-la-formation) |
| Impôt sur le revenu, versement libératoire | 1,7 % du chiffre d'affaires, si vous le choisissez (0 pour l'ignorer) | à choisir | |
| CFE | 300 € par an, à partir de la 2e année et au-delà de 5 000 € de chiffre d'affaires | partiellement vérifié, montant selon la commune | [Superindep](https://www.superindep.fr/blog/2025/comment-etre-exonere-cfe/) |
| Compte bancaire | 0 € par mois en micro-entreprise (offres gratuites), 15 € en société | hypothèse | |
| Dépôt de la marque à l'INPI | 190 € une fois, au lancement | partiellement vérifié | [Legalplace](https://www.legalplace.fr/guides/prix-depot-marque-inpi/) |
| Création de la société, si le chiffre d'affaires dépasse le plafond micro | 195 € une fois | partiellement vérifié | [Legalplace](https://www.legalplace.fr/guides/cout-creation-sasu/) |
| Réserve pour imprévus | 5 % des dépenses | à choisir | |

Avec ces frais, un abonné Premium à 4,99 € laisse **3,32 € par mois** sans TVA due et **2,68 €** une fois la TVA due, contre 3,61 € si l'on ne compte que la carte et les cotisations.

Ne sont pas comptés : votre propre impôt sur le revenu hors versement libératoire (il dépend de votre foyer), et les dépenses que vous choisiriez en plus (publicité, salon, matériel).

## 2. Les paramètres

### Croissance et fidélité

| Paramètre | Valeur | Verdict | Source ou remarque |
| --- | --- | --- | --- |
| Durée de la projection | 24 mois |  |  |
| Bêta gratuite avant le lancement | 2 mois | hypothèse |  |
| Inscriptions le premier mois après la bêta | 100 inscrits | hypothèse |  |
| Croissance des inscriptions | 10 % par mois | hypothèse |  |
| Départs des utilisateurs gratuits | 25 % par mois | hypothèse |  |
| Résiliations Premium | 5 % par mois | hypothèse |  |

### Activation

| Paramètre | Valeur | Verdict | Source ou remarque |
| --- | --- | --- | --- |
| Activation avec relevés seulement | 30 % | hypothèse à mesurer |  |
| Activation en plus avec l'export Gmail (Takeout) | 10 points | hypothèse à mesurer |  |
| Activation en plus avec la connexion Gmail en lecture seule | 30 points | hypothèse à mesurer |  |
| Activation en plus si tout le monde connecte sa banque | 25 points | hypothèse à mesurer |  |
| Inscrits dont la boîte principale est Outlook ou Hotmail | 15 % des inscrits | hypothèse à mesurer |  |

### Prix et revenus

| Paramètre | Valeur | Verdict | Source ou remarque |
| --- | --- | --- | --- |
| Conversion en Premium des utilisateurs activés | 5 % des activés | partiellement vérifié | 5 % des activés, soit environ 2 % des inscrits avec 40 % d'activation (médiane freemium 2,1 %, RevenueCat 2025) |
| Prix Premium | 4,99 € TTC par mois | partiellement vérifié | Bankin' Plus 4,99 €, Linxo 4,49 € |
| Rapport unique sans abonnement | 9 € TTC | hypothèse |  |
| Activés qui achètent le rapport unique | 3 % des activés | hypothèse |  |
| TVA | 20 % | confirmé (taux normal français) |  |
| Cotisations micro-entreprise (prestations de services) | 21,2 % du chiffre d'affaires | confirmé (2026) | 21,2 % pour les prestations commerciales (BIC) ; 25,6 % si l'activité est déclarée en profession libérale (BNC) |

### Frais de paiement, taxes et dépenses faciles à oublier

| Paramètre | Valeur | Verdict | Source ou remarque |
| --- | --- | --- | --- |
| Stripe, part variable (cartes EEE standard) | 1,5 % | partiellement vérifié |  |
| Stripe, part fixe par paiement | 0,25 € | partiellement vérifié |  |
| Stripe Billing (gestion des abonnements, relances) | 0,7 % des abonnements | partiellement vérifié | sur les paiements d'abonnement, en plus des frais de carte |
| Paiements par carte premium ou hors d'Europe | 10 % des paiements | hypothèse |  |
| Stripe, cartes premium (2,9 à 3,15 % hors d'Europe) | 2,8 % | partiellement vérifié |  |
| Remboursements accordés (Stripe garde ses frais) | 2 % des encaissements | hypothèse |  |
| Paiements contestés par la banque du client | 0,2 % des paiements | hypothèse |  |
| Frais Stripe par litige (montant perdu en plus) | 20 € par litige | partiellement vérifié | 20 € par litige, 20 € de plus pour le contester, rendus si gagné |
| TVA payée sur les outils étrangers tant que vous ne facturez pas de TVA | 20 % | partiellement vérifié, taux selon le fournisseur | en franchise, la TVA des fournisseurs n'est pas récupérable : OpenAI facture par exemple 23 % sans numéro de TVA |
| Frais de change de la banque sur les factures en dollars | 2 % des factures en dollars | hypothèse, selon votre banque |  |
| Contribution à la formation professionnelle (micro-entreprise) | 0,2 % du chiffre d'affaires | partiellement vérifié | 0,1 à 0,3 % selon l'activité, les sources varient pour les services |
| Impôt sur le revenu, versement libératoire (prestations de services commerciales) | 1,7 % du chiffre d'affaires | à choisir | si vous le choisissez et y avez droit ; sinon l'impôt dépend de votre foyer. 0 pour l'ignorer |
| Cotisation foncière des entreprises (CFE) | 300 € par an | partiellement vérifié, montant selon la commune | exonérée l'année du premier chiffre d'affaires, puis sous 5 000 € de chiffre d'affaires ; sinon base de 250 à 1 194 € selon la commune, avant son taux |
| Compte bancaire dédié (micro-entreprise) | 0 € par mois | hypothèse | obligatoire après deux années à plus de 10 000 € ; des offres en ligne gratuites existent |
| Compte bancaire professionnel (société) | 15 € par mois | hypothèse |  |
| Dépôt de la marque à l'INPI (une classe, 10 ans) | 190 € une fois | partiellement vérifié |  |
| Création de la société (annonce légale, greffe, bénéficiaires) | 195 € une fois | partiellement vérifié |  |
| Réserve pour imprévus | 5 % des dépenses | à choisir | hausses de tarifs, oublis, frais bancaires ; 0 pour l'ignorer |

### Autres revenus

| Paramètre | Valeur | Verdict | Source ou remarque |
| --- | --- | --- | --- |
| Premium annuel | 39,99 € TTC par an | hypothèse | environ 2 mois offerts par rapport au mensuel |
| Nouveaux abonnés qui choisissent l'annuel | 40 % des nouveaux abonnés | hypothèse |  |
| Départs des abonnés annuels (non-renouvellement lissé) | 1,5 % par mois | hypothèse |  |
| Actifs qui changent d'offre (énergie, box, assurance) par l'application | 0,3 % des actifs par mois | hypothèse |  |
| Commission d'affiliation par contrat souscrit | 25 € HT par contrat | modèle confirmé, montant non vérifiable | Hello Watt, Selectra et Kelwatt déclarent être payés à la commission par les fournisseurs ; montants non publics |
| Activés qui achètent une résiliation assistée | 2 % des activés | hypothèse |  |
| Prix d'une résiliation assistée (lettre prête, envoi, suivi) | 4,99 € TTC | hypothèse |  |
| Début des licences professionnelles (marque blanche) | 12 mois | hypothèse |  |
| Nouvelles licences professionnelles | 1 licences par trimestre | hypothèse | conseillers en gestion de patrimoine, courtiers, associations de consommateurs |
| Prix d'une licence professionnelle | 149 € HT par mois | hypothèse |  |
| Licences professionnelles arrêtées | 2 % par mois | hypothèse |  |

### Statut et impôts

| Paramètre | Valeur | Verdict | Source ou remarque |
| --- | --- | --- | --- |
| Seuil de franchise de TVA (prestations de services) | 37500 € HT par an | confirmé (2026) | en dessous, pas de TVA facturée : le prix TTC reste acquis ; 41 250 € en seuil majoré |
| Plafond de la micro-entreprise (services) | 83600 € HT par an | confirmé (2026) | le modèle passe en société dès le dépassement ; en réalité, après deux années de dépassement |
| Expert-comptable en ligne (société) | 120 € HT par mois | partiellement vérifié | 80 à 150 € par mois pour une SASU sans salarié |
| Impôt sur les sociétés, taux réduit | 15 % | confirmé (2026) | jusqu'à 42 500 € de bénéfice par an |
| Impôt sur les sociétés, taux normal | 25 % | confirmé (2026) |  |
| Assurance responsabilité civile professionnelle | 15 € par mois | hypothèse |  |

### Hébergement et outils selon l'échelle

| Paramètre | Valeur | Verdict | Source ou remarque |
| --- | --- | --- | --- |
| Conversion dollar vers euro | 0,92 € pour 1 $ | hypothèse, à ajuster |  |
| Vercel Pro (obligatoire dès un revenu) | 20 $ par mois | partiellement vérifié |  |
| Actifs qui tiennent dans Vercel Hobby | 450 actifs | mesuré en local | mesuré : 16 s de calcul par actif et par mois, marge ×2 |
| Calcul facturé en plus sur Vercel Pro | 0,002 € par actif et par mois | estimation |  |
| Actifs qui tiennent dans Turso Free | 1250 actifs | estimation à partir de mesures |  |
| Turso Developer | 4,99 $ par mois | partiellement vérifié |  |
| Actifs qui tiennent dans Turso Developer | 6250 actifs | estimation | 5 fois les lectures de l'offre gratuite |
| Turso Scaler (29 $ sans engagement annuel) | 24,92 $ par mois | partiellement vérifié |  |
| Nom de domaine | 12 € par an | estimation |  |
| Resend gratuit | 3000 e-mails par mois | partiellement vérifié |  |
| Resend Pro | 20 $ par mois | partiellement vérifié |  |
| Resend Scale (100 000 e-mails) | 90 $ par mois | partiellement vérifié | Pro : 50 000 e-mails ; au-delà de 100 000, 0,90 $ les 1 000 |
| Alertes envoyées par abonné Premium | 4 e-mails par mois | hypothèse |  |
| E-mails de service par actif (lien de connexion, bilan) | 2 e-mails par mois | hypothèse |  |
| Actifs couverts par le suivi d'erreurs gratuit | 5000 actifs | estimation |  |
| Sentry Team (suivi des erreurs) | 26 $ par mois | partiellement vérifié |  |
| IA dans le produit (libellés inconnus, reçus) | 0,003 € par actif et par mois | estimation |  |

### Personnel et IA

| Paramètre | Valeur | Verdict | Source ou remarque |
| --- | --- | --- | --- |
| Heures que vous donnez au projet (non payées) | 40 heures par mois | hypothèse |  |
| Rémunération que vous vous versez après le lancement | 0 € par mois | à choisir | 0 : le résultat est ce qui reste pour vous |
| Demandes d'aide | 3 par 100 actifs et par mois | hypothèse |  |
| Temps humain par demande | 12 minutes | hypothèse |  |
| Demandes réglées par l'assistant IA | 50 % des demandes | partiellement vérifié | Intercom annonce 71 à 76 % ; 45 à 53 % observés en production |
| Coût IA d'une demande d'aide | 0,06 € par demande | calculé sur le tarif de l'API | Claude Sonnet 5 à 2 $ et 10 $ le million de jetons lus et écrits, environ 3 échanges de 6 000 jetons lus et 800 écrits |
| Développement et maintenance, base | 30 heures par mois | hypothèse |  |
| Développement en plus avec l'échelle | 2 heures par 1 000 actifs | hypothèse |  |
| Temps de développement gagné avec un assistant de code | 30 % | hypothèse |  |
| Assistant de code (Claude Max 5x) | 100 $ par mois | partiellement vérifié |  |
| Contenus, réseaux, fiches des sites de mise en avant | 20 heures par mois | hypothèse |  |
| Temps de contenu gagné avec l'IA | 50 % | hypothèse |  |
| Assistant de rédaction (Claude Pro) | 20 $ par mois | partiellement vérifié |  |
| Administration, comptabilité, conformité | 4 heures par mois | hypothèse |  |
| Administration en plus avec l'échelle | 1 heures par 1 000 actifs | hypothèse |  |
| Temps d'administration gagné avec l'IA | 30 % | hypothèse |  |
| Vente et installation d'une licence professionnelle | 12 heures par licence | hypothèse |  |
| Suivi d'une licence professionnelle | 1 heures par licence et par mois | hypothèse |  |
| Indépendant (support, contenu, développement) | 35 € HT de l'heure | hypothèse |  |
| Coût employeur d'un salarié à temps plein | 2600 € par mois | partiellement vérifié (SMIC), hypothèse (profil) | un salarié au SMIC coûte environ 1 975 € par mois en 2026 ; 2 600 € pour un profil qualifié |
| Temps plein (35 heures par semaine) | 151,67 heures par mois | confirmé |  |

### Gmail pour tous

| Paramètre | Valeur | Verdict | Source ou remarque |
| --- | --- | --- | --- |
| Audit de sécurité CASA pour Gmail (niveau 2, puis chaque année) | 700 € par an | partiellement vérifié (sources tierces) | TAC Security : 540 $ (Basic), 720 $ (Premium, nouveaux passages illimités), 1 800 $ (Enterprise) ; Leviathan 800 à 1 200 $. Pas de voie gratuite depuis la fin de l'auto-analyse |
| Délai de validation Google avant d'ouvrir Gmail à tous | 2 mois | partiellement vérifié | vérification de la marque en quelques jours, accès restreint « plusieurs semaines » selon Google, 2 à 8 semaines d'après des retours d'expérience |

### Banque directe (Enable Banking, Powens)

| Paramètre | Valeur | Verdict | Source ou remarque |
| --- | --- | --- | --- |
| Enable Banking, licence la 1re année (remise de 40 %) | 900 € par mois | confirmé (offre écrite) | offre écrite Enable Banking « Startup Offer 2026 », septembre 2026 |
| Comptes actifs inclus la 1re année | 1800 comptes | confirmé (offre écrite) |  |
| Enable Banking, licence la 2e année | 1200 € par mois | confirmé (offre écrite) |  |
| Comptes actifs inclus la 2e année | 2400 comptes | confirmé (offre écrite) |  |
| Enable Banking, licence à partir de la 3e année (tarif normal) | 1500 € par mois | confirmé (offre écrite) |  |
| Comptes actifs inclus à partir de la 3e année | 3000 comptes | confirmé (offre écrite) |  |
| Compte au-delà du quota, jusqu'au 5 000e | 0,5 € par compte et par mois | confirmé (offre écrite), tranches à confirmer | un compte = un IBAN unique avec un consentement valide, interrogé dans le mois ; reconnexions non recomptées ; le modèle applique les prix par tranche (chaque compte au prix de son rang), lecture de l'offre à confirmer |
| Compte du 5 001e au 50 000e | 0,3 € par compte et par mois | confirmé (offre écrite) |  |
| Compte au-delà du 50 000e | 0,2 € par compte et par mois | confirmé (offre écrite) |  |
| Abonnés Premium à partir desquels signer le contrat (scénarios « au seuil ») | 2800 abonnés Premium | calculé, à choisir | la licence ne se paie que par les abonnés en plus que la banque apporte : licence × conversion ÷ (conversion en plus × marge d'un abonné), soit environ 2 800 pour 1 500 € avec la TVA due |
| Comptes bancaires reliés par utilisateur (Enable Banking facture les comptes, Powens les utilisateurs) | 1,3 comptes par utilisateur | hypothèse à mesurer |  |
| Powens, forfait mensuel | 900 € par mois | non vérifiable (oral) | annoncé oralement par Powens le 1er octobre 2026, à faire confirmer par écrit (durée, évolution, prix au-delà) |
| Utilisateurs inclus dans le forfait Powens (connexions illimitées) | 1000 utilisateurs | non vérifiable (oral) |  |
| Powens, utilisateur au-delà du forfait | 0,9 € par utilisateur et par mois | hypothèse | non communiqué : le modèle prend le prix moyen du forfait |
| Abonnés Premium à partir desquels signer avec Powens (scénarios « au seuil ») | 1700 abonnés Premium | calculé, à choisir | forfait × conversion ÷ (conversion en plus × marge d'un abonné), soit environ 1 700 pour 900 € avec la TVA due |
| Conversion en Premium en plus quand la banque directe y est incluse | 1 points | hypothèse à mesurer |  |
| Part des concernés qui connectent leur banque | 60 % | hypothèse |  |

### Publicité

| Paramètre | Valeur | Verdict | Source ou remarque |
| --- | --- | --- | --- |
| Coût d'acquisition en publicité payée | 1,5 € par inscrit | hypothèse |  |
| Inscriptions multipliées par la publicité | 2 × | hypothèse |  |

## 3. Les scénarios réalistes

Tous en bouche-à-oreille, Outlook ouvert à tous (export pour Gmail), banque directe réservée au Premium et contrat Enable Banking signé seulement à 2 800 abonnés (jamais atteint en 24 mois, sauf mention), IA d'abord sauf mention contraire. Chacun change une chose par rapport au scénario central.

| Code | Scénario | Dépenses 24 mois | Résultat 24 mois | Trésorerie à avancer | Premium au mois 24 | Remboursé au | Seuil de rentabilité (régime stable) |
| --- | --- | ---: | ---: | ---: | ---: | --- | --- |
| R9-sobre | Central sobre : un seul assistant IA à 20 $ par mois, sans assurance | 1 620 € | **2 685 €** | 253 € | 123 | mois 12 | 27 inscrits par mois, 59 actifs, 15 Premium |
| R8-ambitieux | Ambitieux : tout, Gmail pour tous au 10e mois, croissance 15 % par mois | 10 525 € | **2 209 €** | 2 049 € | 336 | mois 20 | atteint sans utilisateurs (licences seules) |
| R6-pro | Central plus licences professionnelles dès le 12e mois | 5 914 € | **1 506 €** | 1 272 € | 123 | mois 21 | atteint sans utilisateurs (licences seules) |
| R2-central | Central : Premium, annuel, affiliation et résiliation assistée | 4 267 € | **39 €** | 1 357 € | 123 | mois 24 | 101 inscrits par mois, 223 actifs, 57 Premium |
| R5-premium-cher | Premium à 7,99 €, conversion 3,5 %, annuel à 59,99 € | 4 266 € | **-387 €** | 1 510 € | 86 | non atteint | 101 inscrits par mois, 207 actifs, 40 Premium |
| R7-lent | Central avec une croissance lente, 4 % par mois | 4 232 € | **-1 829 €** | 1 865 € | 55 | non atteint | 101 inscrits par mois, 223 actifs, 57 Premium |
| R1-prudent | Prudent (test de résistance) : Premium mensuel et annuel, conversion 3 %, croissance 6 % par mois | 4 238 € | **-2 661 €** | 2 661 € | 43 | non atteint | 180 inscrits par mois, 361 actifs, 61 Premium |
| R4-gratuit-affil | Gratuit pour tous, payé par l'affiliation (aucun Premium) | 4 263 € | **-3 360 €** | 3 360 € | 0 | non atteint | 42 934 inscrits par mois, 73 846 actifs, 0 Premium |
| R3-sans-IA | Central sans IA : même offre, tout le travail fait par des personnes | 15 741 € | **-11 435 €** | 11 435 € | 123 | non atteint | 568 inscrits par mois, 1 248 actifs, 320 Premium |
| R11-powens-tot | Sobre, mais contrat Powens signé dès le lancement | 26 609 € | **-21 708 €** | 21 708 € | 147 | non atteint | 674 inscrits par mois, 1 545 actifs, 456 Premium |
| R10-banque-tot | Sobre, mais contrat Enable Banking signé dès le lancement | 30 389 € | **-25 488 €** | 25 488 € | 147 | non atteint | 1 197 inscrits par mois, 2 744 actifs, 809 Premium |

**Lecture** :

- **Le travail coûte plus que les serveurs.** Sans IA (R3), les heures au-delà des vôtres partent chez des indépendants dès le lancement : le même scénario perd de l'argent sur 24 mois. Avec un seul assistant à 20 $ (R9), le seuil tombe à quelques dizaines d'inscrits par mois.
- **L'affiliation seule ne suffit pas** (R4) : il faut des dizaines de milliers d'actifs pour couvrir le travail. Elle complète le Premium, elle ne le remplace pas.
- **Les licences professionnelles** (R6, R8) rendent le projet rentable même avec peu d'utilisateurs, si 1 licence par trimestre à 149 € par mois se vend vraiment : c'est l'hypothèse la plus fragile, à tester par 5 entretiens avant d'y consacrer du temps.
- **Un prix plus haut** (R5, 7,99 €) donne -387 € sur 24 mois contre 39 € pour le central, avec environ 30 % d'abonnés en moins : à tester avec deux prix pendant le lancement plutôt qu'à supposer.

## 4. Le seuil de rentabilité

**En régime stable** (inscriptions constantes, tout s'est tassé : paliers d'outils, TVA, personnel), le scénario central couvre ses coûts à partir de **101 inscrits par mois, 223 actifs, 57 Premium**. Un abonné Premium à 4,99 € rapporte 3,32 € par mois sans TVA due, 2,68 € une fois la TVA due (Stripe et Stripe Billing, remboursements, litiges, cotisations, formation professionnelle et versement libératoire déduits).

**Pour atteindre un objectif à une date** (scénario central, 100 inscrits le premier mois après la bêta et 10 % de croissance par mois dans les hypothèses actuelles) :

| Objectif | Inscrits le 1er mois nécessaires (croissance actuelle) | Ou croissance nécessaire (inscrits actuels) |
| --- | ---: | ---: |
| Mois 12 rentable | 140 | 15,6 % par mois |
| Investissement remboursé au mois 18 | 162 | 17 % par mois |
| Investissement remboursé au mois 24 | 100 | 9,9 % par mois |

Sur la page, choisissez votre objectif (un mois, ou un nombre d'actifs) : elle calcule la même chose pour n'importe quel scénario et peut appliquer la valeur trouvée à vos hypothèses.

Seuil de chaque scénario de la matrice (régime stable) :

| Code | Seuil |
| --- | --- |
| O>G-R-org | 132 inscrits par mois, 375 actifs, 73 Premium |
| O>G-P-org | 1 233 inscrits par mois, 3 604 actifs, 821 Premium |
| T-R-org | 139 inscrits par mois, 263 actifs, 52 Premium |
| T-P-org | 1 747 inscrits par mois, 3 413 actifs, 786 Premium |
| T-T-org | 1 075 inscrits par mois, 3 413 actifs, 786 Premium |
| G-R-org | 131 inscrits par mois, 372 actifs, 73 Premium |
| G-P-org | 1 215 inscrits par mois, 3 559 actifs, 819 Premium |
| G-T-org | 857 inscrits par mois, 3 557 actifs, 818 Premium |
| O-R-org | 129 inscrits par mois, 263 actifs, 52 Premium |
| O-P-org | 1 625 inscrits par mois, 3 413 actifs, 786 Premium |
| O-T-org | 1 027 inscrits par mois, 3 413 actifs, 786 Premium |

Avec la publicité payée, un inscrit coûte 1,50 € et rapporte moins : le seuil n'est atteint que très loin, ou jamais.

## 5. Les coûts selon l'échelle

Un mois type, une fois les utilisateurs stabilisés à chaque taille. Les outils changent de palier, la TVA puis la société arrivent avec le chiffre d'affaires, et le personnel passe des indépendants aux salariés quand un temps plein devient moins cher (2 600 € par mois contre 35 € de l'heure).

La part de Premium parmi les actifs y est élevée (environ un quart) parce que 25 % des gratuits partent chaque mois alors que les abonnés restent : si la bêta mesure des gratuits plus fidèles, la part baisse et les revenus par actif aussi.

### Plan recommandé (R9-sobre)

| Actifs | 500 | 2 000 | 10 000 | 50 000 | 200 000 |
| --- | ---: | ---: | ---: | ---: | ---: |
| Inscrits par mois | 228 | 910 | 4 551 | 22 754 | 91 017 |
| Abonnés Premium | 128 | 513 | 2 564 | 15 224 | 61 362 |
| Revenus nets par mois | 548 € | 2 193 € | 9 114 € | 53 090 € | 213 703 € |
| Hébergement, base, e-mails, suivi | 20 € | 46 € | 104 € | 311 € | 1 050 € |
| IA (support, assistants, produit) | 21 € | 28 € | 67 € | 271 € | 1 032 € |
| Heures de travail (dont payées) | 39 h (0 h) | 48 h (8 h) | 90 h (50 h) | 316 h (276 h) | 1 156 h (1 116 h) |
| Personnel payé | 0 € | 263 €, indépendants (moins de 0,1 ETP) | 1 764 €, indépendants (0,3 ETP) | 5 200 €, salariés (2 ETP) | 20 800 €, salariés (8 ETP) |
| Banque, comptable, assurance | 0 € | 0 € | 135 € | 4 859 € | 16 125 € |
| Statut | micro, sans TVA | micro, sans TVA | société, TVA | société, TVA | société, TVA |
| Cotisations ou impôt | 142 € | 566 € | 1 807 € | 10 962 € | 45 094 € |
| **Résultat par mois** | **334 €** | **1 253 €** | **5 200 €** | **31 542 €** | **130 030 €** |
| Marge | 61 % | 57 % | 57 % | 59 % | 61 % |

### Scénario central (R2), IA d'abord

| Actifs | 500 | 2 000 | 10 000 | 50 000 | 200 000 |
| --- | ---: | ---: | ---: | ---: | ---: |
| Inscrits par mois | 228 | 910 | 4 551 | 22 754 | 91 017 |
| Abonnés Premium | 128 | 513 | 2 564 | 15 224 | 61 362 |
| Revenus nets par mois | 548 € | 2 193 € | 9 114 € | 53 090 € | 213 703 € |
| Hébergement, base, e-mails, suivi | 20 € | 46 € | 104 € | 311 € | 1 050 € |
| IA (support, assistants, produit) | 113 € | 120 € | 159 € | 363 € | 1 124 € |
| Heures de travail (dont payées) | 36 h (0 h) | 44 h (4 h) | 85 h (45 h) | 303 h (263 h) | 1 111 h (1 071 h) |
| Personnel payé | 0 € | 144 €, indépendants (moins de 0,1 ETP) | 1 588 €, indépendants (0,3 ETP) | 5 200 €, salariés (2 ETP) | 20 800 €, salariés (8 ETP) |
| Banque, comptable, assurance | 15 € | 15 € | 150 € | 4 874 € | 16 140 € |
| Statut | micro, sans TVA | micro, sans TVA | société, TVA | société, TVA | société, TVA |
| Cotisations ou impôt | 142 € | 566 € | 1 825 € | 10 933 € | 45 066 € |
| **Résultat par mois** | **200 €** | **1 245 €** | **5 252 €** | **31 457 €** | **131 309 €** |
| Marge | 37 % | 57 % | 58 % | 59 % | 61 % |

### Même scénario sans IA (R3)

| Actifs | 500 | 2 000 | 10 000 | 50 000 | 200 000 |
| --- | ---: | ---: | ---: | ---: | ---: |
| Inscrits par mois | 228 | 910 | 4 551 | 22 754 | 91 017 |
| Abonnés Premium | 128 | 513 | 2 564 | 15 224 | 61 362 |
| Revenus nets par mois | 548 € | 2 193 € | 9 114 € | 53 090 € | 213 703 € |
| Hébergement, base, e-mails, suivi | 20 € | 46 € | 104 € | 311 € | 1 050 € |
| IA (support, assistants, produit) | 2 € | 6 € | 30 € | 158 € | 634 € |
| Heures de travail (dont payées) | 59 h (19 h) | 72 h (32 h) | 145 h (105 h) | 528 h (488 h) | 1 955 h (1 915 h) |
| Personnel payé | 649 €, indépendants (0,1 ETP) | 1 127 €, indépendants (0,2 ETP) | 2 600 €, salariés (1 ETP) | 10 400 €, salariés (4 ETP) | 33 800 €, salariés (13 ETP) |
| Banque, comptable, assurance | 15 € | 15 € | 150 € | 4 874 € | 16 140 € |
| Statut | micro, sans TVA | micro, sans TVA | société, TVA | société, TVA | société, TVA |
| Cotisations ou impôt | 142 € | 566 € | 1 594 € | 9 623 € | 41 785 € |
| **Résultat par mois** | **-337 €** | **362 €** | **4 543 €** | **27 526 €** | **120 097 €** |
| Marge | -62 % | 16 % | 50 % | 52 % | 56 % |

**Ce que l'IA remplace, et ce qu'elle ne remplace pas** :

| Tâche | Avec l'IA | Coût IA | Reste humain |
| --- | --- | --- | --- |
| Support | l'assistant répond aux questions courantes (50 % des demandes, partiellement vérifié) | 0,06 € par demande | cas de litige, remboursements, bugs |
| Développement | assistant de code, 30 % de temps gagné (hypothèse) | 92 € par mois | décisions d'architecture, sécurité, relecture |
| Contenus | rédaction, déclinaisons, fiches, 50 % de temps gagné (hypothèse) | 18 € par mois | relecture, ton, validation |
| Administration | tri des factures, relances, 30 % de temps gagné (hypothèse) | inclus | comptable et déclarations (obligations légales) |
| Vente aux professionnels | aucune part (hypothèse prudente) | | rendez-vous, négociation, installation |
| Libellés inconnus, reçus | analyse automatique dans le produit | 0,003 € par actif et par mois | confirmation par l'utilisateur |

Le premier recrutement arrive quand les heures dépassent les vôtres : d'abord quelques heures d'indépendant (support et contenus), puis un premier salarié quand plus de 74 heures par mois sont nécessaires.

## 6. Les options de monétisation

| Option | Retenue | Pourquoi |
| --- | --- | --- |
| Premium mensuel (4,99 €) | oui | cœur du modèle, prix du marché (Bankin' Plus 4,99 €, Linxo 4,49 €, partiellement vérifié) |
| Premium annuel (39,99 €) | oui | trésorerie d'avance, moins de départs, un seul paiement Stripe par an |
| Rapport unique (9 €) | oui | pour ceux qui ne veulent pas d'abonnement, ce qui est le sujet de l'application |
| Résiliation assistée (4,99 €) | oui | lettre ou e-mail prêt, envoi et suivi ; l'IA rédige, le coût est faible |
| Affiliation (énergie, box, assurance) | oui, en complément | modèle des comparateurs (confirmé), commission non publique ; à signaler clairement à l'utilisateur |
| Licences professionnelles | oui, à valider | conseillers en gestion de patrimoine, courtiers, associations ; hypothèse la plus fragile |
| Offre famille | plus tard | utile quand l'application gérera plusieurs comptes |
| Publicité dans l'application | non | contraire à la promesse de confiance, revenu faible à cette échelle |
| Revente de données | non | contraire à la promesse, au RGPD et aux règles Google (« Limited Use ») |
| Paiement dans les magasins d'applications | non | 15 % de commission au lieu de 1,5 % + 0,25 € avec Stripe |

## 7. Tous les scénarios, du meilleur résultat au moins bon

Chaque scénario combine **la boîte mail** (Export Gmail (Takeout) ; Connexion Gmail pour tous ; Outlook pour tous, export pour Gmail), **la banque** (Relevés seulement ; Banque directe en Premium ; Banque directe pour tous), **l'acquisition** (Bouche-à-oreille ; Publicité payée), **l'offre** et **le personnel**. Sans mention, l'offre est « Premium mensuel et rapport unique » et le personnel « IA d'abord, puis indépendants ou salariés ». « Dépenses » = ce que vous payez de votre poche (outils, IA, personnel, audit, banque, publicité, comptable) ; « cotisations » = cotisations sociales ou impôt sur les sociétés ; « trésorerie à avancer » = le creux le plus bas du résultat cumulé.

| Code | Scénario | Dépenses 24 mois | Cotisations | Revenus nets | Résultat 24 mois | Trésorerie à avancer | Premium au mois 24 | Premier mois rentable | Remboursé au |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| R9-sobre | Central sobre : un seul assistant IA à 20 $ par mois, sans assurance | 1 620 € | 1 431 € | 5 737 € | **2 685 €** | 253 € | 123 | mois 6 | mois 12 |
| R8-ambitieux | Ambitieux : tout, Gmail pour tous au 10e mois, croissance 15 % par mois | 10 525 € | 4 159 € | 16 893 € | **2 209 €** | 2 049 € | 336 | mois 12 | mois 20 |
| R6-pro | Central plus licences professionnelles dès le 12e mois | 5 914 € | 2 396 € | 9 816 € | **1 506 €** | 1 272 € | 123 | mois 13 | mois 21 |
| R2-central | Central : Premium, annuel, affiliation et résiliation assistée | 4 267 € | 1 431 € | 5 737 € | **39 €** | 1 357 € | 123 | mois 15 | mois 24 |
| R5-premium-cher | Premium à 7,99 €, conversion 3,5 %, annuel à 59,99 € | 4 266 € | 1 284 € | 5 163 € | **-387 €** | 1 510 € | 86 | mois 16 | non atteint |
| O-R-org | Outlook pour tous, export pour Gmail, relevés seulement, bouche-à-oreille | 4 266 € | 1 277 € | 4 983 € | **-560 €** | 1 539 € | 112 | mois 16 | non atteint |
| T-R-org | Export Gmail (Takeout), relevés seulement, bouche-à-oreille | 4 261 € | 1 188 € | 4 635 € | **-813 €** | 1 623 € | 104 | mois 17 | non atteint |
| G-R-org | Connexion Gmail pour tous, relevés seulement, bouche-à-oreille | 6 237 € | 1 782 € | 6 953 € | **-1 066 €** | 2 933 € | 156 | mois 15 | non atteint |
| O>G-R-org | Outlook pour tous et export Gmail, puis connexion Gmail pour tous au 10e mois, relevés seulement, bouche-à-oreille | 6 241 € | 1 611 € | 6 290 € | **-1 562 €** | 2 352 € | 151 | mois 15 | non atteint |
| R7-lent | Central avec une croissance lente, 4 % par mois | 4 232 € | 799 € | 3 201 € | **-1 829 €** | 1 865 € | 55 | mois 22 | non atteint |
| R1-prudent | Prudent (test de résistance) : Premium mensuel et annuel, conversion 3 %, croissance 6 % par mois | 4 238 € | 530 € | 2 107 € | **-2 661 €** | 2 661 € | 43 | non atteint | non atteint |
| R4-gratuit-affil | Gratuit pour tous, payé par l'affiliation (aucun Premium) | 4 263 € | 271 € | 1 174 € | **-3 360 €** | 3 360 € | 0 | non atteint | non atteint |
| R3-sans-IA | Central sans IA : même offre, tout le travail fait par des personnes | 15 741 € | 1 431 € | 5 737 € | **-11 435 €** | 11 435 € | 123 | non atteint | non atteint |
| G-R-pub | Connexion Gmail pour tous, relevés seulement, publicité payée | 30 564 € | 3 563 € | 13 906 € | **-20 221 €** | 20 221 € | 313 | non atteint | non atteint |
| O-R-pub | Outlook pour tous, export pour Gmail, relevés seulement, publicité payée | 27 683 € | 2 554 € | 9 966 € | **-20 271 €** | 20 271 € | 224 | non atteint | non atteint |
| T-R-pub | Export Gmail (Takeout), relevés seulement, publicité payée | 27 483 € | 2 375 € | 9 271 € | **-20 588 €** | 20 588 € | 208 | non atteint | non atteint |
| R11-powens-tot | Sobre, mais contrat Powens signé dès le lancement | 26 609 € | 1 632 € | 6 534 € | **-21 708 €** | 21 708 € | 147 | non atteint | non atteint |
| R10-banque-tot | Sobre, mais contrat Enable Banking signé dès le lancement | 30 389 € | 1 632 € | 6 534 € | **-25 488 €** | 25 488 € | 147 | non atteint | non atteint |
| O-T-org | Outlook pour tous, export pour Gmail, banque directe pour tous, bouche-à-oreille | 33 462 € | 2 362 € | 9 212 € | **-26 612 €** | 26 612 € | 213 | non atteint | non atteint |
| T-T-org | Export Gmail (Takeout), banque directe pour tous, bouche-à-oreille | 33 402 € | 2 258 € | 8 806 € | **-26 854 €** | 26 854 € | 203 | non atteint | non atteint |
| G-T-org | Connexion Gmail pour tous, banque directe pour tous, bouche-à-oreille | 35 697 € | 2 953 € | 11 516 € | **-27 134 €** | 27 134 € | 266 | non atteint | non atteint |
| O-P-org | Outlook pour tous, export pour Gmail, banque directe en premium, bouche-à-oreille | 32 995 € | 1 494 € | 5 826 € | **-28 664 €** | 28 664 € | 134 | non atteint | non atteint |
| T-P-org | Export Gmail (Takeout), banque directe en premium, bouche-à-oreille | 32 990 € | 1 390 € | 5 419 € | **-28 960 €** | 28 960 € | 125 | non atteint | non atteint |
| G-P-org | Connexion Gmail pour tous, banque directe en premium, bouche-à-oreille | 35 025 € | 2 084 € | 8 129 € | **-28 981 €** | 28 981 € | 188 | non atteint | non atteint |
| O>G-P-org | Outlook pour tous et export Gmail, puis connexion Gmail pour tous au 10e mois, banque directe en premium, bouche-à-oreille | 35 027 € | 1 883 € | 7 344 € | **-29 566 €** | 29 566 € | 182 | non atteint | non atteint |
| O-T-pub | Outlook pour tous, export pour Gmail, banque directe pour tous, publicité payée | 58 403 € | 4 725 € | 18 425 € | **-44 703 €** | 44 703 € | 425 | non atteint | non atteint |
| T-T-pub | Export Gmail (Takeout), banque directe pour tous, publicité payée | 58 084 € | 4 516 € | 17 612 € | **-44 988 €** | 44 988 € | 406 | non atteint | non atteint |
| G-T-pub | Connexion Gmail pour tous, banque directe pour tous, publicité payée | 62 552 € | 5 906 € | 23 031 € | **-45 427 €** | 45 427 € | 532 | non atteint | non atteint |
| G-P-pub | Connexion Gmail pour tous, banque directe en premium, publicité payée | 59 385 € | 4 169 € | 16 257 € | **-47 297 €** | 47 297 € | 375 | non atteint | non atteint |
| O-P-pub | Outlook pour tous, export pour Gmail, banque directe en premium, publicité payée | 56 461 € | 2 988 € | 11 651 € | **-47 797 €** | 47 797 € | 269 | non atteint | non atteint |
| T-P-pub | Export Gmail (Takeout), banque directe en premium, publicité payée | 56 309 € | 2 779 € | 10 838 € | **-48 250 €** | 48 250 € | 250 | non atteint | non atteint |

**Lecture** : la publicité payée fait perdre de l'argent dans tous les cas ; la banque directe signée dès le lancement (combinaisons P et T) coûte la licence Enable Banking chaque mois et fait perdre de l'argent sur 24 mois ; les meilleurs résultats viennent du bouche-à-oreille, d'une offre qui ne dépend pas du seul Premium mensuel, et de l'IA pour le travail répétitif.

## 8. Les phases gratuites (pas de revenu)

| Code | Scénario | Dépenses 24 mois | Ce que ça permet |
| --- | --- | ---: | --- |
| A0 | Gratuit, export Gmail, 450 testeurs au plus | 0 € | 450 testeurs actifs au plus ; Gmail par export Takeout (0 €), connexion Gmail pour 100 testeurs |
| A-Gmail | Gratuit, connexion Gmail pour tous, 450 testeurs au plus | 1 732 € | La connexion Gmail en lecture seule ouverte à tous, 450 testeurs au plus ; validation Google et audit CASA payants |
| A-Outlook | Gratuit, connexion Outlook pour tous et export pour Gmail, 450 testeurs au plus | 0 € | Comme A0, plus la connexion Outlook ouverte à tous (gratuite, sans plafond trouvé) |
| A-Gmail+ | Gratuit, connexion Gmail pour tous, sans plafond | 2 922 € | Comme A-Gmail, sans plafond de testeurs : Vercel Pro, et des heures d'aide payées au-delà des vôtres |

## 9. Les seuils où chaque dépense se rembourse

Nombre d'abonnés Premium à 4,99 € (sans TVA due, cotisations déduites) pour couvrir chaque dépense. Les coûts des outils étrangers sont indiqués hors TVA non récupérable et hors frais de change : ces deux frais s'y ajoutent (§ 1 bis).

| Dépense | Coût par mois | Abonnés Premium pour la couvrir | Quand la déclencher |
| --- | ---: | ---: | --- |
| Vercel Pro | 18 € | 6 | Au premier euro encaissé (obligatoire), ou au-delà de 450 testeurs actifs |
| Assistant de code et de rédaction | 110 € | 34 | Quand il économise plus d'heures payées qu'il ne coûte |
| Connexion Gmail pour tous (audit CASA annuel) | 58 € | 18 | Quand la connexion Gmail apporte au moins ce nombre d'abonnés en plus que l'export |
| Expert-comptable (société) | 120 € | 45 | Au passage en société (au-delà de 83 600 € de chiffre d'affaires) |
| Turso Developer | 5 € | 2 | Au-delà de 1 250 actifs |
| Resend Pro | 18 € | 6 | Au-delà de 3 000 e-mails par mois |
| Un salarié à temps plein | 2 600 € | 970 | Quand plus de 74 heures payées par mois sont nécessaires |
| Licence Enable Banking, 1re année | 900 € | 271 (336 avec TVA) | Mais seuls les abonnés en plus grâce à la banque la paient : voir § 10 bis |
| Licence Enable Banking, 2e année | 1 200 € | 362 (448 avec TVA) | Mais seuls les abonnés en plus grâce à la banque la paient : voir § 10 bis |
| Licence Enable Banking, 3e année et après | 1 500 € | 452 (560 avec TVA) | Mais seuls les abonnés en plus grâce à la banque la paient : voir § 10 bis |

## 10. Laisser tous les utilisateurs se connecter à Gmail en lecture seule

La connexion en lecture seule rassure davantage qu'un export Takeout à déposer : l'utilisateur clique sur « Autoriser » chez Google, l'application ne lit que les e-mails qui ressemblent à des reçus, ne garde aucun jeton et retire son accès juste après. Mais Google ne l'autorise pour plus de 100 personnes qu'après validation :

- **plafond de 100 utilisateurs pour toute la vie du projet** tant que l'application n'est pas validée, même en « production » (confirmé : [aide Google](https://support.google.com/cloud/answer/7454865)) ;
- **vérification de la marque**, puis **vérification des accès restreints** : page d'accueil publique sur un domaine vérifié, politique de confidentialité sur le même domaine, mention « Limited Use », **vidéo de démonstration en anglais** (confirmé : [vérification de la marque](https://developers.google.com/identity/protocols/oauth2/production-readiness/brand-verification), [règles des données utilisateur](https://developers.google.com/terms/api-services-user-data-policy)) ;
- **audit de sécurité CASA de niveau 2 chaque année**, fait par un laboratoire agréé (confirmé pour l'obligation, [CASA](https://appdefensealliance.dev/casa/tier-2/tier2-overview)) ; prix : 540 à 1 800 $ par an chez TAC Security, 800 à 1 200 $ chez Leviathan (partiellement vérifié, sources tierces) ;
- **délai** : quelques jours pour la marque, souvent 2 à 8 semaines pour les accès restreints (partiellement vérifié).

Comparaison, relevés seulement et bouche-à-oreille :

|  | Export Takeout (T-R-org) | Outlook pour tous (O-R-org) | Gmail pour tous dès le départ (G-R-org) | Outlook, puis Gmail au 10e mois (O>G-R-org) |
| --- | ---: | ---: | ---: | ---: |
| Dépenses 24 mois | 4 261 € | 4 266 € | 6 237 € | 6 241 € |
| Résultat 24 mois | -813 € | -560 € | -1 066 € | -1 562 € |
| Trésorerie à avancer | 1 623 € | 1 539 € | 2 933 € | 2 352 € |
| Premium au mois 24 | 104 | 112 | 156 | 151 |
| Remboursé au | non atteint | non atteint | non atteint | non atteint |

Tout dépend de l'hypothèse « activation en plus avec la connexion Gmail en lecture seule » (30 points contre 10 pour l'export) : **mesurez-la pendant la bêta** avec les 100 places de test Gmail. Si l'écart réel apporte moins de 18 abonnés, l'export suffit.

## 10 bis. La connexion bancaire directe (Enable Banking)

Offre écrite reçue d'Enable Banking (« Startup Offer 2026 », septembre 2026, verdict : confirmé) : une **licence mensuelle qui inclut un quota de comptes actifs**, avec une remise la 1re année, puis un prix par compte au-delà du quota, dégressif avec le volume. Enable Banking est agréé comme prestataire d'information sur les comptes (DSP2) et laisse les jeunes entreprises travailler sous son agrément : pas d'agrément à demander à l'ACPR. Un compte est facturé une fois par mois s'il a un consentement valide et qu'il est interrogé dans le mois ; le même IBAN reconnecté n'est pas recompté. Les tests avec vos propres comptes restent gratuits.

| | 1re année | 2e année | 3e année et après |
| --- | ---: | ---: | ---: |
| Licence par mois | 900 € | 1 200 € | 1 500 € |
| Comptes actifs inclus | 1 800 | 2 400 | 3 000 |
| Compte en plus | 0,50 € jusqu'au 5 000e, 0,30 € jusqu'au 50 000e, 0,20 € au-delà (le modèle facture chaque compte au prix de sa tranche ; à confirmer si toute la facture passe au prix de la tranche atteinte) | | |

**Powens** (prix annoncé oralement le 1er octobre 2026, verdict : non vérifiable tant qu'il n'est pas écrit) : **900 € par mois pour 1 000 utilisateurs, connexions illimitées**. Le prix au-delà, la durée et l'évolution n'ont pas été donnés : le modèle prend 0,90 € par utilisateur en plus (prix moyen du forfait, hypothèse). Powens annonce aussi jusqu'à 24 mois d'historique (3 mois au minimum), 4 rafraîchissements par jour et un travail sous son agrément (documents commerciaux de Powens, partiellement vérifié).

Enable Banking facture des **comptes**, Powens des **utilisateurs** : avec 1,3 compte par utilisateur (hypothèse), coût mensuel selon le nombre d'utilisateurs connectés :

| Utilisateurs connectés | Enable Banking, 1re année | Enable Banking, 2e année | Enable Banking, 3e année et après | Powens |
| ---: | ---: | ---: | ---: | ---: |
| 50 | 900 € | 1 200 € | 1 500 € | 900 € |
| 500 | 900 € | 1 200 € | 1 500 € | 900 € |
| 1 000 | 900 € | 1 200 € | 1 500 € | 900 € |
| 1 500 | 975 € | 1 200 € | 1 500 € | 1 350 € |
| 3 000 | 1 950 € | 1 950 € | 1 950 € | 2 700 € |
| 10 000 | 4 900 € | 4 900 € | 4 900 € | 9 000 € |

**Quand signer.** La licence est un coût fixe, mais elle ne se paie pas par tous les abonnés : ils paieraient de toute façon avec les relevés importés. Elle se paie par les abonnés **en plus** que la connexion directe apporte (hypothèse : +1 point de conversion, à mesurer). Il faut donc environ licence × 5 ÷ (1 × marge d'un abonné) abonnés Premium : environ 1 678 pour les 900 € de Powens, 2 797 pour la licence de 1 500 € d'Enable Banking (TVA due). Le modèle signe à **1 700 abonnés avec Powens** et **2 800 avec Enable Banking** (réglables). Écart de résultat d'un mois type par rapport à « sans banque directe », plan R9-sobre, en régime stable :

| Actifs | 2 000 | 5 000 | 10 000 | 20 000 | 50 000 |
| --- | ---: | ---: | ---: | ---: | ---: |
| Résultat sans banque directe | 1 253 € | 2 407 € | 5 200 € | 11 254 € | 29 515 € |
| Utilisateurs connectés | 354 | 885 | 1 769 | 3 538 | 8 846 |
| Écart avec Enable Banking | **-1 680 €** | **-1 147 €** | **-319 €** | **-86 €** | **803 €** |
| Écart avec Powens | **-924 €** | **-517 €** | **-391 €** | **-783 €** | **-1 962 €** |

**Lecture** : Powens coûte moins cher tant que les utilisateurs connectés restent sous 1 000 (forfait fixe, sans hausse annoncée, quand Enable Banking passe à 1 200 € puis 1 500 €). Au-delà, tout dépend de son prix par utilisateur en plus, **la question à poser par écrit** : à 0,90 €, Enable Banking redevient moins cher au-delà d'environ 1 000 utilisateurs connectés la 1re année de son contrat, 1 700 à partir de la 3e. Signer dès le lancement coûte 28 173 € sur 24 mois avec Enable Banking (R10) et 24 393 € avec Powens (R11), par rapport au plan sobre. Tant que le seuil n'est pas atteint, la banque directe reste en test gratuit (comptes du propriétaire chez Enable Banking, sandbox chez Powens) et les utilisateurs importent leurs relevés.


## 11. Le masterplan recommandé

| Phase | Mois | Ce qu'on fait | Déclencheur pour passer à la suite | Dépense |
| --- | --- | --- | --- | --- |
| 0. Bêta gratuite | 1 à 2 | A-Outlook : relevés, export Gmail, Outlook pour tous, 100 places Gmail de test pour mesurer l'effet de la connexion ; vous répondez vous-même | Taux d'analyse terminée, intention de payer, 5 entretiens avec des professionnels | 0 € |
| 1. Lancement sobre | 3 à 9 | R9-sobre : Premium mensuel et annuel, rapport unique, résiliation assistée, affiliation signalée ; un seul assistant IA ; Stripe, Vercel Pro | Seuil de rentabilité atteint (27 inscrits par mois, 59 actifs, 15 Premium) | environ 49 € par mois |
| 2. Gmail pour tous | à partir du 10e mois, si l'effet mesuré dépasse 18 abonnés | Validation Google, audit CASA | Heures au-delà des vôtres | + 700 € par an |
| 3. Banque directe en Premium | à 1 700 abonnés avec Powens, 2 800 avec Enable Banking | Le moins cher des deux au volume prévu : Powens sous 1 000 utilisateurs connectés, Enable Banking au-delà (selon le prix Powens au-delà du forfait, à obtenir par écrit) | | 900 € par mois chez Powens ; 900 €, 1 200 € puis 1 500 € chez Enable Banking |
| 4. Premières personnes | quand les heures dépassent 40 h par mois | Indépendant pour le support et les contenus, puis un salarié au-delà de 74 h | Licences professionnelles validées par des entretiens | 35 € de l'heure, puis 2 600 € par mois |
| 5. Licences professionnelles | quand 3 professionnels ont dit oui | Marque blanche, 149 € par mois | | 12 h par licence |

Avec les paramètres actuels, le plan R9-sobre donne sur 24 mois : dépenses 1 620 €, résultat **2 685 €**, trésorerie à avancer 253 €, 123 abonnés Premium à la fin, remboursé au mois 12.

**Critères d'arrêt** : si la conversion reste sous 1 % des inscrits après 3 mois de lancement, ou si le coût par actif dépasse le revenu par actif, revenir à la phase gratuite et retravailler l'offre avant de dépenser plus.

## 12. Le plan recommandé mois par mois

| Mois | Inscrits | Actifs | Premium | Revenus nets | Dépenses | dont IA | dont personnel | Cotisations | Résultat | Cumul |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 (bêta) | 50 | 22 | 0 | 0 € | 0 € | 0 € | 0 € | 0 € | 0 € | 0 € |
| 2 (bêta) | 50 | 38 | 0 | 0 € | 0 € | 0 € | 0 € | 0 € | 0 € | 0 € |
| 3 | 100 | 71 | 2 | 28 € | 248 € | 19 € | 0 € | 7 € | -227 € | -227 € |
| 4 | 110 | 101 | 4 | 41 € | 49 € | 19 € | 0 € | 10 € | -18 € | -245 € |
| 5 | 121 | 129 | 7 | 54 € | 49 € | 19 € | 0 € | 14 € | -8 € | -253 € |
| 6 | 133 | 155 | 9 | 69 € | 49 € | 19 € | 0 € | 17 € | 2 € | -250 € |
| 7 | 146 | 182 | 12 | 83 € | 49 € | 19 € | 0 € | 21 € | 13 € | -237 € |
| 8 | 161 | 208 | 15 | 99 € | 49 € | 19 € | 0 € | 25 € | 25 € | -212 € |
| 9 | 177 | 235 | 19 | 117 € | 50 € | 20 € | 0 € | 29 € | 38 € | -174 € |
| 10 | 195 | 264 | 22 | 135 € | 50 € | 20 € | 0 € | 34 € | 52 € | -122 € |
| 11 | 214 | 295 | 26 | 155 € | 50 € | 20 € | 0 € | 39 € | 66 € | -56 € |
| 12 | 236 | 328 | 30 | 177 € | 50 € | 20 € | 0 € | 44 € | 83 € | 27 € |
| 13 | 259 | 364 | 35 | 201 € | 50 € | 20 € | 0 € | 50 € | 100 € | 127 € |
| 14 | 285 | 403 | 40 | 226 € | 51 € | 20 € | 0 € | 56 € | 119 € | 246 € |
| 15 | 314 | 446 | 45 | 255 € | 51 € | 21 € | 0 € | 64 € | 140 € | 387 € |
| 16 | 345 | 493 | 51 | 285 € | 51 € | 21 € | 0 € | 71 € | 163 € | 549 € |
| 17 | 380 | 544 | 57 | 319 € | 52 € | 21 € | 0 € | 80 € | 188 € | 737 € |
| 18 | 418 | 600 | 64 | 356 € | 52 € | 21 € | 0 € | 89 € | 215 € | 952 € |
| 19 | 459 | 661 | 72 | 396 € | 64 € | 22 € | 11 € | 99 € | 234 € | 1 186 € |
| 20 | 505 | 729 | 80 | 441 € | 78 € | 22 € | 23 € | 110 € | 253 € | 1 439 € |
| 21 | 556 | 803 | 89 | 489 € | 93 € | 22 € | 37 € | 122 € | 274 € | 1 713 € |
| 22 | 612 | 885 | 100 | 543 € | 109 € | 23 € | 52 € | 135 € | 298 € | 2 011 € |
| 23 | 673 | 974 | 111 | 601 € | 128 € | 23 € | 69 € | 150 € | 323 € | 2 334 € |
| 24 | 740 | 1 073 | 123 | 665 € | 148 € | 24 € | 87 € | 166 € | 351 € | 2 685 € |

---
Généré le 2026-10-02 par `scripts/gen-modele.mjs`. Ne pas modifier à la main : modifiez `docs/model.mjs`.
