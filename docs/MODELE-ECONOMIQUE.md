# Modèle économique et masterplan

Ce document est **généré** à partir de `docs/model.mjs`, le même modèle que la page dynamique `docs/masterplan.html` (publiée dans la conversation). Pour changer une hypothèse : modifiez sa valeur dans `docs/model.mjs`, puis lancez `npm run modele`. Sur la page, chaque paramètre se règle en direct, et le seuil de rentabilité se calcule pour l'objectif que vous choisissez (un mois ou un nombre d'utilisateurs).

Projection sur 24 mois, dont 2 mois de bêta gratuite. Montants en euros. Chaque paramètre porte son verdict : **confirmé** (source officielle), **partiellement vérifié** (sources tierces ou tarif public non contractuel), **non vérifiable** (tarif sur devis, montant non public), **hypothèse** (à remplacer par les mesures de la bêta).

## 1. Ce que le modèle prend en compte

- **Les revenus** : Premium mensuel, Premium annuel, rapport unique, commissions d'affiliation, résiliation assistée payante, licences professionnelles.
- **Le statut** : micro-entreprise sans TVA tant que le chiffre d'affaires des 12 derniers mois reste sous 37 500 € (le prix payé reste acquis), puis TVA ; au-delà de 83 600 €, société avec expert-comptable et impôt sur les sociétés à la place des cotisations sur le chiffre d'affaires.
- **Les outils selon l'échelle** : Vercel Hobby puis Pro, Turso gratuit puis Developer puis Scaler, Resend gratuit puis Pro puis Scale, suivi d'erreurs gratuit puis payant.
- **Le personnel** : chaque tâche (support, développement, contenus, administration, vente aux professionnels) a un volume d'heures qui grandit avec les utilisateurs. L'IA en prend une part (assistant de support, assistant de code, rédaction) pour un coût mensuel ; vous donnez 40 heures par mois ; le reste est payé à des indépendants, ou à des salariés dès que c'est moins cher.
- **Le seuil de rentabilité** en utilisateurs, et ce qu'il faut pour l'atteindre à un mois donné.

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
| Stripe, part variable (cartes EEE standard) | 1,5 % | partiellement vérifié |  |
| Stripe, part fixe par paiement | 0,25 € | partiellement vérifié |  |
| Cotisations micro-entreprise (prestations de services) | 21,2 % du chiffre d'affaires | confirmé (2026) | 21,2 % pour les prestations commerciales (BIC) ; 25,6 % si l'activité est déclarée en profession libérale (BNC) |

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

### Banque directe

| Paramètre | Valeur | Verdict | Source ou remarque |
| --- | --- | --- | --- |
| Enable Banking, par compte connecté | 0,5 € par compte et par mois | hypothèse, tarif sur devis |  |
| Enable Banking, minimum mensuel | 0 € par mois | hypothèse, tarif sur devis |  |
| Part des concernés qui connectent leur banque | 60 % | hypothèse |  |

### Publicité

| Paramètre | Valeur | Verdict | Source ou remarque |
| --- | --- | --- | --- |
| Coût d'acquisition en publicité payée | 1,5 € par inscrit | hypothèse |  |
| Inscriptions multipliées par la publicité | 2 × | hypothèse |  |

## 3. Les scénarios réalistes

Tous en bouche-à-oreille, Outlook ouvert à tous (export pour Gmail), banque directe réservée au Premium, IA d'abord sauf mention contraire. Chacun change une chose par rapport au scénario central.

| Code | Scénario | Dépenses 24 mois | Résultat 24 mois | Trésorerie à avancer | Premium au mois 24 | Remboursé au | Seuil de rentabilité (régime stable) |
| --- | --- | ---: | ---: | ---: | ---: | --- | --- |
| R8-ambitieux | Ambitieux : tout, Gmail pour tous au 10e mois, croissance 15 % par mois | 9 327 € | **4 197 €** | 1 311 € | 336 | mois 18 | atteint sans utilisateurs (licences seules) |
| R9-sobre | Central sobre : un seul assistant IA à 20 $ par mois, sans assurance | 1 467 € | **3 143 €** | 23 € | 123 | mois 7 | 21 inscrits par mois, 47 actifs, 12 Premium |
| R6-pro | Central plus licences professionnelles dès le 12e mois | 5 012 € | **2 828 €** | 718 € | 123 | mois 17 | atteint sans utilisateurs (licences seules) |
| R2-central | Central : Premium, annuel, affiliation et résiliation assistée | 3 543 € | **1 068 €** | 732 € | 123 | mois 21 | 82 inscrits par mois, 181 actifs, 46 Premium |
| R5-premium-cher | Premium à 7,99 €, conversion 3,5 %, annuel à 59,99 € | 3 451 € | **717 €** | 839 € | 86 | mois 22 | 79 inscrits par mois, 163 actifs, 31 Premium |
| R7-lent | Central avec une croissance lente, 4 % par mois | 3 389 € | **-815 €** | 1 012 € | 55 | non atteint | 82 inscrits par mois, 181 actifs, 46 Premium |
| R1-prudent | Prudent (test de résistance) : Premium mensuel et annuel, conversion 3 %, croissance 6 % par mois | 3 343 € | **-1 644 €** | 1 647 € | 43 | non atteint | 146 inscrits par mois, 293 actifs, 49 Premium |
| R4-gratuit-affil | Gratuit pour tous, payé par l'affiliation (aucun Premium) | 3 235 € | **-2 310 €** | 2 310 € | 0 | non atteint | 40 462 inscrits par mois, 69 594 actifs, 0 Premium |
| R3-sans-IA | Central sans IA : même offre, tout le travail fait par des personnes | 15 008 € | **-10 398 €** | 10 398 € | 123 | non atteint | 507 inscrits par mois, 1 113 actifs, 285 Premium |

**Lecture** :

- **Le travail coûte plus que les serveurs.** Sans IA (R3), les heures au-delà des vôtres partent chez des indépendants dès le lancement : le même scénario perd de l'argent sur 24 mois. Avec un seul assistant à 20 $ (R9), le seuil tombe à quelques dizaines d'inscrits par mois.
- **L'affiliation seule ne suffit pas** (R4) : il faut des dizaines de milliers d'actifs pour couvrir le travail. Elle complète le Premium, elle ne le remplace pas.
- **Les licences professionnelles** (R6, R8) rendent le projet rentable même avec peu d'utilisateurs, si 1 licence par trimestre à 149 € par mois se vend vraiment : c'est l'hypothèse la plus fragile, à tester par 5 entretiens avant d'y consacrer du temps.
- **Un prix plus haut** (R5) reste rentable avec environ 30 % d'abonnés en moins : à tester avec deux prix pendant le lancement.

## 4. Le seuil de rentabilité

**En régime stable** (inscriptions constantes, tout s'est tassé : paliers d'outils, TVA, personnel), le scénario central couvre ses coûts à partir de **82 inscrits par mois, 181 actifs, 46 Premium**. Un abonné Premium à 4,99 € rapporte 3,61 € par mois sans TVA due, 2,95 € une fois la TVA due (Stripe et cotisations déduites).

**Pour atteindre un objectif à une date** (scénario central, 100 inscrits le premier mois après la bêta et 10 % de croissance par mois dans les hypothèses actuelles) :

| Objectif | Inscrits le 1er mois nécessaires (croissance actuelle) | Ou croissance nécessaire (inscrits actuels) |
| --- | ---: | ---: |
| Mois 12 rentable | 111 | 11,6 % par mois |
| Investissement remboursé au mois 18 | 120 | 12,6 % par mois |
| Investissement remboursé au mois 24 | 75 | 7,1 % par mois |

Sur la page, choisissez votre objectif (un mois, ou un nombre d'actifs) : elle calcule la même chose pour n'importe quel scénario et peut appliquer la valeur trouvée à vos hypothèses.

Seuil de chaque scénario de la matrice (régime stable) :

| Code | Seuil |
| --- | --- |
| O>G-R-org | 96 inscrits par mois, 273 actifs, 53 Premium |
| O>G-P-org | 105 inscrits par mois, 297 actifs, 58 Premium |
| T-R-org | 102 inscrits par mois, 193 actifs, 38 Premium |
| T-P-org | 110 inscrits par mois, 209 actifs, 41 Premium |
| T-T-org | 104 inscrits par mois, 321 actifs, 63 Premium |
| G-R-org | 95 inscrits par mois, 271 actifs, 53 Premium |
| G-P-org | 103 inscrits par mois, 294 actifs, 58 Premium |
| G-T-org | 112 inscrits par mois, 451 actifs, 89 Premium |
| O-R-org | 95 inscrits par mois, 193 actifs, 38 Premium |
| O-P-org | 103 inscrits par mois, 209 actifs, 41 Premium |
| O-T-org | 99 inscrits par mois, 321 actifs, 63 Premium |

Avec la publicité payée, un inscrit coûte 1,50 € et rapporte moins : le seuil n'est atteint que très loin, ou jamais.

## 5. Les coûts selon l'échelle

Un mois type, une fois les utilisateurs stabilisés à chaque taille. Les outils changent de palier, la TVA puis la société arrivent avec le chiffre d'affaires, et le personnel passe des indépendants aux salariés quand un temps plein devient moins cher (2 600 € par mois contre 35 € de l'heure).

La part de Premium parmi les actifs y est élevée (environ un quart) parce que 25 % des gratuits partent chaque mois alors que les abonnés restent : si la bêta mesure des gratuits plus fidèles, la part baisse et les revenus par actif aussi.

### Plan recommandé (R9-sobre)

| Actifs | 500 | 2 000 | 10 000 | 50 000 | 200 000 |
| --- | ---: | ---: | ---: | ---: | ---: |
| Inscrits par mois | 228 | 910 | 4 551 | 22 754 | 91 017 |
| Abonnés Premium | 128 | 513 | 2 564 | 12 820 | 51 279 |
| Revenus nets par mois | 567 € | 2 269 € | 9 498 € | 47 489 € | 189 956 € |
| Hébergement, base, e-mails, suivi | 20 € | 46 € | 104 € | 294 € | 982 € |
| IA (support, assistants, produit) | 21 € | 28 € | 67 € | 261 € | 989 € |
| Heures de travail (dont payées) | 39 h (0 h) | 48 h (8 h) | 90 h (50 h) | 305 h (265 h) | 1 109 h (1 069 h) |
| Personnel payé | 0 € | 263 €, indépendants (moins de 0,1 ETP) | 1 764 €, indépendants (0,3 ETP) | 5 200 €, salariés (2 ETP) | 20 800 €, salariés (8 ETP) |
| Banque, comptable, assurance | 40 € | 161 € | 923 € | 4 133 € | 16 173 € |
| Statut | micro, sans TVA | micro, sans TVA | société, TVA | société, TVA | société, TVA |
| Cotisations ou impôt | 130 € | 520 € | 1 743 € | 9 815 € | 39 411 € |
| **Résultat par mois** | **363 €** | **1 281 €** | **5 022 €** | **28 330 €** | **115 080 €** |
| Marge | 64 % | 56 % | 53 % | 60 % | 61 % |

### Scénario central (R2), IA d'abord

| Actifs | 500 | 2 000 | 10 000 | 50 000 | 200 000 |
| --- | ---: | ---: | ---: | ---: | ---: |
| Inscrits par mois | 228 | 910 | 4 551 | 22 754 | 91 017 |
| Abonnés Premium | 128 | 513 | 2 564 | 12 820 | 51 279 |
| Revenus nets par mois | 567 € | 2 269 € | 9 498 € | 47 489 € | 189 956 € |
| Hébergement, base, e-mails, suivi | 20 € | 46 € | 104 € | 294 € | 982 € |
| IA (support, assistants, produit) | 113 € | 120 € | 159 € | 353 € | 1 081 € |
| Heures de travail (dont payées) | 36 h (0 h) | 44 h (4 h) | 85 h (45 h) | 292 h (252 h) | 1 065 h (1 025 h) |
| Personnel payé | 0 € | 144 €, indépendants (moins de 0,1 ETP) | 1 588 €, indépendants (0,3 ETP) | 5 200 €, salariés (2 ETP) | 18 200 €, salariés (7 ETP) |
| Banque, comptable, assurance | 55 € | 176 € | 938 € | 4 148 € | 16 188 € |
| Statut | micro, sans TVA | micro, sans TVA | société, TVA | société, TVA | société, TVA |
| Cotisations ou impôt | 130 € | 520 € | 1 760 € | 9 788 € | 40 034 € |
| **Résultat par mois** | **256 €** | **1 293 €** | **5 073 €** | **28 250 €** | **115 650 €** |
| Marge | 45 % | 57 % | 53 % | 59 % | 61 % |

### Même scénario sans IA (R3)

| Actifs | 500 | 2 000 | 10 000 | 50 000 | 200 000 |
| --- | ---: | ---: | ---: | ---: | ---: |
| Inscrits par mois | 228 | 910 | 4 551 | 22 754 | 91 017 |
| Abonnés Premium | 128 | 513 | 2 564 | 12 820 | 51 279 |
| Revenus nets par mois | 567 € | 2 269 € | 9 498 € | 47 489 € | 189 956 € |
| Hébergement, base, e-mails, suivi | 20 € | 46 € | 104 € | 294 € | 982 € |
| IA (support, assistants, produit) | 2 € | 6 € | 30 € | 152 € | 607 € |
| Heures de travail (dont payées) | 59 h (19 h) | 72 h (32 h) | 145 h (105 h) | 509 h (469 h) | 1 874 h (1 834 h) |
| Personnel payé | 649 €, indépendants (0,1 ETP) | 1 127 €, indépendants (0,2 ETP) | 2 600 €, salariés (1 ETP) | 10 400 €, salariés (4 ETP) | 33 800 €, salariés (13 ETP) |
| Banque, comptable, assurance | 55 € | 176 € | 938 € | 4 148 € | 16 188 € |
| Statut | micro, sans TVA | micro, sans TVA | société, TVA | société, TVA | société, TVA |
| Cotisations ou impôt | 130 € | 520 € | 1 539 € | 8 538 € | 36 253 € |
| **Résultat par mois** | **-280 €** | **427 €** | **4 395 €** | **24 501 €** | **105 440 €** |
| Marge | -49 % | 19 % | 46 % | 52 % | 56 % |

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
| R8-ambitieux | Ambitieux : tout, Gmail pour tous au 10e mois, croissance 15 % par mois | 9 327 € | 3 817 € | 17 341 € | **4 197 €** | 1 311 € | 336 | mois 12 | mois 18 |
| R9-sobre | Central sobre : un seul assistant IA à 20 $ par mois, sans assurance | 1 467 € | 1 313 € | 5 924 € | **3 143 €** | 23 € | 123 | mois 5 | mois 7 |
| R6-pro | Central plus licences professionnelles dès le 12e mois | 5 012 € | 2 199 € | 10 039 € | **2 828 €** | 718 € | 123 | mois 12 | mois 17 |
| R2-central | Central : Premium, annuel, affiliation et résiliation assistée | 3 543 € | 1 313 € | 5 924 € | **1 068 €** | 732 € | 123 | mois 13 | mois 21 |
| G-R-org | Connexion Gmail pour tous, relevés seulement, bouche-à-oreille | 4 783 € | 1 635 € | 7 236 € | **819 €** | 1 833 € | 156 | mois 11 | mois 23 |
| O-R-org | Outlook pour tous, export pour Gmail, relevés seulement, bouche-à-oreille | 3 238 € | 1 172 € | 5 186 € | **776 €** | 813 € | 112 | mois 14 | mois 22 |
| R5-premium-cher | Premium à 7,99 €, conversion 3,5 %, annuel à 59,99 € | 3 451 € | 1 178 € | 5 346 € | **717 €** | 839 € | 86 | mois 14 | mois 22 |
| T-R-org | Export Gmail (Takeout), relevés seulement, bouche-à-oreille | 3 234 € | 1 090 € | 4 824 € | **500 €** | 868 € | 104 | mois 14 | mois 23 |
| O-P-org | Outlook pour tous, export pour Gmail, banque directe en premium, bouche-à-oreille | 3 521 € | 1 172 € | 5 186 € | **493 €** | 866 € | 112 | mois 14 | mois 23 |
| G-P-org | Connexion Gmail pour tous, banque directe en premium, bouche-à-oreille | 5 177 € | 1 635 € | 7 236 € | **424 €** | 1 922 € | 156 | mois 12 | mois 23 |
| O>G-R-org | Outlook pour tous et export Gmail, puis connexion Gmail pour tous au 10e mois, relevés seulement, bouche-à-oreille | 4 771 € | 1 479 € | 6 545 € | **295 €** | 1 492 € | 151 | mois 13 | mois 22 |
| T-P-org | Export Gmail (Takeout), banque directe en premium, bouche-à-oreille | 3 497 € | 1 090 € | 4 824 € | **237 €** | 925 € | 104 | mois 15 | mois 24 |
| O>G-P-org | Outlook pour tous et export Gmail, puis connexion Gmail pour tous au 10e mois, banque directe en premium, bouche-à-oreille | 5 125 € | 1 479 € | 6 545 € | **-58 €** | 1 535 € | 151 | mois 13 | non atteint |
| R7-lent | Central avec une croissance lente, 4 % par mois | 3 389 € | 733 € | 3 307 € | **-815 €** | 1 012 € | 55 | mois 19 | non atteint |
| R1-prudent | Prudent (test de résistance) : Premium mensuel et annuel, conversion 3 %, croissance 6 % par mois | 3 343 € | 487 € | 2 186 € | **-1 644 €** | 1 647 € | 43 | mois 24 | non atteint |
| O-T-org | Outlook pour tous, export pour Gmail, banque directe pour tous, bouche-à-oreille | 8 206 € | 1 853 € | 8 201 € | **-1 858 €** | 1 858 € | 177 | non atteint | non atteint |
| T-T-org | Export Gmail (Takeout), banque directe pour tous, bouche-à-oreille | 7 928 € | 1 771 € | 7 839 € | **-1 860 €** | 1 860 € | 169 | mois 21 | non atteint |
| R4-gratuit-affil | Gratuit pour tous, payé par l'affiliation (aucun Premium) | 3 235 € | 249 € | 1 174 € | **-2 310 €** | 2 310 € | 0 | non atteint | non atteint |
| G-T-org | Connexion Gmail pour tous, banque directe pour tous, bouche-à-oreille | 11 148 € | 2 316 € | 10 251 € | **-3 213 €** | 3 213 € | 221 | non atteint | non atteint |
| R3-sans-IA | Central sans IA : même offre, tout le travail fait par des personnes | 15 008 € | 1 313 € | 5 924 € | **-10 398 €** | 10 398 € | 123 | non atteint | non atteint |
| G-R-pub | Connexion Gmail pour tous, relevés seulement, publicité payée | 27 770 € | 3 270 € | 14 473 € | **-16 568 €** | 16 568 € | 313 | non atteint | non atteint |
| O-R-pub | Outlook pour tous, export pour Gmail, relevés seulement, publicité payée | 25 371 € | 2 344 € | 10 372 € | **-17 342 €** | 17 342 € | 224 | non atteint | non atteint |
| G-P-pub | Connexion Gmail pour tous, banque directe en premium, publicité payée | 28 559 € | 3 270 € | 14 473 € | **-17 356 €** | 17 356 € | 313 | non atteint | non atteint |
| T-R-pub | Export Gmail (Takeout), relevés seulement, publicité payée | 25 212 € | 2 180 € | 9 648 € | **-17 744 €** | 17 744 € | 208 | non atteint | non atteint |
| O-P-pub | Outlook pour tous, export pour Gmail, banque directe en premium, publicité payée | 25 935 € | 2 344 € | 10 372 € | **-17 907 €** | 17 907 € | 224 | non atteint | non atteint |
| T-P-pub | Export Gmail (Takeout), banque directe en premium, publicité payée | 25 738 € | 2 180 € | 9 648 € | **-18 269 €** | 18 269 € | 208 | non atteint | non atteint |
| T-T-pub | Export Gmail (Takeout), banque directe pour tous, publicité payée | 35 586 € | 3 543 € | 15 679 € | **-23 450 €** | 23 450 € | 339 | non atteint | non atteint |
| O-T-pub | Outlook pour tous, export pour Gmail, banque directe pour tous, publicité payée | 36 216 € | 3 706 € | 16 402 € | **-23 520 €** | 23 520 € | 354 | non atteint | non atteint |
| G-T-pub | Connexion Gmail pour tous, banque directe pour tous, publicité payée | 41 143 € | 4 633 € | 20 503 € | **-25 273 €** | 25 273 € | 443 | non atteint | non atteint |

**Lecture** : la publicité payée fait perdre de l'argent dans tous les cas ; la banque directe ouverte à tous coûte plus qu'elle ne rapporte ; les meilleurs résultats viennent du bouche-à-oreille, d'une offre qui ne dépend pas du seul Premium mensuel, et de l'IA pour le travail répétitif.

## 8. Les phases gratuites (pas de revenu)

| Code | Scénario | Dépenses 24 mois | Ce que ça permet |
| --- | --- | ---: | --- |
| A0 | Gratuit, export Gmail, 450 testeurs au plus | 0 € | 450 testeurs actifs au plus ; Gmail par export Takeout (0 €), connexion Gmail pour 100 testeurs |
| A-Gmail | Gratuit, connexion Gmail pour tous, 450 testeurs au plus | 1 424 € | La connexion Gmail en lecture seule ouverte à tous, 450 testeurs au plus ; validation Google et audit CASA payants |
| A-Outlook | Gratuit, connexion Outlook pour tous et export pour Gmail, 450 testeurs au plus | 0 € | Comme A0, plus la connexion Outlook ouverte à tous (gratuite, sans plafond trouvé) |
| A-Gmail+ | Gratuit, connexion Gmail pour tous, sans plafond | 2 562 € | Comme A-Gmail, sans plafond de testeurs : Vercel Pro, et des heures d'aide payées au-delà des vôtres |

## 9. Les seuils où chaque dépense se rembourse

Nombre d'abonnés Premium à 4,99 € (sans TVA due, cotisations déduites) pour couvrir chaque dépense.

| Dépense | Coût par mois | Abonnés Premium pour la couvrir | Quand la déclencher |
| --- | ---: | ---: | --- |
| Vercel Pro | 18 € | 6 | Au premier euro encaissé (obligatoire), ou au-delà de 450 testeurs actifs |
| Assistant de code et de rédaction | 110 € | 31 | Quand il économise plus d'heures payées qu'il ne coûte |
| Connexion Gmail pour tous (audit CASA annuel) | 58 € | 17 | Quand la connexion Gmail apporte au moins ce nombre d'abonnés en plus que l'export |
| Expert-comptable (société) | 120 € | 41 | Au passage en société (au-delà de 83 600 € de chiffre d'affaires) |
| Turso Developer | 5 € | 2 | Au-delà de 1 250 actifs |
| Resend Pro | 18 € | 6 | Au-delà de 3 000 e-mails par mois |
| Un salarié à temps plein | 2 600 € | 881 | Quand plus de 74 heures payées par mois sont nécessaires |
| Enable Banking, minimum de 100 € | 100 € | 31 | Signer le contrat quand ce nombre d'abonnés est atteint, connexion réservée au Premium |
| Enable Banking, minimum de 300 € | 300 € | 91 | Signer le contrat quand ce nombre d'abonnés est atteint, connexion réservée au Premium |

## 10. Laisser tous les utilisateurs se connecter à Gmail en lecture seule

La connexion en lecture seule rassure davantage qu'un export Takeout à déposer : l'utilisateur clique sur « Autoriser » chez Google, l'application ne lit que les e-mails qui ressemblent à des reçus, ne garde aucun jeton et retire son accès juste après. Mais Google ne l'autorise pour plus de 100 personnes qu'après validation :

- **plafond de 100 utilisateurs pour toute la vie du projet** tant que l'application n'est pas validée, même en « production » (confirmé : [aide Google](https://support.google.com/cloud/answer/7454865)) ;
- **vérification de la marque**, puis **vérification des accès restreints** : page d'accueil publique sur un domaine vérifié, politique de confidentialité sur le même domaine, mention « Limited Use », **vidéo de démonstration en anglais** (confirmé : [vérification de la marque](https://developers.google.com/identity/protocols/oauth2/production-readiness/brand-verification), [règles des données utilisateur](https://developers.google.com/terms/api-services-user-data-policy)) ;
- **audit de sécurité CASA de niveau 2 chaque année**, fait par un laboratoire agréé (confirmé pour l'obligation, [CASA](https://appdefensealliance.dev/casa/tier-2/tier2-overview)) ; prix : 540 à 1 800 $ par an chez TAC Security, 800 à 1 200 $ chez Leviathan (partiellement vérifié, sources tierces) ;
- **délai** : quelques jours pour la marque, souvent 2 à 8 semaines pour les accès restreints (partiellement vérifié).

Comparaison, relevés seulement et bouche-à-oreille :

|  | Export Takeout (T-R-org) | Outlook pour tous (O-R-org) | Gmail pour tous dès le départ (G-R-org) | Outlook, puis Gmail au 10e mois (O>G-R-org) |
| --- | ---: | ---: | ---: | ---: |
| Dépenses 24 mois | 3 234 € | 3 238 € | 4 783 € | 4 771 € |
| Résultat 24 mois | 500 € | 776 € | 819 € | 295 € |
| Trésorerie à avancer | 868 € | 813 € | 1 833 € | 1 492 € |
| Premium au mois 24 | 104 | 112 | 156 | 151 |
| Remboursé au | mois 23 | mois 22 | mois 23 | mois 22 |

Tout dépend de l'hypothèse « activation en plus avec la connexion Gmail en lecture seule » (30 points contre 10 pour l'export) : **mesurez-la pendant la bêta** avec les 100 places de test Gmail. Si l'écart réel apporte moins de 17 abonnés, l'export suffit.

## 11. Le masterplan recommandé

| Phase | Mois | Ce qu'on fait | Déclencheur pour passer à la suite | Dépense |
| --- | --- | --- | --- | --- |
| 0. Bêta gratuite | 1 à 2 | A-Outlook : relevés, export Gmail, Outlook pour tous, 100 places Gmail de test pour mesurer l'effet de la connexion ; vous répondez vous-même | Taux d'analyse terminée, intention de payer, 5 entretiens avec des professionnels | 0 € |
| 1. Lancement sobre | 3 à 9 | R9-sobre : Premium mensuel et annuel, rapport unique, résiliation assistée, affiliation signalée ; un seul assistant IA ; Stripe, Vercel Pro | Seuil de rentabilité atteint (21 inscrits par mois, 47 actifs, 12 Premium) | environ 40 € par mois |
| 2. Gmail pour tous | à partir du 10e mois, si l'effet mesuré dépasse 17 abonnés | Validation Google, audit CASA | Abonnés au-dessus du seuil Enable Banking | + 700 € par an |
| 3. Banque directe en Premium | au seuil du devis | Contrat Enable Banking, connexion réservée aux abonnés | Heures au-delà des vôtres | minimum du contrat + 0,5 € par compte |
| 4. Premières personnes | quand les heures dépassent 40 h par mois | Indépendant pour le support et les contenus, puis un salarié au-delà de 74 h | Licences professionnelles validées par des entretiens | 35 € de l'heure, puis 2 600 € par mois |
| 5. Licences professionnelles | quand 3 professionnels ont dit oui | Marque blanche, 149 € par mois | | 12 h par licence |

Avec les paramètres actuels, le plan R9-sobre donne sur 24 mois : dépenses 1 467 €, résultat **3 143 €**, trésorerie à avancer 23 €, 123 abonnés Premium à la fin, remboursé au mois 7.

**Critères d'arrêt** : si la conversion reste sous 1 % des inscrits après 3 mois de lancement, ou si le coût par actif dépasse le revenu par actif, revenir à la phase gratuite et retravailler l'offre avant de dépenser plus.

## 12. Le plan recommandé mois par mois

| Mois | Inscrits | Actifs | Premium | Revenus nets | Dépenses | dont IA | dont personnel | Cotisations | Résultat | Cumul |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 (bêta) | 50 | 22 | 0 | 0 € | 0 € | 0 € | 0 € | 0 € | 0 € | 0 € |
| 2 (bêta) | 50 | 38 | 0 | 0 € | 0 € | 0 € | 0 € | 0 € | 0 € | 0 € |
| 3 | 100 | 71 | 2 | 29 € | 39 € | 19 € | 0 € | 6 € | -16 € | -16 € |
| 4 | 110 | 101 | 4 | 42 € | 40 € | 19 € | 0 € | 9 € | -7 € | -23 € |
| 5 | 121 | 129 | 7 | 56 € | 40 € | 19 € | 0 € | 12 € | 3 € | -19 € |
| 6 | 133 | 155 | 9 | 71 € | 41 € | 19 € | 0 € | 16 € | 14 € | -6 € |
| 7 | 146 | 182 | 12 | 86 € | 42 € | 19 € | 0 € | 19 € | 25 € | 19 € |
| 8 | 161 | 208 | 15 | 102 € | 43 € | 19 € | 0 € | 23 € | 36 € | 55 € |
| 9 | 177 | 235 | 19 | 120 € | 45 € | 20 € | 0 € | 27 € | 49 € | 104 € |
| 10 | 195 | 264 | 22 | 139 € | 46 € | 20 € | 0 € | 31 € | 63 € | 167 € |
| 11 | 214 | 295 | 26 | 160 € | 47 € | 20 € | 0 € | 35 € | 78 € | 245 € |
| 12 | 236 | 328 | 30 | 183 € | 48 € | 20 € | 0 € | 40 € | 94 € | 338 € |
| 13 | 259 | 364 | 35 | 207 € | 50 € | 20 € | 0 € | 46 € | 111 € | 450 € |
| 14 | 285 | 403 | 40 | 234 € | 52 € | 20 € | 0 € | 52 € | 130 € | 580 € |
| 15 | 314 | 446 | 45 | 263 € | 53 € | 21 € | 0 € | 58 € | 151 € | 731 € |
| 16 | 345 | 493 | 51 | 295 € | 55 € | 21 € | 0 € | 65 € | 174 € | 905 € |
| 17 | 380 | 544 | 57 | 330 € | 58 € | 21 € | 0 € | 73 € | 199 € | 1 104 € |
| 18 | 418 | 600 | 64 | 368 € | 60 € | 21 € | 0 € | 82 € | 226 € | 1 330 € |
| 19 | 459 | 661 | 72 | 410 € | 74 € | 22 € | 11 € | 91 € | 245 € | 1 575 € |
| 20 | 505 | 729 | 80 | 455 € | 89 € | 22 € | 23 € | 101 € | 265 € | 1 840 € |
| 21 | 556 | 803 | 89 | 505 € | 106 € | 22 € | 37 € | 112 € | 287 € | 2 128 € |
| 22 | 612 | 885 | 100 | 560 € | 125 € | 23 € | 52 € | 124 € | 311 € | 2 439 € |
| 23 | 673 | 974 | 111 | 621 € | 145 € | 23 € | 69 € | 138 € | 338 € | 2 777 € |
| 24 | 740 | 1 073 | 123 | 687 € | 168 € | 24 € | 87 € | 152 € | 367 € | 3 143 € |

---
Généré le 2026-09-27 par `scripts/gen-modele.mjs`. Ne pas modifier à la main : modifiez `docs/model.mjs`.
