# Bêta fermée : règles, limites, coûts et durée

Ce document dit comment faire tester Subscription Detective par 100 personnes au plus, gratuitement pour vous, et ce qui coûte de l'argent si vous allez plus loin. Chaque chiffre porte un verdict et sa source :

- **confirmé** : lu sur la page officielle ;
- **partiellement vérifié** : lu dans un extrait de la page officielle ou une source secondaire, à relire avant de s'engager ;
- **non vérifiable** : pas de source publique trouvée ;
- **estimation** : calcul fait à partir de l'application elle-même, hypothèses données.

État au 27 septembre 2026. Les pages des fournisseurs n'ont pas pu être ouvertes en entier depuis l'environnement de travail (accès réseau filtré) : aucun chiffre n'est donc « confirmé ». Relisez les pages citées avant de payer quoi que ce soit.

## 1. Ce que les testeurs peuvent tester, source par source

| Source | Gratuit pour 100 testeurs ? | Ce qui bloque | Verdict, source |
| --- | --- | --- | --- |
| Banque par connexion directe (Enable Banking) | **Non** | En mode gratuit « restricted production », Enable Banking ne renvoie que les comptes reliés dans **votre** tableau de bord. Un testeur qui se connecte à sa banque obtient zéro compte. Pour les testeurs, il faut un contrat de production (vérification de votre société, tarif sur devis). | Partiellement vérifié : [linked accounts](https://enablebanking.com/docs/api/linked-accounts/), [FAQ](https://enablebanking.com/docs/faq/), [conditions](https://enablebanking.com/terms/) |
| Banque par relevé (CSV ou PDF) | **Oui** | Rien : l'import de relevés fonctionne sans fournisseur (Crédit Mutuel, CIC, N26, Revolut, banques françaises en CSV, relevés Amex France). | Code de l'application (`src/lib/parsers`) |
| PayPal par connexion directe | **Non** | Même règle qu'une banque (PayPal passe par Enable Banking). | Idem Enable Banking |
| PayPal par export CSV | **Oui** | Rien. | Code de l'application |
| Gmail | **Oui, 100 au plus** | L'application Google reste en statut « Test » : 100 utilisateurs test au plus, à ajouter un par un dans Google Cloud, et un écran « application non validée ». L'analyse se fait en une fois (pas de jeton gardé), donc l'expiration des autorisations au bout de 7 jours ne gêne pas. | Partiellement vérifié : [Google, statut de publication](https://support.google.com/cloud/answer/15549945), [production readiness](https://developers.google.com/identity/protocols/oauth2/production-readiness/overview) |
| Outlook / Hotmail | **Oui, probablement** | Microsoft Graph est gratuit pour la lecture du courrier. Un compte Microsoft personnel peut demander la « vérification de l'éditeur » (identifiant partenaire Microsoft, 1 à 5 jours ouvrés). À tester avec une adresse outlook.com avant d'inviter. | Partiellement vérifié : [API facturées](https://learn.microsoft.com/en-us/graph/metered-api-list), [vérification de l'éditeur](https://learn.microsoft.com/en-us/entra/identity-platform/publisher-verification-overview) |
| Captures d'écran App Store / Google Play | **Payant à l'usage** | Lues par l'API Claude, facturée au jeton. Sans clé `ANTHROPIC_API_KEY`, les testeurs collent le texte de la liste à la place (gratuit). | Voir § 3 |
| Mode démo | **Oui** | Rien : aucun fournisseur n'est appelé. | Code de l'application |

**Conséquence : la bêta gratuite se fait avec des relevés importés, Gmail, Outlook et le mode démo.** La connexion bancaire directe reste réservée à vous (le propriétaire) tant qu'il n'y a pas de contrat Enable Banking. L'application l'applique d'elle-même avec `BETA_BANK_MODE=owner` (voir § 4).

### Les banques françaises dans Enable Banking

La liste complète n'est pas publique en texte (la page [open-banking-apis?country=FR](https://enablebanking.com/open-banking-apis?country=FR) se charge en JavaScript). Ce qui a pu être vérifié :

| Banque | Verdict | Source |
| --- | --- | --- |
| Crédit Mutuel (toutes les fédérations), CIC | Proposée : partiellement vérifié | [Enable Banking, marché français](https://enablebanking.com/docs/markets/fr/) |
| BNP Paribas, Société Générale, Crédit Agricole (caisses régionales), LCL, Banque Populaire, Caisse d'Épargne, La Banque Postale | Proposées : partiellement vérifié | Même page |
| Hello bank!, Qonto, BoursoBank | Proposées : partiellement vérifié | [Changelog février 2024](https://enablebanking.com/blog/2024/03/11/changelog-february-2024) |
| American Express (comptes français) | Proposée : partiellement vérifié | [Changelog novembre 2022](https://enablebanking.com/blog/2022/12/07/changelog-november-2022) |
| PayPal, Revolut, N26 | Intégrations existantes, présence dans la liste « FR » non vérifiable | [Changelog octobre 2022](https://enablebanking.com/blog/2022/11/09/changelog-october-2022) |
| Fortuneo, Shine, Monabanq, HSBC France (CCF), Nickel, Ma French Bank | Non vérifiable | Aucune source trouvée |

**Pour le vérifier vous-même en une commande**, une fois l'application déployée avec vos clés Enable Banking :

```bash
curl -H "Authorization: Bearer <CRON_SECRET>" "https://<domaine>/api/beta/banks?country=FR"
```

La réponse donne toutes les banques qu'Enable Banking liste pour **votre** application, le nombre total, celles que l'application propose (`shown`), celles qu'elle cache parce qu'elles ne servent qu'aux comptes professionnels (`hidden`), et la durée de consentement maximale de chacune (`consentDays`).

Limites communes à toutes les banques (partiellement vérifié) :

- l'historique complet n'est lisible que pendant l'heure qui suit l'authentification, ensuite 90 jours ([FAQ Enable Banking](https://enablebanking.com/docs/faq/)) ; l'application lit tout juste après la connexion ;
- consentement de 180 jours pour la plupart des banques, 90 pour certaines ([changelog octobre 2025](https://enablebanking.com/blog/2025/11/05/enable-banking-changelog-october-2025)) ;
- 4 lectures par jour et par compte au plus sans l'utilisateur ([règlement (UE) 2018/389, art. 36](https://www.eba.europa.eu/single-rule-book-qa/qna/view/publicId/2019_4631)) ; la surveillance de nuit lit une fois par nuit.

## 2. Les offres gratuites et leurs plafonds

| Service | Offre gratuite | Plafond utile ici | Verdict, source |
| --- | --- | --- | --- |
| Vercel Hobby | 0 € | **Usage non commercial seulement** ; 1 million d'invocations, 4 h de CPU actif, 100 Go de transfert par mois ; 300 s par fonction | Partiellement vérifié : [conditions](https://vercel.com/legal/terms), [fair use](https://vercel.com/docs/limits/fair-use-guidelines), [Hobby](https://vercel.com/docs/plans/hobby) |
| Turso Free | 0 € | 5 Go, 500 millions de lignes lues et 10 millions écrites par mois | Partiellement vérifié : [tarifs Turso](https://turso.tech/pricing) |
| Google (Gmail API) | 0 € | 100 utilisateurs test | Partiellement vérifié : [quotas Gmail](https://developers.google.com/workspace/gmail/api/reference/quota) |
| Microsoft Graph (courrier) | 0 € | Aucun plafond d'utilisateurs trouvé | Partiellement vérifié |
| Resend | 0 € | 3 000 e-mails par mois, 100 par jour, 1 domaine | Partiellement vérifié : [tarifs Resend](https://resend.com/pricing) |
| Enable Banking restreint | 0 € | Vos comptes reliés seulement | Partiellement vérifié |

Deux précisions :

1. **« Non commercial » chez Vercel** : une bêta gratuite, sans publicité, sans affiliation et sans société qui paie quelqu'un pour le code reste non commerciale d'après le texte des conditions. Dès qu'il y a un revenu (abonnement, commission) ou un salarié payé pour le projet, il faut Vercel Pro. C'est une lecture du texte, pas un avis de Vercel.
2. **Alertes par e-mail** : pour écrire à d'autres adresses que la vôtre, Resend demande un domaine vérifié. Un nom de domaine coûte environ 10 € par an (estimation, selon le registraire). Sans domaine, laissez `RESEND_API_KEY` vide : les alertes restent visibles dans l'application.

## 3. Ce que consomme un testeur (estimation)

Hypothèses : un testeur importe 12 à 24 mois de relevés (environ 3 000 opérations), fait une analyse Gmail, ouvre l'application 60 fois par mois et prend 20 décisions.

| Poste | Par testeur et par mois | 100 testeurs | Plafond gratuit | Marge |
| --- | --- | --- | --- | --- |
| Lignes écrites (Turso) | environ 3 500 (import, puis recalcul à chaque décision) | environ 350 000 | 10 000 000 | ×28 |
| Lignes lues (Turso) | environ 180 000 (chaque page relit les opérations) | environ 18 millions | 500 millions | ×27 |
| CPU actif (Vercel) | environ 10 s | environ 17 minutes | 4 heures | ×14 |
| Invocations (Vercel) | environ 150 | 15 000 | 1 million | ×66 |
| E-mails d'alerte | 0 à 4 | 400 au plus | 3 000 | ×7 |

Ce sont des estimations tirées du fonctionnement de l'application (un recalcul réécrit les abonnements et leurs correspondances, une page lit les opérations de la session) : mesurez les vraies valeurs dans les tableaux de bord Vercel et Turso après la première semaine.

**Captures d'écran (API Claude)** : l'application utilise `claude-opus-5`, à 5 $ par million de jetons en entrée et 25 $ en sortie (partiellement vérifié, table des modèles de la documentation Anthropic au 24 juin 2026, [tarifs](https://platform.claude.com/docs/en/about-claude/pricing)). Une capture d'écran de téléphone compte jusqu'à environ 4 800 jetons d'image, plus 150 jetons de consigne et 300 à 800 jetons de réponse, soit **2 à 5 centimes de dollar par capture** (estimation). Avec le plafond par défaut de 200 captures par mois pour toute la bêta : **10 $ par mois au plus**. L'API Claude n'a pas d'offre gratuite ; les crédits s'achètent à l'avance.

## 4. Les règles appliquées par l'application

Toutes se règlent par variables d'environnement sur Vercel, sans toucher au code (`src/lib/beta.ts`). Les comptes sont faits dans la base de données, donc ils tiennent même quand Vercel lance plusieurs serveurs.

| Variable | Défaut | Effet |
| --- | --- | --- |
| `BETA_ACCESS_CODE` | vide (pas de code) | Code d'invitation demandé une fois par navigateur avant toute connexion réelle. Lien d'invitation direct : `https://<domaine>/api/beta?code=<code>` |
| `BETA_OWNER_CODE` | vide | Votre code à vous : saisi dans le même champ, il lève toutes les limites dans votre navigateur. Ne le mettez jamais dans un lien. |
| `BETA_BANK_MODE` | `all` | `owner` : seule votre session connecte une banque ou PayPal directement ; les testeurs voient « importez plutôt un relevé ». **À mettre à `owner` tant qu'Enable Banking est en mode restreint.** |
| `BETA_MAX_TESTERS` | 100 | Navigateurs qui peuvent importer ou connecter de vraies données. Au-delà : « La bêta est complète », le mode démo reste ouvert. Un testeur déjà entré n'est jamais bloqué. |
| `BETA_BANK_CONNECTIONS_PER_DAY` | 3 | Connexions bancaires directes par testeur et par 24 h |
| `BETA_UPLOADS_PER_DAY` | 30 | Fichiers ou textes collés par testeur et par 24 h |
| `BETA_SCREENSHOTS_PER_DAY` | 5 | Captures d'écran par testeur et par 24 h |
| `BETA_SCREENSHOTS_PER_MONTH` | 200 | Captures d'écran pour toute la bêta, par mois civil (plafond de dépense Claude) |
| `BETA_MAX_WATCHES` | 100 | Comptes surveillés chaque nuit en même temps |

Autres règles, toujours actives :

- aucune connexion réelle pendant le mode démo (les données seraient effacées en quittant la démo) ;
- 5 démos par adresse IP et par 10 minutes ;
- écritures refusées depuis un autre site ;
- effacement automatique 30 jours après le dernier import.

**Suivre la consommation** :

```bash
curl -H "Authorization: Bearer <CRON_SECRET>" "https://<domaine>/api/beta/usage"
```

La réponse donne le nombre de testeurs, les surveillances actives, et pour le mois en cours les connexions bancaires, analyses de boîte mail, captures et fichiers.

## 5. Les deux scénarios chiffrés

### Scénario A : bêta gratuite (recommandé pour commencer)

Réglages : `BETA_ACCESS_CODE=<un code>`, `BETA_OWNER_CODE=<un autre code>`, `BETA_BANK_MODE=owner`, `ANTHROPIC_API_KEY` vide, `RESEND_API_KEY` vide.

| Poste | Coût |
| --- | --- |
| Vercel Hobby, Turso Free, Gmail en test, Microsoft Graph, Enable Banking restreint | 0 € |
| Captures d'écran | 0 € (les testeurs collent le texte) |
| Alertes e-mail | 0 € (visibles dans l'application seulement) |
| **Total** | **0 € par mois** |

Options : un domaine (environ 10 € par an, estimation) pour les alertes e-mail ; une clé Claude avec le plafond de 200 captures (10 $ par mois au plus).

### Scénario B : 100 testeurs avec connexion bancaire directe

| Poste | Coût | Verdict |
| --- | --- | --- |
| Enable Banking production | Sur devis : facturation par compte consulté et par mois, avec un minimum mensuel. Demande à info@enablebanking.com ou via le formulaire « Get a Quote ». | Tarif non vérifiable ([FAQ](https://enablebanking.com/docs/faq/)) |
| Vérification de votre société (KYB) chez Enable Banking | 0 € mais une société est nécessaire | Partiellement vérifié |
| Vercel Pro (un contrat avec une société rend l'usage commercial) | 20 $ par mois et par membre, 20 $ d'usage inclus | Partiellement vérifié : [Pro](https://vercel.com/docs/plans/pro-plan) |
| Turso | 0 € (Free suffit), 4,99 $ par mois si besoin (Developer) | Partiellement vérifié |
| Domaine + Resend Free | environ 10 € par an | Estimation |
| **Total** | **20 $ par mois + devis Enable Banking** | |

À demander à Enable Banking en même temps que le devis : faut-il votre propre agrément ou un statut d'agent auprès de l'ACPR, ou leur licence suffit-elle ? ([procédure d'agent de l'ACPR](https://acpr.banque-france.fr/fr/professionnels/lacpr-vous-accompagne/banque/creer-ma-societe/mes-procedures/agent-prestataire-de-services-de-paiement)). Point non vérifiable sans leur réponse.

**Lancement public après la bêta** (hors du périmètre gratuit) : validation Google de l'accès « restreint » à Gmail avec un audit de sécurité CASA annuel par un laboratoire agréé, environ 540 à 1 800 $ par an et 6 semaines ou plus (non vérifiable pour le prix, partiellement vérifié pour la procédure : [vérification des accès restreints](https://developers.google.com/identity/protocols/oauth2/production-readiness/restricted-scope-verification), [CASA niveau 2](https://appdefensealliance.dev/casa/tier-2/tier2-overview)). Une analyse d'impact RGPD (AIPD) est conseillée dès la bêta : données bancaires et courriels ([CNIL](https://www.cnil.fr/fr/ce-quil-faut-savoir-sur-lanalyse-dimpact-relative-la-protection-des-donnees-aipd)).

## 6. Le déroulé : 8 semaines

| Semaine | Étape | Testeurs | À mesurer |
| --- | --- | --- | --- |
| 0 | Réglages ci-dessus, 30 adresses Gmail ajoutées dans Google Cloud, test complet avec vos propres comptes (connexion directe en mode propriétaire) | 1 | Tout fonctionne de bout en bout |
| 1 | Vague 1 : proches, par lien d'invitation | 10 | Taux d'import réussi, fichiers refusés (colonnes inconnues), temps pour arriver au premier résultat |
| 2 à 3 | Vague 2 | 40 | Abonnements trouvés par testeur, part de « Pas un abonnement » (faux positifs), montant « à examiner » |
| 4 | Vague 3, ajout des 60 dernières adresses Gmail | 100 | Consommation (`/api/beta/usage`, tableaux de bord Vercel et Turso) |
| 5 à 8 | Usage libre, questionnaire à la fin | 100 | Décisions prises, « J'ai résilié », économies confirmées, retours au bout de 30 jours, intention de payer et prix accepté |

La durée est tenue par trois règles de l'application :

- les données sont effacées 30 jours après le dernier import : un testeur actif réimporte ou garde la surveillance ;
- un consentement bancaire dure 180 jours (90 chez certaines banques) : sans objet en scénario A ;
- les 100 places Google sont définitives tant que l'application reste en « Test » : réservez-les aux testeurs actifs.

**Coût total du scénario A sur 8 semaines : 0 €** (ou environ 10 € de domaine, et 20 $ au plus de captures si vous les activez).

## 7. Ce qu'il faut recueillir pour le modèle économique

Pendant la bêta, notez pour chaque testeur (le compteur `/api/beta/usage` et le questionnaire suffisent, rien n'est envoyé ailleurs) :

1. le montant récurrent mensuel trouvé ;
2. le montant « à examiner » ;
3. les économies confirmées (« J'ai résilié ») ;
4. la source qui a tout débloqué (relevé, Gmail, PayPal) ;
5. le prix qu'il paierait, et sous quelle forme (abonnement, paiement unique, part des économies).

Ce sont les entrées du calculateur de revenus.
