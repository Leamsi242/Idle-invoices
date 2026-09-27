# Modèle économique et masterplan

Ce document est **généré** à partir de `docs/model.mjs`, le même modèle que la page dynamique `docs/masterplan.html` (à ouvrir dans un navigateur, ou la version publiée dans la conversation). Pour changer une hypothèse : modifiez sa valeur dans `docs/model.mjs`, puis lancez `npm run modele`. Sur la page, chaque paramètre se règle en direct.

Projection sur 24 mois, dont 2 mois de bêta gratuite. Montants en euros. Chaque paramètre porte sa source et son verdict ; les hypothèses sont à remplacer par les mesures de la bêta (`docs/BETA.md`, § 7 et 8).

## 1. Les paramètres

| Paramètre | Valeur | Verdict | Source ou remarque |
| --- | --- | --- | --- |
| Durée de la projection | 24 mois |  |  |
| Bêta gratuite avant le lancement | 2 mois | hypothèse |  |
| Inscriptions le premier mois après la bêta | 100 inscrits | hypothèse |  |
| Croissance des inscriptions | 10 % par mois | hypothèse |  |
| Départs des utilisateurs gratuits | 25 % par mois | hypothèse |  |
| Résiliations Premium | 5 % par mois | hypothèse |  |
| Activation avec relevés seulement | 30 % | hypothèse à mesurer |  |
| Activation en plus avec l'export Gmail (Takeout) | 10 points | hypothèse à mesurer |  |
| Activation en plus avec la connexion Gmail en lecture seule | 30 points | hypothèse à mesurer |  |
| Inscrits dont la boîte principale est Outlook ou Hotmail | 15 % des inscrits | hypothèse à mesurer |  |
| Activation en plus si tout le monde connecte sa banque | 25 points | hypothèse à mesurer |  |
| Conversion en Premium des utilisateurs activés | 5 % des activés | partiellement vérifié | 5 % des activés, soit environ 2 % des inscrits avec 40 % d'activation (médiane freemium 2,1 %, RevenueCat 2025) |
| Prix Premium | 4,99 € TTC par mois | partiellement vérifié | Bankin' Plus 4,99 €, Linxo 4,49 € |
| Rapport unique sans abonnement | 9 € TTC | hypothèse |  |
| Activés qui achètent le rapport unique | 3 % des activés | hypothèse |  |
| TVA | 20 % | confirmé (taux normal français) |  |
| Stripe, part variable (cartes EEE standard) | 1,5 % | partiellement vérifié |  |
| Stripe, part fixe par paiement | 0,25 € | partiellement vérifié |  |
| Cotisations micro-entreprise (prestations de services) | 21,2 % du chiffre d'affaires | non vérifiable ici | taux à vérifier sur autoentrepreneur.urssaf.fr selon l'activité déclarée |
| Conversion dollar vers euro | 0,92 € pour 1 $ | hypothèse, à ajuster |  |
| Vercel Pro (obligatoire dès un revenu) | 20 $ par mois | partiellement vérifié |  |
| Actifs qui tiennent dans Vercel Hobby | 450 actifs | mesuré en local | mesuré : 16 s de calcul par actif et par mois, marge ×2 |
| Calcul facturé en plus sur Vercel Pro | 0,002 € par actif et par mois | estimation |  |
| Actifs qui tiennent dans Turso Free | 1250 actifs | estimation à partir de mesures |  |
| Turso Developer | 4,99 $ par mois | partiellement vérifié |  |
| Nom de domaine | 12 € par an | estimation |  |
| Resend gratuit | 3000 e-mails par mois | partiellement vérifié |  |
| Resend Pro | 20 $ par mois | partiellement vérifié |  |
| Alertes envoyées par abonné Premium | 4 e-mails par mois | hypothèse |  |
| Audit de sécurité CASA pour Gmail (niveau 2, puis chaque année) | 700 € par an | partiellement vérifié (sources tierces) | TAC Security : 540 $ (Basic), 720 $ (Premium, nouveaux passages illimités), 1 800 $ (Enterprise) ; Leviathan 800 à 1 200 $. Pas de voie gratuite depuis la fin de l'auto-analyse |
| Délai de validation Google avant d'ouvrir Gmail à tous | 2 mois | partiellement vérifié | vérification de la marque en quelques jours, accès restreint « plusieurs semaines » selon Google, 2 à 8 semaines d'après des retours d'expérience |
| Enable Banking, par compte connecté | 0,5 € par compte et par mois | hypothèse, tarif sur devis |  |
| Enable Banking, minimum mensuel | 0 € par mois | hypothèse, tarif sur devis |  |
| Part des concernés qui connectent leur banque | 60 % | hypothèse |  |
| Coût d'acquisition en publicité payée | 1,5 € par inscrit | hypothèse |  |
| Inscriptions multipliées par la publicité | 2 × | hypothèse |  |

## 2. Tous les scénarios, du meilleur résultat au moins bon

Chaque scénario combine trois choix : **la boîte mail** (Export Gmail (Takeout) ; Connexion Gmail pour tous ; Outlook pour tous, export pour Gmail), **la banque** (Relevés seulement ; Banque directe en Premium ; Banque directe pour tous) et **l'acquisition** (Bouche-à-oreille ; Publicité payée). « Dépenses » = ce que vous payez de votre poche (hébergement, audit, banque, publicité, domaine) ; « cotisations » = cotisations sociales sur le chiffre d'affaires ; « trésorerie à avancer » = le creux le plus bas du résultat cumulé.

| Code | Scénario | Dépenses 24 mois | Cotisations | Revenus nets | Résultat 24 mois | Trésorerie à avancer | Premium au mois 24 | Premier mois rentable | Remboursé au | Dépenses sous 1 000 € |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | --- |
| O-R-org | Outlook pour tous, export pour Gmail, relevés seulement, bouche-à-oreille | 432 € | 977 € | 4 265 € | **2 856 €** | 6 € | 112 | mois 4 | mois 5 | oui |
| G-R-org | Connexion Gmail pour tous, relevés seulement, bouche-à-oreille | 1 849 € | 1 363 € | 5 951 € | **2 739 €** | 703 € | 156 | mois 4 | mois 17 | non |
| T-R-org | Export Gmail (Takeout), relevés seulement, bouche-à-oreille | 431 € | 908 € | 3 967 € | **2 628 €** | 7 € | 104 | mois 5 | mois 5 | oui |
| O-P-org | Outlook pour tous, export pour Gmail, banque directe en premium, bouche-à-oreille | 715 € | 977 € | 4 265 € | **2 574 €** | 7 € | 112 | mois 4 | mois 5 | oui |
| T-P-org | Export Gmail (Takeout), banque directe en premium, bouche-à-oreille | 694 € | 908 € | 3 967 € | **2 365 €** | 9 € | 104 | mois 5 | mois 6 | oui |
| G-P-org | Connexion Gmail pour tous, banque directe en premium, bouche-à-oreille | 2 243 € | 1 363 € | 5 951 € | **2 345 €** | 703 € | 156 | mois 4 | mois 18 | non |
| O>G-R-org | Outlook pour tous et export Gmail, puis connexion Gmail pour tous au 10e mois, relevés seulement, bouche-à-oreille | 1 847 € | 1 232 € | 5 383 € | **2 304 €** | 443 € | 151 | mois 4 | mois 5 | non |
| O>G-P-org | Outlook pour tous et export Gmail, puis connexion Gmail pour tous au 10e mois, banque directe en premium, bouche-à-oreille | 2 200 € | 1 232 € | 5 383 € | **1 950 €** | 477 € | 151 | mois 4 | mois 5 | non |
| O-T-org | Outlook pour tous, export pour Gmail, banque directe pour tous, bouche-à-oreille | 5 123 € | 1 544 € | 6 744 € | **77 €** | 278 € | 177 | mois 15 | mois 23 | non |
| T-T-org | Export Gmail (Takeout), banque directe pour tous, bouche-à-oreille | 4 911 € | 1 476 € | 6 447 € | **60 €** | 275 € | 169 | mois 15 | mois 24 | non |
| G-T-org | Connexion Gmail pour tous, banque directe pour tous, bouche-à-oreille | 7 696 € | 1 930 € | 8 430 € | **-1 196 €** | 1 682 € | 221 | mois 15 | non atteint | non |
| G-R-pub | Connexion Gmail pour tous, relevés seulement, publicité payée | 23 327 € | 2 725 € | 11 902 € | **-14 150 €** | 14 150 € | 313 | non atteint | non atteint | non |
| G-P-pub | Connexion Gmail pour tous, banque directe en premium, publicité payée | 24 115 € | 2 725 € | 11 902 € | **-14 939 €** | 14 939 € | 313 | non atteint | non atteint | non |
| O-R-pub | Outlook pour tous, export pour Gmail, relevés seulement, publicité payée | 21 897 € | 1 953 € | 8 530 € | **-15 320 €** | 15 320 € | 224 | non atteint | non atteint | non |
| T-R-pub | Export Gmail (Takeout), relevés seulement, publicité payée | 21 890 € | 1 817 € | 7 935 € | **-15 772 €** | 15 772 € | 208 | non atteint | non atteint | non |
| O-P-pub | Outlook pour tous, export pour Gmail, banque directe en premium, publicité payée | 22 462 € | 1 953 € | 8 530 € | **-15 885 €** | 15 885 € | 224 | non atteint | non atteint | non |
| T-P-pub | Export Gmail (Takeout), banque directe en premium, publicité payée | 22 415 € | 1 817 € | 7 935 € | **-16 298 €** | 16 298 € | 208 | non atteint | non atteint | non |
| O-T-pub | Outlook pour tous, export pour Gmail, banque directe pour tous, publicité payée | 31 235 € | 3 088 € | 13 489 € | **-20 835 €** | 20 835 € | 354 | non atteint | non atteint | non |
| T-T-pub | Export Gmail (Takeout), banque directe pour tous, publicité payée | 30 817 € | 2 952 € | 12 894 € | **-20 875 €** | 20 875 € | 339 | non atteint | non atteint | non |
| G-T-pub | Connexion Gmail pour tous, banque directe pour tous, publicité payée | 34 974 € | 3 861 € | 16 861 € | **-21 974 €** | 21 974 € | 443 | non atteint | non atteint | non |

**Lecture** : la publicité payée fait perdre de l'argent dans tous les cas (un inscrit rapporte moins que son coût d'acquisition avec ces hypothèses) ; la banque directe ouverte à tous coûte plus qu'elle ne rapporte ; les meilleurs résultats viennent du bouche-à-oreille, avec la banque directe réservée au Premium ou pas de banque directe du tout.

## 3. Les phases gratuites (pas de revenu)

| Code | Scénario | Dépenses 24 mois | Ce que ça permet |
| --- | --- | ---: | --- |
| A0 | Gratuit, export Gmail, 450 testeurs au plus | 0 € | 450 testeurs actifs au plus ; Gmail par export Takeout (0 €), connexion Gmail pour 100 testeurs |
| A-Gmail | Gratuit, connexion Gmail pour tous, 450 testeurs au plus | 1 424 € | La connexion Gmail en lecture seule ouverte à tous, 450 testeurs au plus ; validation Google et audit CASA payants |
| A-Outlook | Gratuit, connexion Outlook pour tous et export pour Gmail, 450 testeurs au plus | 0 € | Comme A0, plus la connexion Outlook ouverte à tous (gratuite, sans plafond trouvé) |
| A-Gmail+ | Gratuit, connexion Gmail pour tous, sans plafond | 1 664 € | Comme A-Gmail, sans plafond de testeurs (Vercel Pro au-delà de 450 actifs) |

## 4. Les seuils où chaque dépense se rembourse

Un abonné Premium à 4,99 € rapporte **2,95 € par mois** une fois retirés la TVA, Stripe et les cotisations.

| Dépense | Coût par mois | Abonnés Premium pour la couvrir | Quand la déclencher |
| --- | ---: | ---: | --- |
| Vercel Pro | 18 € | 7 | Au premier euro encaissé (obligatoire), ou au-delà de 450 testeurs actifs |
| Connexion Gmail pour tous (audit CASA annuel) | 58 € | 20 | Quand la connexion Gmail apporte au moins ce nombre d'abonnés en plus que l'export (à mesurer pendant la bêta avec les 100 places de test) |
| Turso Developer | 5 € | 2 | Au-delà de 1 250 actifs |
| Resend Pro | 18 € | 7 | Au-delà de 3 000 alertes par mois |
| Enable Banking, minimum de 100 € | 100 € | 38 | Signer le contrat quand ce nombre d'abonnés est atteint, connexion réservée au Premium |
| Enable Banking, minimum de 300 € | 300 € | 114 | Signer le contrat quand ce nombre d'abonnés est atteint, connexion réservée au Premium |

## 5. Laisser tous les utilisateurs se connecter à Gmail en lecture seule

La connexion en lecture seule rassure davantage qu'un export Takeout à déposer : l'utilisateur clique sur « Autoriser » chez Google, l'application ne lit que les e-mails qui ressemblent à des reçus, ne garde aucun jeton et retire son accès juste après. Mais Google ne l'autorise pour plus de 100 personnes qu'après validation :

- **plafond de 100 utilisateurs pour toute la vie du projet** tant que l'application n'est pas validée, même en « production » (confirmé : [aide Google](https://support.google.com/cloud/answer/7454865)) ;
- **vérification de la marque**, puis **vérification des accès restreints** : page d'accueil publique sur un domaine vérifié, politique de confidentialité sur le même domaine, mention « Limited Use », **vidéo de démonstration en anglais** (celles du kit de lancement servent de base) (confirmé : [vérification de la marque](https://developers.google.com/identity/protocols/oauth2/production-readiness/brand-verification), [règles des données utilisateur](https://developers.google.com/terms/api-services-user-data-policy)) ;
- **audit de sécurité CASA de niveau 2 chaque année**, fait par un laboratoire agréé ; l'auto-analyse gratuite n'existe plus (confirmé pour l'obligation, [CASA](https://appdefensealliance.dev/casa/tier-2/tier2-overview)) ; prix : 540 à 1 800 $ par an chez TAC Security, 800 à 1 200 $ chez Leviathan (partiellement vérifié, sources tierces) ;
- **délai** : quelques jours pour la marque, « plusieurs semaines » pour les accès restreints, souvent 2 à 8 semaines (partiellement vérifié) ;
- aucune portée plus étroite ne lit les reçus sans être « restreinte » (`gmail.metadata` l'est aussi ; confirmé : [portées Gmail](https://developers.google.com/workspace/gmail/api/auth/scopes)).

Comparaison, relevés seulement et bouche-à-oreille :

|  | Export Takeout (T-R-org) | Outlook pour tous (O-R-org) | Gmail pour tous dès le départ (G-R-org) | Outlook, puis Gmail au 10e mois (O>G-R-org) |
| --- | ---: | ---: | ---: | ---: |
| Dépenses 24 mois | 431 € | 432 € | 1 849 € | 1 847 € |
| Résultat 24 mois | 2 628 € | 2 856 € | 2 739 € | 2 304 € |
| Trésorerie à avancer | 7 € | 6 € | 703 € | 443 € |
| Premium au mois 24 | 104 | 112 | 156 | 151 |
| Remboursé au | mois 5 | mois 5 | mois 17 | mois 5 |

Avec ces hypothèses, **Outlook pour tous** donne le meilleur résultat sans avancer d'argent ; **Gmail pour tous dès le départ** apporte le plus d'abonnés mais demande d'avancer l'audit ; **Outlook, puis Gmail au 10e mois** garde le risque bas et n'engage l'audit qu'une fois l'effet mesuré.

Tout dépend de l'hypothèse « activation en plus avec la connexion Gmail en lecture seule » (30 points contre 10 pour l'export) : **mesurez-la pendant la bêta** avec les 100 places de test Gmail (taux d'analyse terminée avec la connexion, contre avec l'export). Si l'écart réel est inférieur à 20 abonnés par mois de différence, l'export suffit.

La connexion **Outlook** peut, elle, être ouverte à tous dès maintenant sans frais (comptes personnels : pas de plafond trouvé, mention « non vérifié » affichée ; la vérification d'éditeur Microsoft est gratuite mais demande un compte partenaire ; partiellement vérifié).

## 6. Le masterplan recommandé

| Phase | Mois | Scénario | Déclencheur pour passer à la suite | Dépense |
| --- | --- | --- | --- | --- |
| 0. Bêta gratuite | 1 à 2 | A-Outlook : relevés, export Gmail, Outlook pour tous, 100 places Gmail de test pour mesurer l'effet de la connexion | Taux d'analyse terminée et intention de payer mesurés | 0 € |
| 1. Lancement payant | 3 à 9 | Premium 4,99 €, rapport unique 9 €, Stripe, Vercel Pro, bouche-à-oreille et parrainage | 20 abonnés de plus attendus avec Gmail | 18 € par mois |
| 2. Gmail pour tous | à partir du 10e mois (validation en 2 mois) | Validation Google, audit CASA, connexion Gmail ouverte | Nombre d'abonnés au-dessus du seuil Enable Banking | + 700 € par an |
| 3. Banque directe en Premium | quand le seuil du devis est atteint | Contrat Enable Banking, connexion directe réservée aux abonnés | | minimum du contrat + 0,5 € par compte (hypothèse) |

Avec les paramètres actuels, ce plan (O>G-P-org) donne : dépenses 2 200 €, résultat 1 950 € sur 24 mois, trésorerie à avancer 477 €, 151 abonnés Premium au 24e mois.

**Critères d'arrêt** : si la conversion reste sous 1 % des inscrits après 3 mois de lancement, ou si le coût par actif dépasse le revenu par actif, revenir à la phase gratuite et retravailler l'offre avant de dépenser plus.

## 7. Le plan mois par mois

| Mois | Inscrits | Actifs | Premium | Revenus nets | Dépenses | Cotisations | Résultat | Cumul |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 (bêta) | 50 | 22 | 0 | 0 € | 0 € | 0 € | 0 € | 0 € |
| 2 (bêta) | 50 | 38 | 0 | 0 € | 0 € | 0 € | 0 € | 0 € |
| 3 | 100 | 71 | 2 | 17 € | 20 € | 4 € | -7 € | -7 € |
| 4 | 110 | 101 | 4 | 27 € | 21 € | 6 € | 0 € | -6 € |
| 5 | 121 | 129 | 7 | 37 € | 21 € | 8 € | 7 € | 1 € |
| 6 | 133 | 155 | 9 | 48 € | 22 € | 11 € | 15 € | 16 € |
| 7 | 146 | 181 | 12 | 59 € | 23 € | 14 € | 23 € | 38 € |
| 8 | 161 | 208 | 15 | 72 € | 24 € | 16 € | 31 € | 70 € |
| 9 | 177 | 235 | 18 | 85 € | 25 € | 19 € | 41 € | 111 € |
| 10 | 195 | 263 | 21 | 99 € | 26 € | 23 € | 51 € | 161 € |
| 11 | 214 | 294 | 25 | 115 € | 727 € | 26 € | -638 € | -477 € |
| 12 | 236 | 367 | 31 | 148 € | 29 € | 34 € | 85 € | -392 € |
| 13 | 259 | 437 | 37 | 174 € | 30 € | 40 € | 104 € | -288 € |
| 14 | 285 | 506 | 44 | 204 € | 33 € | 47 € | 124 € | -163 € |
| 15 | 314 | 577 | 51 | 235 € | 35 € | 54 € | 146 € | -17 € |
| 16 | 345 | 650 | 59 | 269 € | 37 € | 62 € | 170 € | 153 € |
| 17 | 380 | 727 | 67 | 306 € | 40 € | 70 € | 196 € | 349 € |
| 18 | 418 | 809 | 76 | 346 € | 43 € | 79 € | 224 € | 572 € |
| 19 | 459 | 898 | 86 | 389 € | 46 € | 89 € | 254 € | 826 € |
| 20 | 505 | 994 | 97 | 437 € | 50 € | 100 € | 287 € | 1 114 € |
| 21 | 556 | 1 098 | 109 | 489 € | 53 € | 112 € | 323 € | 1 437 € |
| 22 | 612 | 1 213 | 122 | 545 € | 57 € | 125 € | 363 € | 1 800 € |
| 23 | 673 | 1 337 | 136 | 607 € | 767 € | 139 € | -298 € | 1 502 € |
| 24 | 740 | 1 474 | 151 | 675 € | 71 € | 155 € | 449 € | 1 950 € |

---
Généré le 2026-09-27 par `scripts/gen-modele.mjs`. Ne pas modifier à la main : modifiez `docs/model.mjs`.
