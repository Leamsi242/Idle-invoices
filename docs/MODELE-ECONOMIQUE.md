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

### Banque directe (Enable Banking)

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
| Abonnés Premium à partir desquels signer le contrat (scénarios « au seuil ») | 2500 abonnés Premium | calculé, à choisir | la licence ne se paie que par les abonnés en plus que la banque apporte : licence × conversion ÷ (conversion en plus × marge d'un abonné), soit environ 2 500 pour 1 500 € avec la TVA due |
| Conversion en Premium en plus quand la banque directe y est incluse | 1 points | hypothèse à mesurer |  |
| Part des concernés qui connectent leur banque | 60 % | hypothèse |  |

### Publicité

| Paramètre | Valeur | Verdict | Source ou remarque |
| --- | --- | --- | --- |
| Coût d'acquisition en publicité payée | 1,5 € par inscrit | hypothèse |  |
| Inscriptions multipliées par la publicité | 2 × | hypothèse |  |

## 3. Les scénarios réalistes

Tous en bouche-à-oreille, Outlook ouvert à tous (export pour Gmail), banque directe réservée au Premium et contrat Enable Banking signé seulement à 2 500 abonnés (jamais atteint en 24 mois, sauf mention), IA d'abord sauf mention contraire. Chacun change une chose par rapport au scénario central.

| Code | Scénario | Dépenses 24 mois | Résultat 24 mois | Trésorerie à avancer | Premium au mois 24 | Remboursé au | Seuil de rentabilité (régime stable) |
| --- | --- | ---: | ---: | ---: | ---: | --- | --- |
| R8-ambitieux | Ambitieux : tout, Gmail pour tous au 10e mois, croissance 15 % par mois | 8 685 € | **4 838 €** | 1 270 € | 336 | mois 17 | atteint sans utilisateurs (licences seules) |
| R9-sobre | Central sobre : un seul assistant IA à 20 $ par mois, sans assurance | 1 163 € | **3 447 €** | 21 € | 123 | mois 6 | 20 inscrits par mois, 43 actifs, 11 Premium |
| R6-pro | Central plus licences professionnelles dès le 12e mois | 4 708 € | **3 132 €** | 683 € | 123 | mois 17 | atteint sans utilisateurs (licences seules) |
| R2-central | Central : Premium, annuel, affiliation et résiliation assistée | 3 239 € | **1 372 €** | 687 € | 123 | mois 20 | 75 inscrits par mois, 165 actifs, 42 Premium |
| R5-premium-cher | Premium à 7,99 €, conversion 3,5 %, annuel à 59,99 € | 3 238 € | **930 €** | 801 € | 86 | mois 21 | 74 inscrits par mois, 153 actifs, 29 Premium |
| R7-lent | Central avec une croissance lente, 4 % par mois | 3 211 € | **-637 €** | 930 € | 55 | non atteint | 75 inscrits par mois, 165 actifs, 42 Premium |
| R1-prudent | Prudent (test de résistance) : Premium mensuel et annuel, conversion 3 %, croissance 6 % par mois | 3 216 € | **-1 518 €** | 1 539 € | 43 | non atteint | 132 inscrits par mois, 266 actifs, 45 Premium |
| R4-gratuit-affil | Gratuit pour tous, payé par l'affiliation (aucun Premium) | 3 235 € | **-2 310 €** | 2 310 € | 0 | non atteint | 40 462 inscrits par mois, 69 594 actifs, 0 Premium |
| R3-sans-IA | Central sans IA : même offre, tout le travail fait par des personnes | 14 704 € | **-10 094 €** | 10 094 € | 123 | non atteint | 423 inscrits par mois, 929 actifs, 238 Premium |
| R10-banque-tot | Sobre, mais contrat Enable Banking signé dès le lancement | 23 977 € | **-18 723 €** | 18 723 € | 147 | non atteint | 785 inscrits par mois, 1 799 actifs, 531 Premium |

**Lecture** :

- **Le travail coûte plus que les serveurs.** Sans IA (R3), les heures au-delà des vôtres partent chez des indépendants dès le lancement : le même scénario perd de l'argent sur 24 mois. Avec un seul assistant à 20 $ (R9), le seuil tombe à quelques dizaines d'inscrits par mois.
- **L'affiliation seule ne suffit pas** (R4) : il faut des dizaines de milliers d'actifs pour couvrir le travail. Elle complète le Premium, elle ne le remplace pas.
- **Les licences professionnelles** (R6, R8) rendent le projet rentable même avec peu d'utilisateurs, si 1 licence par trimestre à 149 € par mois se vend vraiment : c'est l'hypothèse la plus fragile, à tester par 5 entretiens avant d'y consacrer du temps.
- **Un prix plus haut** (R5) reste rentable avec environ 30 % d'abonnés en moins : à tester avec deux prix pendant le lancement.

## 4. Le seuil de rentabilité

**En régime stable** (inscriptions constantes, tout s'est tassé : paliers d'outils, TVA, personnel), le scénario central couvre ses coûts à partir de **75 inscrits par mois, 165 actifs, 42 Premium**. Un abonné Premium à 4,99 € rapporte 3,61 € par mois sans TVA due, 2,95 € une fois la TVA due (Stripe et cotisations déduites).

**Pour atteindre un objectif à une date** (scénario central, 100 inscrits le premier mois après la bêta et 10 % de croissance par mois dans les hypothèses actuelles) :

| Objectif | Inscrits le 1er mois nécessaires (croissance actuelle) | Ou croissance nécessaire (inscrits actuels) |
| --- | ---: | ---: |
| Mois 12 rentable | 104 | 10,5 % par mois |
| Investissement remboursé au mois 18 | 113 | 11,7 % par mois |
| Investissement remboursé au mois 24 | 70 | 6,4 % par mois |

Sur la page, choisissez votre objectif (un mois, ou un nombre d'actifs) : elle calcule la même chose pour n'importe quel scénario et peut appliquer la valeur trouvée à vos hypothèses.

Seuil de chaque scénario de la matrice (régime stable) :

| Code | Seuil |
| --- | --- |
| O>G-R-org | 96 inscrits par mois, 273 actifs, 53 Premium |
| O>G-P-org | 761 inscrits par mois, 2 225 actifs, 507 Premium |
| T-R-org | 102 inscrits par mois, 193 actifs, 38 Premium |
| T-P-org | 1 080 inscrits par mois, 2 111 actifs, 486 Premium |
| T-T-org | 665 inscrits par mois, 2 111 actifs, 486 Premium |
| G-R-org | 95 inscrits par mois, 271 actifs, 53 Premium |
| G-P-org | 751 inscrits par mois, 2 200 actifs, 506 Premium |
| G-T-org | 530 inscrits par mois, 2 199 actifs, 506 Premium |
| O-R-org | 95 inscrits par mois, 193 actifs, 38 Premium |
| O-P-org | 1 005 inscrits par mois, 2 111 actifs, 486 Premium |
| O-T-org | 635 inscrits par mois, 2 111 actifs, 486 Premium |

Avec la publicité payée, un inscrit coûte 1,50 € et rapporte moins : le seuil n'est atteint que très loin, ou jamais.

## 5. Les coûts selon l'échelle

Un mois type, une fois les utilisateurs stabilisés à chaque taille. Les outils changent de palier, la TVA puis la société arrivent avec le chiffre d'affaires, et le personnel passe des indépendants aux salariés quand un temps plein devient moins cher (2 600 € par mois contre 35 € de l'heure).

La part de Premium parmi les actifs y est élevée (environ un quart) parce que 25 % des gratuits partent chaque mois alors que les abonnés restent : si la bêta mesure des gratuits plus fidèles, la part baisse et les revenus par actif aussi.

### Plan recommandé (R9-sobre)

| Actifs | 500 | 2 000 | 10 000 | 50 000 | 200 000 |
| --- | ---: | ---: | ---: | ---: | ---: |
| Inscrits par mois | 228 | 910 | 4 551 | 22 754 | 91 017 |
| Abonnés Premium | 128 | 513 | 2 618 | 15 249 | 61 362 |
| Revenus nets par mois | 567 € | 2 269 € | 9 681 € | 55 427 € | 222 813 € |
| Hébergement, base, e-mails, suivi | 20 € | 46 € | 104 € | 311 € | 1 050 € |
| IA (support, assistants, produit) | 21 € | 28 € | 67 € | 271 € | 1 032 € |
| Heures de travail (dont payées) | 39 h (0 h) | 48 h (8 h) | 91 h (51 h) | 316 h (276 h) | 1 156 h (1 116 h) |
| Personnel payé | 0 € | 263 €, indépendants (moins de 0,1 ETP) | 1 776 €, indépendants (0,3 ETP) | 5 200 €, salariés (2 ETP) | 20 800 €, salariés (8 ETP) |
| Banque, comptable, assurance | 0 € | 0 € | 1 020 € | 3 988 € | 12 651 € |
| Statut | micro, sans TVA | micro, sans TVA | société, TVA | société, TVA | société, TVA |
| Cotisations ou impôt | 130 € | 520 € | 1 833 € | 11 924 € | 48 826 € |
| **Résultat par mois** | **401 €** | **1 435 €** | **5 283 €** | **34 341 €** | **140 848 €** |
| Marge | 71 % | 63 % | 55 % | 62 % | 63 % |

### Scénario central (R2), IA d'abord

| Actifs | 500 | 2 000 | 10 000 | 50 000 | 200 000 |
| --- | ---: | ---: | ---: | ---: | ---: |
| Inscrits par mois | 228 | 910 | 4 551 | 22 754 | 91 017 |
| Abonnés Premium | 128 | 513 | 2 618 | 15 249 | 61 362 |
| Revenus nets par mois | 567 € | 2 269 € | 9 681 € | 55 427 € | 222 813 € |
| Hébergement, base, e-mails, suivi | 20 € | 46 € | 104 € | 311 € | 1 050 € |
| IA (support, assistants, produit) | 113 € | 120 € | 159 € | 363 € | 1 124 € |
| Heures de travail (dont payées) | 36 h (0 h) | 44 h (4 h) | 86 h (46 h) | 303 h (263 h) | 1 111 h (1 071 h) |
| Personnel payé | 0 € | 144 €, indépendants (moins de 0,1 ETP) | 1 600 €, indépendants (0,3 ETP) | 5 200 €, salariés (2 ETP) | 20 800 €, salariés (8 ETP) |
| Banque, comptable, assurance | 15 € | 15 € | 1 035 € | 4 003 € | 12 666 € |
| Statut | micro, sans TVA | micro, sans TVA | société, TVA | société, TVA | société, TVA |
| Cotisations ou impôt | 130 € | 520 € | 1 850 € | 11 897 € | 48 799 € |
| **Résultat par mois** | **294 €** | **1 447 €** | **5 334 €** | **34 260 €** | **142 068 €** |
| Marge | 52 % | 64 % | 55 % | 62 % | 64 % |

### Même scénario sans IA (R3)

| Actifs | 500 | 2 000 | 10 000 | 50 000 | 200 000 |
| --- | ---: | ---: | ---: | ---: | ---: |
| Inscrits par mois | 228 | 910 | 4 551 | 22 754 | 91 017 |
| Abonnés Premium | 128 | 513 | 2 618 | 15 249 | 61 362 |
| Revenus nets par mois | 567 € | 2 269 € | 9 681 € | 55 427 € | 222 813 € |
| Hébergement, base, e-mails, suivi | 20 € | 46 € | 104 € | 311 € | 1 050 € |
| IA (support, assistants, produit) | 2 € | 6 € | 31 € | 158 € | 634 € |
| Heures de travail (dont payées) | 59 h (19 h) | 72 h (32 h) | 146 h (106 h) | 529 h (489 h) | 1 955 h (1 915 h) |
| Personnel payé | 649 €, indépendants (0,1 ETP) | 1 127 €, indépendants (0,2 ETP) | 2 600 €, salariés (1 ETP) | 10 400 €, salariés (4 ETP) | 33 800 €, salariés (13 ETP) |
| Banque, comptable, assurance | 15 € | 15 € | 1 035 € | 4 003 € | 12 666 € |
| Statut | micro, sans TVA | micro, sans TVA | société, TVA | société, TVA | société, TVA |
| Cotisations ou impôt | 130 € | 520 € | 1 632 € | 10 649 € | 45 672 € |
| **Résultat par mois** | **-242 €** | **581 €** | **4 659 €** | **30 513 €** | **131 382 €** |
| Marge | -43 % | 26 % | 48 % | 55 % | 59 % |

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
| R8-ambitieux | Ambitieux : tout, Gmail pour tous au 10e mois, croissance 15 % par mois | 8 685 € | 3 817 € | 17 341 € | **4 838 €** | 1 270 € | 336 | mois 12 | mois 17 |
| R9-sobre | Central sobre : un seul assistant IA à 20 $ par mois, sans assurance | 1 163 € | 1 313 € | 5 924 € | **3 447 €** | 21 € | 123 | mois 5 | mois 6 |
| R6-pro | Central plus licences professionnelles dès le 12e mois | 4 708 € | 2 199 € | 10 039 € | **3 132 €** | 683 € | 123 | mois 12 | mois 17 |
| R2-central | Central : Premium, annuel, affiliation et résiliation assistée | 3 239 € | 1 313 € | 5 924 € | **1 372 €** | 687 € | 123 | mois 13 | mois 20 |
| R5-premium-cher | Premium à 7,99 €, conversion 3,5 %, annuel à 59,99 € | 3 238 € | 1 178 € | 5 346 € | **930 €** | 801 € | 86 | mois 14 | mois 21 |
| G-R-org | Connexion Gmail pour tous, relevés seulement, bouche-à-oreille | 4 783 € | 1 635 € | 7 236 € | **819 €** | 1 833 € | 156 | mois 11 | mois 23 |
| O-R-org | Outlook pour tous, export pour Gmail, relevés seulement, bouche-à-oreille | 3 238 € | 1 172 € | 5 186 € | **776 €** | 813 € | 112 | mois 14 | mois 22 |
| T-R-org | Export Gmail (Takeout), relevés seulement, bouche-à-oreille | 3 234 € | 1 090 € | 4 824 € | **500 €** | 868 € | 104 | mois 14 | mois 23 |
| O>G-R-org | Outlook pour tous et export Gmail, puis connexion Gmail pour tous au 10e mois, relevés seulement, bouche-à-oreille | 4 771 € | 1 479 € | 6 545 € | **295 €** | 1 492 € | 151 | mois 13 | mois 22 |
| R7-lent | Central avec une croissance lente, 4 % par mois | 3 211 € | 733 € | 3 307 € | **-637 €** | 930 € | 55 | mois 17 | non atteint |
| R1-prudent | Prudent (test de résistance) : Premium mensuel et annuel, conversion 3 %, croissance 6 % par mois | 3 216 € | 487 € | 2 186 € | **-1 518 €** | 1 539 € | 43 | mois 23 | non atteint |
| R4-gratuit-affil | Gratuit pour tous, payé par l'affiliation (aucun Premium) | 3 235 € | 249 € | 1 174 € | **-2 310 €** | 2 310 € | 0 | non atteint | non atteint |
| R3-sans-IA | Central sans IA : même offre, tout le travail fait par des personnes | 14 704 € | 1 313 € | 5 924 € | **-10 094 €** | 10 094 € | 123 | non atteint | non atteint |
| G-R-pub | Connexion Gmail pour tous, relevés seulement, publicité payée | 27 770 € | 3 270 € | 14 473 € | **-16 568 €** | 16 568 € | 313 | non atteint | non atteint |
| O-R-pub | Outlook pour tous, export pour Gmail, relevés seulement, publicité payée | 25 371 € | 2 344 € | 10 372 € | **-17 342 €** | 17 342 € | 224 | non atteint | non atteint |
| T-R-pub | Export Gmail (Takeout), relevés seulement, publicité payée | 25 212 € | 2 180 € | 9 648 € | **-17 744 €** | 17 744 € | 208 | non atteint | non atteint |
| R10-banque-tot | Sobre, mais contrat Enable Banking signé dès le lancement | 23 977 € | 1 498 € | 6 752 € | **-18 723 €** | 18 723 € | 147 | non atteint | non atteint |
| G-T-org | Connexion Gmail pour tous, banque directe pour tous, bouche-à-oreille | 28 151 € | 2 710 € | 11 988 € | **-18 873 €** | 18 873 € | 266 | non atteint | non atteint |
| O-T-org | Outlook pour tous, export pour Gmail, banque directe pour tous, bouche-à-oreille | 26 356 € | 2 168 € | 9 590 € | **-18 933 €** | 18 933 € | 213 | non atteint | non atteint |
| T-T-org | Export Gmail (Takeout), banque directe pour tous, bouche-à-oreille | 26 300 € | 2 072 € | 9 167 € | **-19 205 €** | 19 205 € | 203 | non atteint | non atteint |
| G-P-org | Connexion Gmail pour tous, banque directe en premium, bouche-à-oreille | 27 610 € | 1 913 € | 8 462 € | **-21 061 €** | 21 061 € | 188 | non atteint | non atteint |
| O-P-org | Outlook pour tous, export pour Gmail, banque directe en premium, bouche-à-oreille | 26 039 € | 1 371 € | 6 065 € | **-21 345 €** | 21 345 € | 134 | non atteint | non atteint |
| T-P-org | Export Gmail (Takeout), banque directe en premium, bouche-à-oreille | 26 035 € | 1 275 € | 5 641 € | **-21 669 €** | 21 669 € | 125 | non atteint | non atteint |
| O>G-P-org | Outlook pour tous et export Gmail, puis connexion Gmail pour tous au 10e mois, banque directe en premium, bouche-à-oreille | 27 598 € | 1 728 € | 7 645 € | **-21 681 €** | 21 681 € | 182 | non atteint | non atteint |
| G-T-pub | Connexion Gmail pour tous, banque directe pour tous, publicité payée | 52 476 € | 5 420 € | 23 976 € | **-33 920 €** | 33 920 € | 532 | non atteint | non atteint |
| O-T-pub | Outlook pour tous, export pour Gmail, banque directe pour tous, publicité payée | 49 771 € | 4 336 € | 19 181 € | **-34 926 €** | 34 926 € | 425 | non atteint | non atteint |
| T-T-pub | Export Gmail (Takeout), banque directe pour tous, publicité payée | 49 548 € | 4 145 € | 18 335 € | **-35 359 €** | 35 359 € | 406 | non atteint | non atteint |
| G-P-pub | Connexion Gmail pour tous, banque directe en premium, publicité payée | 50 630 € | 3 826 € | 16 924 € | **-37 532 €** | 37 532 € | 375 | non atteint | non atteint |
| O-P-pub | Outlook pour tous, export pour Gmail, banque directe en premium, publicité payée | 48 192 € | 2 742 € | 12 129 € | **-38 805 €** | 38 805 € | 269 | non atteint | non atteint |
| T-P-pub | Export Gmail (Takeout), banque directe en premium, publicité payée | 48 051 € | 2 551 € | 11 283 € | **-39 319 €** | 39 319 € | 250 | non atteint | non atteint |

**Lecture** : la publicité payée fait perdre de l'argent dans tous les cas ; la banque directe signée dès le lancement (combinaisons P et T) coûte la licence Enable Banking chaque mois et fait perdre de l'argent sur 24 mois ; les meilleurs résultats viennent du bouche-à-oreille, d'une offre qui ne dépend pas du seul Premium mensuel, et de l'IA pour le travail répétitif.

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
| Licence Enable Banking, 1re année | 900 € | 250 (305 avec TVA) | Mais seuls les abonnés en plus grâce à la banque la paient : voir § 10 bis |
| Licence Enable Banking, 2e année | 1 200 € | 333 (407 avec TVA) | Mais seuls les abonnés en plus grâce à la banque la paient : voir § 10 bis |
| Licence Enable Banking, 3e année et après | 1 500 € | 416 (509 avec TVA) | Mais seuls les abonnés en plus grâce à la banque la paient : voir § 10 bis |

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

## 10 bis. La connexion bancaire directe (Enable Banking)

Offre écrite reçue d'Enable Banking (« Startup Offer 2026 », septembre 2026, verdict : confirmé) : une **licence mensuelle qui inclut un quota de comptes actifs**, avec une remise la 1re année, puis un prix par compte au-delà du quota, dégressif avec le volume. Enable Banking est agréé comme prestataire d'information sur les comptes (DSP2) et laisse les jeunes entreprises travailler sous son agrément : pas d'agrément à demander à l'ACPR. Un compte est facturé une fois par mois s'il a un consentement valide et qu'il est interrogé dans le mois ; le même IBAN reconnecté n'est pas recompté. Les tests avec vos propres comptes restent gratuits.

| | 1re année | 2e année | 3e année et après |
| --- | ---: | ---: | ---: |
| Licence par mois | 900 € | 1 200 € | 1 500 € |
| Comptes actifs inclus | 1 800 | 2 400 | 3 000 |
| Compte en plus | 0,50 € jusqu'au 5 000e, 0,30 € jusqu'au 50 000e, 0,20 € au-delà (le modèle facture chaque compte au prix de sa tranche ; à confirmer si toute la facture passe au prix de la tranche atteinte) | | |

Coût mensuel selon le nombre de comptes connectés :

| Comptes connectés | 1re année | 2e année | 3e année et après |
| ---: | ---: | ---: | ---: |
| 50 | 900 € | 1 200 € | 1 500 € |
| 500 | 900 € | 1 200 € | 1 500 € |
| 1 500 | 900 € | 1 200 € | 1 500 € |
| 3 000 | 1 500 € | 1 500 € | 1 500 € |
| 10 000 | 4 000 € | 4 000 € | 4 000 € |
| 60 000 | 18 000 € | 18 000 € | 18 000 € |

**Quand signer.** La licence est un coût fixe, mais elle ne se paie pas par tous les abonnés : ils paieraient de toute façon avec les relevés importés. Elle se paie par les abonnés **en plus** que la connexion directe apporte (hypothèse : +1 point de conversion, à mesurer). Il faut donc environ licence × 5 ÷ (1 × marge d'un abonné) abonnés Premium, soit environ 2 542 pour la licence de 1 500 € avec la TVA due ; le tableau ci-dessous place l'équilibre entre 10 000 et 20 000 actifs. Le modèle signe donc à **2 500 abonnés** (réglable). Un mois type à chaque taille, plan R9-sobre, en régime stable (contrat de plus de 2 ans) :

| Actifs | 2 000 | 5 000 | 10 000 | 20 000 | 50 000 |
| --- | ---: | ---: | ---: | ---: | ---: |
| Résultat sans banque directe | 1 435 € | 2 768 € | 5 598 € | 11 980 € | 31 215 € |
| Résultat avec banque directe | 162 € | 1 735 € | 5 376 € | 12 458 € | 32 983 € |
| dont Enable Banking | 1 500 € | 1 500 € | 1 500 € | 1 846 € | 3 769 € |
| **Différence** | **-1 273 €** | **-1 033 €** | **-222 €** | **479 €** | **1 768 €** |

Signer dès le lancement (R10) coûte 22 170 € de résultat sur 24 mois par rapport au plan sobre. Tant que le seuil n'est pas atteint, la banque directe reste en test gratuit sur vos propres comptes, et les utilisateurs importent leurs relevés.

## 11. Le masterplan recommandé

| Phase | Mois | Ce qu'on fait | Déclencheur pour passer à la suite | Dépense |
| --- | --- | --- | --- | --- |
| 0. Bêta gratuite | 1 à 2 | A-Outlook : relevés, export Gmail, Outlook pour tous, 100 places Gmail de test pour mesurer l'effet de la connexion ; vous répondez vous-même | Taux d'analyse terminée, intention de payer, 5 entretiens avec des professionnels | 0 € |
| 1. Lancement sobre | 3 à 9 | R9-sobre : Premium mensuel et annuel, rapport unique, résiliation assistée, affiliation signalée ; un seul assistant IA ; Stripe, Vercel Pro | Seuil de rentabilité atteint (20 inscrits par mois, 43 actifs, 11 Premium) | environ 38 € par mois |
| 2. Gmail pour tous | à partir du 10e mois, si l'effet mesuré dépasse 17 abonnés | Validation Google, audit CASA | Heures au-delà des vôtres | + 700 € par an |
| 3. Banque directe en Premium | à 2 500 abonnés Premium (10 000 à 15 000 actifs) | Contrat Enable Banking, offre startup, connexion réservée aux abonnés | | 900 € par mois la 1re année (1 800 comptes inclus), puis 1 200 €, puis 1 500 € |
| 4. Premières personnes | quand les heures dépassent 40 h par mois | Indépendant pour le support et les contenus, puis un salarié au-delà de 74 h | Licences professionnelles validées par des entretiens | 35 € de l'heure, puis 2 600 € par mois |
| 5. Licences professionnelles | quand 3 professionnels ont dit oui | Marque blanche, 149 € par mois | | 12 h par licence |

Avec les paramètres actuels, le plan R9-sobre donne sur 24 mois : dépenses 1 163 €, résultat **3 447 €**, trésorerie à avancer 21 €, 123 abonnés Premium à la fin, remboursé au mois 6.

**Critères d'arrêt** : si la conversion reste sous 1 % des inscrits après 3 mois de lancement, ou si le coût par actif dépasse le revenu par actif, revenir à la phase gratuite et retravailler l'offre avant de dépenser plus.

## 12. Le plan recommandé mois par mois

| Mois | Inscrits | Actifs | Premium | Revenus nets | Dépenses | dont IA | dont personnel | Cotisations | Résultat | Cumul |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 (bêta) | 50 | 22 | 0 | 0 € | 0 € | 0 € | 0 € | 0 € | 0 € | 0 € |
| 2 (bêta) | 50 | 38 | 0 | 0 € | 0 € | 0 € | 0 € | 0 € | 0 € | 0 € |
| 3 | 100 | 71 | 2 | 29 € | 38 € | 19 € | 0 € | 6 € | -15 € | -15 € |
| 4 | 110 | 101 | 4 | 42 € | 38 € | 19 € | 0 € | 9 € | -5 € | -21 € |
| 5 | 121 | 129 | 7 | 56 € | 38 € | 19 € | 0 € | 12 € | 5 € | -15 € |
| 6 | 133 | 155 | 9 | 71 € | 39 € | 19 € | 0 € | 16 € | 16 € | 1 € |
| 7 | 146 | 182 | 12 | 86 € | 39 € | 19 € | 0 € | 19 € | 28 € | 29 € |
| 8 | 161 | 208 | 15 | 102 € | 39 € | 19 € | 0 € | 23 € | 41 € | 70 € |
| 9 | 177 | 235 | 19 | 120 € | 39 € | 20 € | 0 € | 27 € | 55 € | 125 € |
| 10 | 195 | 264 | 22 | 139 € | 39 € | 20 € | 0 € | 31 € | 69 € | 194 € |
| 11 | 214 | 295 | 26 | 160 € | 39 € | 20 € | 0 € | 35 € | 85 € | 280 € |
| 12 | 236 | 328 | 30 | 183 € | 39 € | 20 € | 0 € | 40 € | 103 € | 383 € |
| 13 | 259 | 364 | 35 | 207 € | 40 € | 20 € | 0 € | 46 € | 122 € | 504 € |
| 14 | 285 | 403 | 40 | 234 € | 40 € | 20 € | 0 € | 52 € | 142 € | 647 € |
| 15 | 314 | 446 | 45 | 263 € | 40 € | 21 € | 0 € | 58 € | 165 € | 811 € |
| 16 | 345 | 493 | 51 | 295 € | 40 € | 21 € | 0 € | 65 € | 189 € | 1 001 € |
| 17 | 380 | 544 | 57 | 330 € | 41 € | 21 € | 0 € | 73 € | 216 € | 1 217 € |
| 18 | 418 | 600 | 64 | 368 € | 41 € | 21 € | 0 € | 82 € | 245 € | 1 462 € |
| 19 | 459 | 661 | 72 | 410 € | 52 € | 22 € | 11 € | 91 € | 267 € | 1 728 € |
| 20 | 505 | 729 | 80 | 455 € | 65 € | 22 € | 23 € | 101 € | 289 € | 2 018 € |
| 21 | 556 | 803 | 89 | 505 € | 79 € | 22 € | 37 € | 112 € | 314 € | 2 332 € |
| 22 | 612 | 885 | 100 | 560 € | 95 € | 23 € | 52 € | 124 € | 341 € | 2 673 € |
| 23 | 673 | 974 | 111 | 621 € | 112 € | 23 € | 69 € | 138 € | 371 € | 3 044 € |
| 24 | 740 | 1 073 | 123 | 687 € | 131 € | 24 € | 87 € | 152 € | 404 € | 3 447 € |

---
Généré le 2026-09-29 par `scripts/gen-modele.mjs`. Ne pas modifier à la main : modifiez `docs/model.mjs`.
