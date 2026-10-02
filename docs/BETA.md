# Bêta fermée : règles, limites, coûts et durée

Ce document dit comment faire tester Subscription Detective gratuitement pour vous (environ 450 testeurs actifs par mois, dont 100 avec la connexion Gmail), et ce qui coûte de l'argent si vous allez plus loin. Chaque chiffre porte un verdict et sa source :

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
| Gmail par export Google Takeout (`.mbox`) | **Oui, sans plafond** | Rien : le navigateur lit l'export et ne garde que les e-mails dont le sujet ressemble à un reçu (mêmes mots que la connexion Gmail) ; seul cet extrait est envoyé. Pas d'autorisation Google, donc ni limite de 100, ni validation, ni audit. L'export Takeout se prépare chez Google en quelques heures à quelques jours. | Code de l'application (`src/lib/mbox.ts`) ; délai Takeout : non vérifiable |
| Outlook / Hotmail | **Oui, probablement** | Microsoft Graph est gratuit pour la lecture du courrier. Un compte Microsoft personnel peut demander la « vérification de l'éditeur » (identifiant partenaire Microsoft, 1 à 5 jours ouvrés). À tester avec une adresse outlook.com avant d'inviter. | Partiellement vérifié : [API facturées](https://learn.microsoft.com/en-us/graph/metered-api-list), [vérification de l'éditeur](https://learn.microsoft.com/en-us/entra/identity-platform/publisher-verification-overview) |
| Captures d'écran App Store / Google Play | **Payant à l'usage** | Lues par l'API Claude, facturée au jeton. Sans clé `ANTHROPIC_API_KEY`, les testeurs collent le texte de la liste à la place (gratuit). | Voir § 3 |
| Mode démo | **Oui** | Rien : aucun fournisseur n'est appelé. | Code de l'application |

**Conséquence : la bêta gratuite se fait avec des relevés importés, l'export Gmail (Takeout), Outlook et le mode démo.** La connexion bancaire directe reste réservée à vous (le propriétaire) tant qu'il n'y a pas de contrat Enable Banking. L'application l'applique d'elle-même avec `BETA_BANK_MODE=owner` (voir § 4).

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
| Enable Banking en production (offre startup) | 900 € par mois la 1re année, 1 200 € la 2e, 1 500 € ensuite | 1 800, 2 400 puis 3 000 comptes inclus, 0,50 € par compte au-delà | Confirmé (offre écrite, septembre 2026) |
| Powens en production | 900 € par mois | 1 000 utilisateurs inclus, connexions illimitées ; prix au-delà, durée et évolution non communiqués | Non vérifiable (annoncé oralement le 1er octobre 2026) |

Deux précisions :

1. **« Non commercial » chez Vercel** : une bêta gratuite, sans publicité, sans affiliation et sans société qui paie quelqu'un pour le code reste non commerciale d'après le texte des conditions. Dès qu'il y a un revenu (abonnement, commission) ou un salarié payé pour le projet, il faut Vercel Pro. C'est une lecture du texte, pas un avis de Vercel.
2. **Alertes par e-mail** : pour écrire à d'autres adresses que la vôtre, Resend demande un domaine vérifié. Un nom de domaine coûte environ 10 € par an (estimation, selon le registraire). Sans domaine, laissez `RESEND_API_KEY` vide : les alertes restent visibles dans l'application.

## 3. Combien de testeurs tiennent dans les offres gratuites (mesuré)

Mesures faites le 27 septembre 2026 sur l'application elle-même, avec un relevé réaliste de 24 mois (2 463 opérations, 12 abonnements, fichier CSV de 78 Ko), en local. Le temps serveur local sert d'approximation du « CPU actif » de Vercel ; les serveurs de Vercel peuvent être plus lents, d'où la marge de sécurité divisée par deux dans la dernière colonne.

**Optimisation faite en mesurant** : l'analyse normalisait le même libellé des millions de fois. Elle garde maintenant ses résultats en mémoire. Temps d'une analyse complète : **1 150 ms avant, 96 ms après**. Une décision (« Je conserve », etc.) passe de 1,2 s à 0,19 s ; un import de 24 mois de 4,1 s à 1,95 s. Sans cette optimisation, la capacité aurait été divisée par plus de deux.

| Action mesurée | Temps serveur | Lignes écrites | Lignes lues | Transfert |
| --- | --- | --- | --- | --- |
| Import de 24 mois (2 463 opérations) | 1,95 s | 2 477 | environ 2 500 | 78 Ko envoyés |
| Une décision | 0,19 s | environ 26 (abonnements recalculés) | environ 2 500 | moins de 1 Ko |
| Une page (vue d'ensemble, abonnements, calendrier) | 0,12 à 0,2 s | 0 | environ 2 500 | 195 Ko à la première visite, puis 10 Ko par page |
| Stockage | | | | environ 0,7 Mo par testeur (280 octets par opération), effacé 30 jours après le dernier import |

**Un testeur actif par mois** (hypothèse d'usage : 1 import de 24 mois, 1 export Gmail, 20 décisions, 60 pages) : environ 16 s de serveur, 3 100 lignes écrites, 200 000 lignes lues, 0,8 Mo de transfert, 250 appels de fonction.

| Plafond gratuit | Valeur | Testeurs actifs par mois | Avec marge ×2 |
| --- | --- | --- | --- |
| Vercel Hobby, CPU actif | 4 h | 900 | **450** |
| Vercel Hobby, appels de fonction | 1 million | 4 000 | 2 000 |
| Vercel Hobby, transfert | 100 Go | 125 000 | 62 000 |
| Turso Free, lignes lues | 500 millions | 2 500 | 1 250 |
| Turso Free, lignes écrites | 10 millions | 3 200 | 1 600 |
| Turso Free, stockage | 5 Go | 7 000 | 3 500 |
| Google, connexion Gmail en « Test » | 100 utilisateurs | **100** (connexion Gmail seulement) | 100 |
| Gmail par export Takeout | aucun | sans limite propre | |

**Réponse : environ 450 testeurs actifs par mois sans rien payer**, dont 100 au plus avec la connexion Gmail ; les autres passent par l'export Takeout, Outlook ou l'import de fichiers. Le premier plafond atteint est le temps de calcul de Vercel. Les testeurs inactifs ne consomment presque rien : on peut en inviter davantage, `BETA_MAX_TESTERS` arrête les nouvelles entrées quand vous voulez. Réglage conseillé : `BETA_MAX_TESTERS=400`, puis ajustez avec les chiffres réels du tableau de bord Vercel (« Usage ») après deux semaines.

Verdicts : consommation mesurée (en local) ; plafonds partiellement vérifiés (§ 2).

**Captures d'écran (API Claude)** : `claude-opus-5` coûte 5 $ par million de jetons en entrée et 25 $ en sortie ; `claude-haiku-4-5`, 1 $ et 5 $ (partiellement vérifié, table des modèles de la documentation Anthropic au 24 juin 2026, [tarifs](https://platform.claude.com/docs/en/about-claude/pricing)). Une capture de téléphone compte jusqu'à environ 4 800 jetons d'image avec Opus 5 (1 600 avec Haiku 4.5), plus la consigne et 300 à 800 jetons de réponse : **2 à 5 centimes de dollar par capture avec Opus 5, moins d'un demi-centime avec Haiku 4.5** (estimation). Le modèle se choisit avec `SCREENSHOT_MODEL` ; testez la qualité de lecture de Haiku sur quelques vraies captures avant de changer. L'API Claude n'a pas d'offre gratuite.

## 3 bis. Les fichiers que les testeurs fournissent

Sans connexion bancaire directe, un testeur importe ses relevés et ses reçus dans « Import avancé » (`/advanced`). La page « Liste d'import » (`/start`) donne, banque par banque, où cliquer pour télécharger chaque fichier.

| Source | Format accepté | Période conseillée | Taille typique | Remarques |
| --- | --- | --- | --- | --- |
| Compte bancaire | **CSV** (le meilleur) : export de n'importe quelle banque française (colonnes Date, Libellé, Débit, Crédit ou Montant), N26, Revolut, banques britanniques | 12 à 24 mois | 30 à 40 octets par opération : environ 80 Ko pour 24 mois (mesuré) | Un CSV aux colonnes inconnues ouvre l'écran « quelle colonne est quoi » |
| Compte bancaire | **PDF** de relevé (texte sélectionnable, une ligne par opération), dont Crédit Mutuel et CIC | 12 à 24 relevés mensuels | 50 à 300 Ko par relevé (estimation) | Les PDF scannés (images) ne sont pas lus |
| Carte American Express France | PDF du relevé mensuel | 12 mois | 100 à 300 Ko (estimation) | Montre les abonnements payés par carte Amex |
| PayPal | CSV « Télécharger l'activité » (anglais ou français) | 12 mois par téléchargement | 10 à 100 Ko (l'exemple fourni fait 9 Ko) | Nomme le vrai service derrière chaque paiement PayPal |
| Gmail | **Export Google Takeout** (`.mbox`, produit « Mail ») | toute la boîte | de quelques Mo à plusieurs Go : **aucune limite**, le navigateur n'envoie que les reçus (500 au plus, 3,5 Mo au plus) | Ou la connexion Gmail pour les 100 premiers |
| Autres boîtes mail | Connexion Outlook / Hotmail, ou fichiers `.eml` un par un | | 5 à 100 Ko par e-mail | |
| App Store, Google Play | Texte copié de la liste des abonnements, ou capture d'écran (PNG, JPEG, WebP) | l'écran actuel | 200 Ko à 2 Mo par capture | La capture est lue par Claude si la clé est configurée, sinon collez le texte |

Limites de l'application : **4 Mo par fichier** (la limite de corps de requête de Vercel est de 4,5 Mo, partiellement vérifié), **20 fichiers par envoi**, 20 envois par 10 minutes et par adresse IP, et en bêta 30 fichiers par testeur et par 24 h (`BETA_UPLOADS_PER_DAY`). Un relevé plus gros que 4 Mo se découpe par année ; en CSV, 4 Mo représentent plus de 100 000 opérations.

Kit minimal à demander à chaque testeur : **le CSV de 12 à 24 mois de son compte principal, et l'export Takeout de sa boîte Gmail (ou la connexion Outlook)**. Le PayPal et l'Amex seulement s'il en a.

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

## 5. Les deux scénarios, optimisés

### Scénario A : bêta gratuite, 0 € par mois

Réglages sur Vercel : `BETA_ACCESS_CODE=<code>`, `BETA_OWNER_CODE=<votre code>`, `BETA_BANK_MODE=owner`, `BETA_MAX_TESTERS=400`, `ANTHROPIC_API_KEY` vide, `RESEND_API_KEY` vide.

| Levier | Choix optimisé | Pourquoi |
| --- | --- | --- |
| Banque | Import de relevés CSV ou PDF ; connexion directe pour vous seul | Enable Banking restreint ne lit que vos comptes reliés |
| Gmail | Export Takeout pour tous ; connexion Gmail réservée aux 100 premiers qui la demandent | La connexion est limitée à 100 personnes en « Test » ; l'export ne l'est pas |
| Outlook | Connexion ouverte à tous | Gratuite, sans plafond trouvé (vérifiez le consentement avec un compte outlook.com) |
| Captures d'écran | Désactivées (le testeur colle le texte) | Seul coût à l'usage |
| Alertes e-mail | Désactivées | Sans connexion bancaire, pas de surveillance de nuit, donc rien à envoyer : aucun domaine à acheter |
| Hébergement | Vercel Hobby, Turso Free | Assez pour environ 450 testeurs actifs par mois (§ 3) |
| **Total** | **0 € par mois** | |

Tenir la gratuité suppose de ne rien vendre pendant la bêta (condition « non commerciale » de Vercel Hobby).

### Scénario A-Gmail : connexion Gmail en lecture seule pour tous les gratuits

Pour ceux que l'export Takeout inquiète (déposer toute sa boîte dans une application inconnue), la connexion en lecture seule est plus rassurante : l'utilisateur clique sur « Autoriser » chez Google, voit la liste exacte des accès demandés, l'application ne lit que les e-mails qui ressemblent à des reçus, ne garde aucun jeton, retire son accès juste après l'analyse, et l'utilisateur peut la révoquer lui-même depuis son compte Google.

Ce que Google exige pour l'ouvrir à plus de 100 personnes (détail et sources dans [MODELE-ECONOMIQUE.md](MODELE-ECONOMIQUE.md), § 5) :

| Exigence | Coût | Verdict |
| --- | --- | --- |
| Plafond de 100 utilisateurs pour la vie du projet sans validation, même en « production » | | confirmé ([aide Google](https://support.google.com/cloud/answer/7454865)) |
| Vérification de la marque et des accès restreints : domaine vérifié, page d'accueil et politique de confidentialité publiques, mention « Limited Use », vidéo de démonstration en anglais | environ 12 € par an de domaine | confirmé |
| Audit de sécurité CASA niveau 2, chaque année, par un laboratoire agréé (plus d'auto-analyse gratuite) | 540 à 1 800 $ par an (TAC Security), 800 à 1 200 $ (Leviathan) | obligation confirmée, prix partiellement vérifié (sources tierces) |
| Délai | plusieurs semaines, souvent 2 à 8 | partiellement vérifié |

Réglages : les mêmes que le scénario A, avec l'application Google validée et le domaine. Dépense sur 24 mois (plafond de 450 testeurs, audit compté à 700 € par an) : **1 424 €** sans aucun revenu ; 2 562 € sans plafond (Vercel Pro et des heures d'aide payées au-delà des vôtres). C'est donc un scénario à n'ouvrir qu'avec le Premium, ou après avoir mesuré qu'il change vraiment l'activation : les 100 places de test Gmail de la bêta servent à cette mesure.

**Solution gratuite intermédiaire (A-Outlook)** : ouvrir la connexion Outlook en lecture seule à tous dès maintenant (pas de plafond trouvé, vérification d'éditeur Microsoft gratuite, partiellement vérifié) et garder l'export Takeout pour Gmail. 0 €.

### Scénario B : connexion bancaire directe, optimisé

| Levier | Choix optimisé | Pourquoi |
| --- | --- | --- |
| Qui connecte sa banque | **Les abonnés Premium seulement** (les gratuits importent un relevé) | Enable Banking facture chaque compte consulté dans le mois : le coût ne suit alors que les payants |
| Lecture | Une lecture à la connexion, surveillance de nuit en Premium | Moins de comptes actifs à facturer |
| Contrat | Offre startup Enable Banking : 900 € par mois la 1re année (1 800 comptes inclus), 1 200 € la 2e (2 400), 1 500 € ensuite (3 000), puis 0,50 € par compte au-delà (confirmé, offre écrite de septembre 2026) | La licence est le principal coût : ne signer qu'au seuil (voir plus bas) |
| Agrément | Aucun à demander : Enable Banking est agréé (DSP2) et laisse les jeunes entreprises travailler sous son agrément (confirmé par écrit) | Pas de démarche auprès de l'ACPR |
| Hébergement | Vercel Pro, 20 $ par mois | Obligatoire dès qu'il y a un revenu ou une société |
| Gmail | Toujours Takeout pour le public | Évite l'audit CASA annuel |

Coût : 20 $ par mois + la licence Enable Banking (900 € par mois la 1re année) + environ 10 € par an de domaine pour les alertes.

Un compte est facturé une fois par mois s'il a un consentement valide et qu'il est interrogé dans le mois ; le même IBAN reconnecté n'est pas recompté. Les tests sur vos propres comptes restent gratuits. Le détail et le calcul du seuil sont dans [MODELE-ECONOMIQUE.md](MODELE-ECONOMIQUE.md), § 10 bis.

### Les seuils où il devient avantageux de payer, avant le lancement public

| Seuil | Ce qui se passe | Ce qu'il faut faire | Coût |
| --- | --- | --- | --- |
| **Plus de 100 personnes veulent Gmail** | La connexion Gmail refuse le 101e | Proposer l'export Takeout (déjà dans l'application) plutôt que valider l'application chez Google | 0 € (au lieu de 540 à 1 800 $ par an d'audit CASA, non vérifiable) |
| **Plus de 450 testeurs actifs par mois** | Le temps de calcul de Vercel Hobby s'épuise | Soit fermer les entrées (`BETA_MAX_TESTERS`), soit passer à Vercel Pro | 20 $ par mois, 20 $ d'usage inclus (partiellement vérifié) |
| **Premier euro encaissé, ou création d'une société** | Vercel Hobby n'est plus autorisé | Vercel Pro | 20 $ par mois |
| **Plus d'environ 1 250 testeurs actifs** | Lignes lues de Turso Free | Turso Developer | 4,99 $ par mois (partiellement vérifié) |
| **Alertes envoyées à d'autres que vous** | Resend exige un domaine vérifié | Acheter un domaine | environ 10 € par an (estimation) |
| **Plus de 100 alertes par jour ou 3 000 par mois** | Plafond de Resend Free | Resend Pro | 20 $ par mois (partiellement vérifié) |
| **Passer au scénario B** | La licence Enable Banking coûte 900 € par mois la 1re année, puis 1 200 €, puis 1 500 € | La signer quand les abonnés **en plus** que la banque apporte la paient : environ **2 500 abonnés Premium** (10 000 à 20 000 actifs) si la connexion directe ajoute 1 point de conversion (hypothèse à mesurer). Couvrir la licence avec tous les abonnés demanderait 250 abonnés la 1re année (305 avec TVA), mais ils paieraient déjà sans elle | 900 à 1 500 € par mois, 0,50 € par compte au-delà du quota (confirmé) |
| **L'import de relevé fait fuir** | Plus de 40 % des testeurs s'arrêtent à l'étape « importer un relevé » (à mesurer) | Argument pour le scénario B, à condition que le seuil précédent soit proche | |

Deux choses rendent le modèle perdant, d'après le masterplan : la publicité payée (résultat négatif dans les 9 scénarios qui l'utilisent), et signer le contrat Enable Banking trop tôt. Ouvrir la banque directe à tous dès le lancement coûte 26 300 € de dépenses sur 24 mois pour un résultat de -19 205 €, contre 3 234 € et +500 € avec les relevés seuls ; la réserver au Premium dès le lancement reste perdant (-21 345 € pour O-P-org), car la licence de 900 € par mois arrive avant les abonnés.

## 6. Un modèle rentable, et son seuil de rentabilité

Tous les calculs sont dans le **masterplan dynamique** ([masterplan.html](masterplan.html), à ouvrir par un serveur local, par exemple `npx serve docs`) et dans [MODELE-ECONOMIQUE.md](MODELE-ECONOMIQUE.md), généré par `npm run modele`. Les deux lisent le même modèle ([model.mjs](model.mjs)) : 33 scénarios (4 phases gratuites, 18 combinaisons boîte mail × banque × acquisition, 2 plans par étapes, 9 scénarios réalistes), 81 paramètres avec leur verdict.

Le modèle compte aussi :

- **les autres revenus** : Premium annuel, rapport unique, résiliation assistée, affiliation (énergie, box, assurance), licences professionnelles ;
- **le statut** : micro-entreprise sans TVA sous 37 500 € de chiffre d'affaires par an (confirmé, 2026), puis TVA ; société au-delà de 83 600 € (confirmé), avec expert-comptable et impôt sur les sociétés à 15 % puis 25 % (confirmé) ;
- **les outils selon l'échelle** : Vercel, Turso, Resend et le suivi d'erreurs changent de palier avec les actifs ;
- **le personnel** : support, développement, contenus, administration, vente aux professionnels. L'IA en prend une part (assistant de support, de code, de rédaction), vous donnez 40 heures par mois (réglable), le reste va à des indépendants puis à des salariés quand c'est moins cher ;
- **le seuil de rentabilité** en utilisateurs, et ce qu'il faut pour l'atteindre au mois ou au nombre d'utilisateurs que vous choisissez sur la page.

**Les choix** :

- **Gratuit** : analyse par import de relevés, export Gmail, Outlook ; liste des abonnements, décisions, calendrier.
- **Premium, 4,99 € par mois TTC** (Bankin' Plus 4,99 €, Linxo 4,49 €, partiellement vérifié) ou **39,99 € par an** : connexion bancaire directe (dès le seuil du scénario B), surveillance de nuit et alertes, assistant de résiliation, rappels.
- **Rapport unique à 9 €** et **résiliation assistée à 4,99 €**, sans abonnement.
- **Affiliation signalée** quand l'application montre une offre moins chère (modèle des comparateurs, confirmé ; commissions non publiques).
- **Aucune publicité payée, ni dans l'application, ni revente de données.**
- **Paiement sur le web** avec Stripe (1,5 % + 0,25 € par paiement, partiellement vérifié) plutôt que dans les magasins d'applications (15 %).

**Hypothèses** : 100 inscriptions le premier mois après 2 mois de bêta, +10 % par mois, 5 % des activés passent Premium (environ 2 % des inscrits, médiane freemium 2,1 %, partiellement vérifié), 5 % de résiliations Premium par mois, 25 % des gratuits qui partent chaque mois, cotisations de 21,2 % (confirmé pour les prestations de services commerciales, 2026).

| Sur 24 mois | T-R-org (export Takeout) | O-R-org (Outlook pour tous) | R2 central (IA, offre complète) | R3 (même chose sans IA) | **R9 sobre (recommandé)** |
| --- | ---: | ---: | ---: | ---: | ---: |
| Dépenses (outils, IA, personnel) | 3 234 € | 3 238 € | 3 239 € | 14 704 € | **1 163 €** |
| Résultat | +500 € | +776 € | +1 372 € | -10 094 € | **+3 447 €** |
| Trésorerie à avancer | 868 € | 813 € | 687 € | 10 094 € | **21 €** |
| Remboursé au | mois 23 | mois 22 | mois 20 | non atteint | **mois 6** |
| Seuil de rentabilité (régime stable) | 193 actifs | 193 actifs | 165 actifs | 929 actifs | **43 actifs, 20 inscrits par mois** |

Sous 1 000 € de dépenses : aucun scénario payant une fois le travail et les outils comptés honnêtement ; le plus sobre (R9) reste à 1 163 € sur 24 mois et se rembourse au 6e mois. R2, R3 et R9 ne signent le contrat Enable Banking qu'à 2 500 abonnés, jamais atteints en 24 mois ; le signer dès le lancement (R10) ferait perdre 18 723 € sur la période. Le travail pèse plus que les serveurs : sans IA, les heures au-delà des vôtres coûtent environ 11 500 € de plus sur la période (14 704 € de dépenses contre 3 239 €). Il faut **6 abonnés Premium** pour payer Vercel Pro, **17** pour l'audit Gmail et **31** pour l'assistant de code à 100 $. Ce sont des projections sur hypothèses : remplacez-les par les mesures de la bêta (§ 7) dans le masterplan.

**Fonctionnalités à construire pour ce modèle**, dans l'ordre :

1. comptes utilisateurs (connexion par lien envoyé par e-mail), indispensables pour payer ;
2. paiement Stripe (abonnement, rapport unique, portail client, factures avec TVA) ;
3. limite gratuit / Premium, avec la connexion bancaire directe réservée au Premium ;
4. parrainage (un mois offert par ami inscrit), pour remplacer la publicité ;
5. assistant de résiliation (lettre ou e-mail prêt, rappel), qui fait la valeur du Premium : **fait** (fiche d'un abonnement, « Comment résilier », « Préparer ma résiliation »).

## 7. Le déroulé : 8 semaines

| Semaine | Étape | Testeurs | À mesurer |
| --- | --- | --- | --- |
| 0 | Réglages du scénario A, test complet avec vos propres comptes (connexion directe en mode propriétaire), vidéos et captures du § 8 | 1 | Tout fonctionne de bout en bout |
| 1 | Vague 1 : proches, par lien d'invitation | 10 | Taux d'import réussi, fichiers refusés, temps jusqu'au premier résultat |
| 2 à 3 | Vague 2 : réseaux personnels, communautés | 50 | Abonnements trouvés, faux positifs (« Pas un abonnement »), abandon à l'étape « importer » |
| 4 | Vague 3 : sites de mise en avant d'applications, avec les vidéos | 200 à 400 | Consommation (`/api/beta/usage`, tableaux de bord Vercel et Turso) |
| 5 à 8 | Usage libre, questionnaire | 400 | Décisions, « J'ai résilié », économies confirmées, prix accepté, abonnement ou rapport unique |

La durée est tenue par trois règles : les données sont effacées 30 jours après le dernier import ; les 100 places de la connexion Gmail sont définitives tant que l'application reste en « Test » ; un consentement bancaire dure 180 jours (sans objet en scénario A).

**Coût total de la bêta sur 8 semaines : 0 €.**

## 8. Ce qu'il faut recueillir, et les vidéos de présentation

Pendant la bêta, pour chaque testeur (compteur `/api/beta/usage` et questionnaire, rien n'est envoyé ailleurs) : le montant récurrent trouvé, le montant « à examiner », les économies confirmées, la source qui a tout débloqué (relevé, Gmail, PayPal), et le prix qu'il paierait sous quelle forme. Ce sont les entrées du calculateur.

Les vidéos courtes, GIF et textes de présentation sont dans [`marketing/`](../marketing) (voir son README).
