# Mettre Subscription Detective en ligne

Ce guide va du code sur GitHub à une application en ligne où vous connectez votre Crédit Mutuel et votre Gmail. Comptez une heure la première fois. Chaque étape se termine par une vérification.

Tous les services utilisés ont une offre gratuite suffisante pour la phase de test : Vercel (hébergement), Turso (base de données), Enable Banking (connexion bancaire, mode « restricted production »), Google Cloud (lecture de Gmail).

## 1. Préparer deux secrets

Sur votre ordinateur, dans un terminal, tapez ces deux commandes une par une :

```bash
openssl rand -base64 32
openssl rand -hex 32
```

La première ligne affichée est `DATA_ENCRYPTION_KEY` (elle chiffre les libellés en base), la seconde est `CRON_SECRET` (elle protège les tâches automatiques de la nuit). Sur Mac, ne recopiez pas de commentaire `# ...` à la suite de la commande : le terminal zsh le prend pour des arguments et répond « too many arguments ».

Gardez-les dans un gestionnaire de mots de passe. Perdre `DATA_ENCRYPTION_KEY` rend les données enregistrées illisibles (il suffit alors de repartir d'une base vide).

## 2. Créer la base de données (Turso)

1. Créez un compte sur [turso.tech](https://turso.tech), puis une base, par exemple `subscription-detective`, dans une région européenne.
2. Récupérez son adresse (`libsql://...`) et créez un jeton d'accès (« Create token »).
3. Créez les tables. Dans le dépôt : `npm install` puis `npm run db:sql`, ce qui écrit `prisma/schema.sql`. Ensuite, soit `turso db shell subscription-detective < prisma/schema.sql` avec l'outil en ligne de commande, soit copiez le contenu du fichier dans la console SQL du tableau de bord Turso.

Vérification : la console Turso liste les tables `Upload`, `Transaction`, `Subscription`, `Match`, `Descriptor`, `TrackedTrial`, `Profile`, `BankLink` et `Alert`.

## 3. Déployer sur Vercel

1. Créez un compte sur [vercel.com](https://vercel.com) avec votre compte GitHub, puis « Add New Project » et importez le dépôt `idle-invoices`.
2. Le code est sur la branche `claude/subscription-detective-spec-od4pw2`. Le plus simple est de la fusionner dans `main` (pull request sur GitHub). Sinon, dans Vercel, Settings, Git, choisissez cette branche comme « Production Branch ».
3. Avant de cliquer sur Deploy, ajoutez les variables d'environnement :

| Variable | Valeur |
| --- | --- |
| `DATABASE_URL` | l'adresse `libsql://...` de Turso |
| `DATABASE_AUTH_TOKEN` | le jeton Turso |
| `DATA_ENCRYPTION_KEY` | le premier secret de l'étape 1 |
| `CRON_SECRET` | le second secret de l'étape 1 |

4. Déployez. Vercel donne une adresse du type `https://idle-invoices-xxxx.vercel.app`. Notez-la : c'est `<domaine>` dans la suite.

Vérification : ouvrez `https://<domaine>/api/health`. Vous devez lire `"database": true` et `"encryption": true`. `bank`, `gmail` et `outlook` restent à `not configured` / `false` pour l'instant, c'est normal.

## 4. Connecter la banque (Enable Banking)

1. Créez un compte sur [enablebanking.com](https://enablebanking.com), puis une application :
   - environnement : production, mode « restricted » (il suffit pour vos propres comptes) ;
   - URL de redirection : `https://<domaine>/api/bank/callback` ;
   - laissez le site générer la clé : un fichier `.pem` se télécharge, son nom est l'identifiant de l'application.
2. Dans le tableau de bord Enable Banking, **reliez votre compte Crédit Mutuel à l'application**. En mode restreint, seuls les comptes reliés là peuvent être lus.
3. Dans Vercel, ajoutez `ENABLE_BANKING_APP_ID` (l'identifiant) et `ENABLE_BANKING_PRIVATE_KEY` (tout le contenu du fichier `.pem`, retours à la ligne compris), puis redéployez (Deployments, Redeploy).

Vérification :
- `https://<domaine>/api/health` affiche `"bank": "enable-banking"`.
- Facultatif, depuis votre ordinateur avec les deux variables dans `.env` : `npm run bank:check -- https://<domaine>/api/bank/callback "Crédit Mutuel"`. Le script contrôle la clé, l'application, l'URL de retour et les exigences du Crédit Mutuel, sans rien connecter.

À savoir : le Crédit Mutuel ne partage que les 90 derniers jours par cette voie. L'application le sait et s'appuie sur la boîte mail pour les abonnements annuels.

## 5. Connecter Gmail

1. Dans [console.cloud.google.com](https://console.cloud.google.com), créez un projet, puis activez « Gmail API ».
2. Écran de consentement OAuth : type « External », statut « Testing ». Ajoutez votre adresse Gmail (et celles de vos testeurs, jusqu'à 100) dans « Test users ».
3. Identifiants, « Create credentials », « OAuth client ID », type « Web application », avec l'URI de redirection `https://<domaine>/api/gmail/callback`.
4. Dans Vercel, ajoutez `GOOGLE_CLIENT_ID` et `GOOGLE_CLIENT_SECRET`, puis redéployez.

Vérification : `/api/health` affiche `"gmail": true`, et le bouton Gmail apparaît sur la page d'accueil. Google affiche un avertissement « application non validée » pendant la phase de test : c'est normal, cliquez sur « Continuer ».

## 6. Facultatif

- **Outlook / Hotmail** : application Microsoft Entra (comptes personnels et professionnels), permission déléguée `Mail.Read`, secret client, URI de redirection `https://<domaine>/api/outlook/callback`, puis `MICROSOFT_CLIENT_ID` et `MICROSOFT_CLIENT_SECRET`.
- **Lecture des captures d'écran** : `ANTHROPIC_API_KEY`.
- **Alertes par e-mail** (surveillance) : créez un compte sur [resend.com](https://resend.com), vérifiez votre domaine d'envoi, puis ajoutez `RESEND_API_KEY`, `ALERT_FROM` (par exemple `Subscription Detective <alertes@votre-domaine.fr>`) et `APP_URL` (`https://<domaine>`). Sans cela, les alertes apparaissent seulement en haut du rapport.
- **Banque de démonstration en ligne** : `BANK_DEMO=1` affiche « Demo bank (test data) » dans la liste des banques. Laissez-la vide pour vos testeurs.

## 7. Premier test réel

Sur votre téléphone, ouvrez `https://<domaine>` :

1. cherchez « Crédit Mutuel », connectez-vous sur la page de la banque et validez dans l'application Crédit Mutuel ;
2. revenez sur l'application : « Banque lue : N opérations » ;
3. connectez Gmail ;
4. ouvrez le rapport : les 30 prochains jours, les éventuels points où l'application a besoin de vous, puis la liste complète.

Si la connexion bancaire échoue, la page d'accueil affiche le code d'erreur de la banque (par exemple `PSU_HEADER_NOT_PROVIDED`), et les journaux Vercel (Logs) donnent le détail. Envoyez-moi ce code.

## Ce qui tourne tout seul

- Chaque nuit à 3 h (heure UTC), `/api/cron/purge` efface les données de plus de 30 jours.
- Chaque nuit à 5 h (UTC), `/api/cron/refresh` relit les comptes que leurs propriétaires ont demandé de surveiller, et crée les alertes (nouvel abonnement, hausse de prix, abonnement qui redémarre).
- Les deux tâches sont déclarées dans `vercel.json` et protégées par `CRON_SECRET`. L'offre gratuite de Vercel autorise deux tâches quotidiennes.
- Sans surveillance, les accès bancaires et mail sont fermés juste après chaque lecture. Avec, l'accès bancaire est fermé à l'arrêt de la surveillance, à « Tout supprimer » ou au bout de 90 jours.

Pour tester la surveillance sans attendre la nuit : `curl -H "Authorization: Bearer <CRON_SECRET>" https://<domaine>/api/cron/refresh`.

## Mettre à jour la base après une évolution

Tant que vous êtes en phase de test, le plus simple quand le schéma change est de repartir d'une base vide : recréez les tables avec `npm run db:sql` et la console Turso (les données de test sont perdues, les utilisateurs refont leurs connexions).
