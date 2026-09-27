# Kit de lancement : vidéos, GIF, captures et textes

Tout ce qu'il faut pour présenter Subscription Detective aux testeurs et au grand public : sur les sites de mise en avant d'applications, les réseaux sociaux et dans les invitations à la bêta.

## La visite animée

La même animation sert partout. Elle est intégrée à l'application et s'ouvre depuis la page Sources ou depuis la vue d'ensemble vide (lien « Voir comment ça marche (24 s) »). C'est l'onboarding des testeurs.

- Adresse : `/tour/index.html?lang=fr` ou `?lang=en`. Elle choisit seule le format selon l'écran (vertical sur téléphone, large sur ordinateur) ; forcer un format avec `&f=vertical`, `&f=square` ou `&f=wide`.
- 7 scènes, 24 secondes :
  1. l'accroche et le montant trouvé ;
  2. l'import d'un relevé et l'analyse ;
  3. le démasquage de PayPal, Apple et Google ;
  4. la liste des abonnements et le total annuel ;
  5. la décision « J'ai résilié » et l'économie ;
  6. le calendrier et l'alerte avant prélèvement ;
  7. l'appel à essayer la démo.
- Les chiffres sont ceux du mode démo (données fictives), présentés comme un exemple.
- Code : `public/tour/` (HTML, CSS, JS sans dépendance, police Plus Jakarta Sans sous licence SIL Open Font License). Si le système demande moins d'animations, la visite s'affiche figée sur la dernière scène.

## Les fichiers produits

Générés par `scripts/marketing/all.sh`, image par image à partir de la visite, puis encodés (MP4 H.264 par ffmpeg compilé en WebAssembly, GIF avec une palette commune à toute la boucle). Ils ne sont pas versionnés dans le dépôt (trop lourds) : récupérez-les depuis la page « Kit de lancement » partagée dans la conversation, ou relancez le script.

| Fichier | Dimensions | Usage |
| --- | --- | --- |
| `subscription-detective-vertical-fr.mp4` / `-en` | 1080 × 1920, 24 s, 25 i/s | YouTube Shorts, TikTok, Instagram Reels, stories |
| `subscription-detective-square-fr.mp4` / `-en` | 1080 × 1080 | Publications Instagram, LinkedIn, Facebook |
| `subscription-detective-wide-fr.mp4` / `-en` | 1920 × 1080 | YouTube, page de présentation, galerie Product Hunt (par lien YouTube) |
| `gif-vignette-240-fr.gif` / `-en` | 240 × 240, boucle de 3,4 s | Vignette animée (Product Hunt, BetaList) |
| `gif-analyse-480-fr.gif` / `-en` | 480 × 480, 8 s | Galerie, README, e-mail d'invitation : l'analyse et le démasquage |
| `gif-decision-480-fr.gif` / `-en` | 480 × 480, 8 s | Galerie : la liste et la décision |
| `gif-visite-640x360-fr.gif` / `-en` | 640 × 360, 24 s | Là où une vidéo n'est pas acceptée (plus lourd : préférez le MP4) |
| `galerie-1-vue-ensemble` à `galerie-4-calendrier` (fr, en) | 2540 × 1520 (1270 × 760 en double résolution) | Galerie d'images des sites de mise en avant |
| `galerie-5-mobile` (fr, en) | 1170 × 2532 | Capture de téléphone |

Les captures de la galerie viennent de la vraie application en mode démo : le bandeau « Démo » et le nom « Demo bank (test data) » y apparaissent, ce qui est honnête pour une bêta.

## Les textes

### Nom

Subscription Detective

### Accroche (60 caractères au plus sur Product Hunt, limite à vérifier sur leur formulaire)

- FR (54) : Retrouvez les abonnements que vous payez sans y penser
- EN (52) : Find the subscriptions you forgot you are paying for

### Description courte (260 caractères au plus, limite à vérifier)

- FR (233) : Importez un relevé ou connectez votre banque en lecture seule : Subscription Detective repère chaque prélèvement récurrent, démasque ce que cachent PayPal, Apple et Google, et vous aide à décider quoi garder. Gratuit pendant la bêta.
- EN (204) : Import a statement or connect your bank read-only: Subscription Detective spots every recurring charge, unmasks what PayPal, Apple and Google hide, and helps you decide what to keep. Free during the beta.

### Premier message du créateur

**FR.** Bonjour ! J'ai construit Subscription Detective après avoir découvert que je payais encore une application oubliée depuis des mois. L'idée : lire vos relevés et vos reçus, trouver chaque abonnement, même quand il se cache derrière PayPal ou l'App Store, puis vous laisser décider. Tout se fait en lecture seule, aucun mot de passe n'est vu, les libellés sont chiffrés et tout est effacé 30 jours après le dernier import. La bêta est gratuite : essayez d'abord avec les données fictives, puis avec votre propre relevé. Je lis tous les retours.

**EN.** Hi! I built Subscription Detective after finding out I was still paying for an app I had forgotten for months. It reads your statements and receipts, finds every subscription, even when it hides behind PayPal or the App Store, then lets you decide. Everything is read-only, no password is ever seen, labels are encrypted, and everything is deleted 30 days after your last import. The beta is free: try it with made-up data first, then with your own statement. I read every piece of feedback.

### Légende pour les vidéos courtes

- FR : Combien payez-vous chaque mois pour des abonnements oubliés ? Un relevé suffit pour le savoir. Bêta gratuite, lien en bio.
- EN : How much do you pay every month for forgotten subscriptions? One statement is enough to find out. Free beta, link in bio.

### Invitation à la bêta (e-mail ou message)

**FR.** Je lance la bêta de Subscription Detective, une application qui retrouve les abonnements oubliés dans vos relevés. Ça prend 5 minutes : un export CSV de votre compte (12 à 24 mois) et, si vous voulez, l'export Gmail de Google Takeout. Tout est en lecture seule et effacé au bout de 30 jours. Votre lien d'invitation : https://<domaine>/api/beta?code=<code>. La visite en 24 secondes : https://<domaine>/tour/index.html

**EN.** I'm opening the beta of Subscription Detective, an app that finds forgotten subscriptions in your statements. It takes 5 minutes: a CSV export of your account (12 to 24 months) and, if you like, your Gmail export from Google Takeout. Everything is read-only and deleted after 30 days. Your invitation link: https://<domaine>/api/beta?code=<code>. The 24-second tour: https://<domaine>/tour/index.html

## Où publier, et dans quel ordre

| Moment | Où | Quoi |
| --- | --- | --- |
| Semaine 1 | Proches, par message | Invitation + GIF « analyse » |
| Semaines 2 et 3 | LinkedIn, Instagram, TikTok, YouTube Shorts | Vidéo verticale ou carrée + légende |
| Semaine 4 | BetaList, puis Product Hunt | Vignette GIF, galerie (captures + GIF), vidéo large, accroche, description, premier message |
| Semaine 4 | Communautés (Reddit, Indie Hackers, forums de finances personnelles) | Vidéo large ou GIF + premier message, en respectant les règles de chaque communauté sur l'autopromotion |

Avant chaque dépôt, relisez les formats demandés sur le formulaire du site : les dimensions ci-dessus sont les plus courantes, mais elles n'ont pas pu être vérifiées sur les pages officielles.
