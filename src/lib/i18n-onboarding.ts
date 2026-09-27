import type { Locale } from "@/lib/i18n";
import { withFrenchSpaces } from "./typo";

/**
 * Texts of the advanced import checklist (/start): the questions, the checklist and every item
 * built in lib/onboarding.ts. Both languages share the same keys.
 */

type ChoiceText = { label: string; hint?: string };

const en = {
  choices: {
    banks: {
      "credit-mutuel": { label: "Crédit Mutuel / CIC" },
      bnp: { label: "BNP Paribas" },
      "societe-generale": { label: "Société Générale" },
      "credit-agricole": { label: "Crédit Agricole / LCL" },
      bpce: { label: "Caisse d'Épargne / Banque Populaire" },
      "banque-postale": { label: "La Banque Postale" },
      boursobank: { label: "BoursoBank / Hello bank! / Fortuneo" },
      n26: { label: "N26" },
      revolut: { label: "Revolut" },
      "other-bank": { label: "Another bank" },
    } as Record<string, ChoiceText>,
    cards: {
      amex: { label: "American Express", hint: "Its charges are only on the Amex statement" },
      deferred: { label: "A card with deferred debit", hint: "One monthly line on the bank account" },
      "other-card": { label: "Another credit card (Visa, Mastercard) with its own statement" },
    } as Record<string, ChoiceText>,
    wallets: {
      paypal: { label: "PayPal" },
      "apple-pay": { label: "Apple Pay", hint: "Charges show on the card's statement" },
      "google-pay": { label: "Google Pay", hint: "Charges show on the card's statement" },
      lydia: { label: "Lydia / Sumeria" },
    } as Record<string, ChoiceText>,
    stores: {
      apple: { label: "iPhone / iPad (App Store)" },
      google: { label: "Android (Google Play)" },
      amazon: { label: "Amazon (Prime, Channels, Kindle, Audible)" },
    } as Record<string, ChoiceText>,
    mailboxes: {
      gmail: { label: "Gmail" },
      outlook: { label: "Outlook / Hotmail" },
      icloud: { label: "iCloud Mail" },
      yahoo: { label: "Yahoo" },
      "other-mail": { label: "Another mailbox (Orange, Free, SFR, work…)" },
    } as Record<string, ChoiceText>,
    other: {
      operator: { label: "Services billed by my phone or internet operator", hint: "Canal+, Netflix or app purchases on the box or mobile bill" },
      bnpl: { label: "Pay in installments (Klarna, Alma, Oney, PayPal 4X)" },
    } as Record<string, ChoiceText>,
  },

  questions: {
    steps: {
      pay: { title: "How do you pay?", intro: "Every subscription ends up on an account or a card. Pick all the ones you use, even rarely." },
      apps: { title: "Payment apps and stores", intro: "These hide the real service behind their own name on a statement (\"PAYPAL\", \"APPLE.COM/BILL\")." },
      mail: { title: "Where do your receipts arrive?", intro: "Receipts name the service, the plan and the next renewal. Pick every address you use for purchases." },
      other: { title: "Anything else?", intro: "Some services are billed where nobody looks." },
    },
    groups: {
      banks: "Bank accounts",
      cards: "Cards with their own statement",
      wallets: "Payment apps",
      stores: "App stores and memberships",
      mailboxes: "Mailboxes",
      other: "Other ways you pay",
    },
    stepOf: (n: number, total: number) => `Step ${n} of ${total}`,
    back: "Back",
    next: "Next",
    saving: "Saving…",
    seeChecklist: "See my checklist",
    saveError: "Could not save your answers. Please try again.",
    privacy: "We only keep these choices (no account number, no password), encrypted, and delete them with the rest of your data.",
  },

  checklist: {
    badge: { todo: "To add", optional: "Worth checking", done: "Done" },
    detected: "Found in your statements",
    howTo: (accepts: string) => `How to get it (${accepts})`,
    gdprSummary: "Email to ask PayPal for your full history",
    gdprNote: "Send it from the email address of your PayPal account, through PayPal's help center (Contact us) or its data protection officer.",
    copy: "Copy the email",
    copied: "Copied",
    connect: (name: string) => `Connect ${name}`,
    connectGmail: "Connect Gmail and scan",
    addPaste: "Add a screenshot or paste",
    upload: "Upload",
    undo: "Undo",
    checked: "Checked",
    doneNotForMe: "Done, or not for me",
  },

  page: {
    metaTitle: "Import checklist · Subscription Detective",
    askTitle: "Advanced: what to import by hand",
    askIntro:
      "Only needed when a bank or mailbox cannot be connected. Four questions about how you pay give a checklist of files to add, with the steps for each one. No password, no account number.",
    listTitle: "Your import checklist",
    listIntro: "The more sources you add, the more hidden charges we can name. Items are ticked automatically when the matching file is read.",
    progress: (done: number, total: number) => `${done} of ${total} sources added`,
    pointsTo: (n: number, names: string) => `Your statements point to ${n === 1 ? "a source" : "sources"} you did not mention: ${names}.`,
    addFiles: "Add files",
    seeReport: "See my report",
    changeAnswers: "Change my answers",
    gdprSince: "the opening of my account",
  },

  plan: {
    bank: {
      yourBank: "Your bank account",
      title: (bank: string) => `${bank}: 12 months of operations`,
      why: "Every subscription ends up on a bank account, even the ones paid through PayPal or an app store.",
      steps: [
        "Open your bank's website (exports are easier there than in the app) and go to the account's list of operations.",
        "Look for Export, Download or Télécharger. Choose CSV (sometimes called Excel or tableur).",
        "Pick the last 12 months: yearly renewals only show once a year.",
        "Upload the file here. Repeat for each checking account.",
      ],
      creditMutuelPdf: "If only PDF statements are offered, download the monthly PDF statements (Relevés de compte): they are read as well.",
      revolut: ["In the Revolut app, open the account, then Statement (Relevé).", "Choose Excel/CSV and the last 12 months.", "Upload the file here."],
      n26: ["In the N26 web app, open Downloads or Statements and export the transactions as CSV.", "Choose the last 12 months.", "Upload the file here."],
      accepts: "CSV, or PDF statements",
      alertSeveral: "We have read statements from one of your banks. Tick this item once this bank's are added too.",
      alertShort: (from: string, to: string) => `Your statements cover ${from} to ${to}. Add older months to catch yearly renewals (12 months is best).`,
    },
    amex: {
      short: "American Express",
      title: "American Express: monthly statements",
      why: "Your bank only shows one monthly payment to Amex. The subscriptions paid with the card are on the Amex statement.",
      steps: [
        "Sign in to your American Express account on the website.",
        "Open Statements (Relevés) and download the PDF statement of each of the last 12 months.",
        "Upload all the PDFs here at once.",
      ],
      accepts: "PDF statements",
      alert: (n: number) => `We found ${n} ${n === 1 ? "payment" : "payments"} to American Express on your bank account, but not the card's own statement.`,
    },
    deferred: {
      short: "Deferred debit card",
      title: "Deferred debit card: card statements",
      why: "With deferred debit, the account statement can show a single monthly total. If your card operations are not listed one by one, add the card statement.",
      steps: [
        "In your online banking, open the card (Mes cartes) and its statement (relevé d'opérations carte).",
        "Export it as CSV, or download the monthly PDF statements, for the last 12 months.",
        "Upload the files here.",
      ],
      accepts: "CSV or PDF",
      alert: (n: number) => `We found ${n} ${n === 1 ? "monthly card total" : "monthly card totals"} on your bank account.`,
    },
    otherCard: {
      short: "Credit card",
      title: "Credit card: its own statement",
      why: "Charges on a credit card are only listed on the card's statement.",
      steps: ["Download the card statements of the last 12 months from the card issuer's website (CSV or PDF).", "Upload them here."],
      accepts: "CSV or PDF",
    },
    paypal: {
      short: "PayPal",
      title: (canConnect: boolean): string => (canConnect ? "PayPal: connect it, or download its activity" : "PayPal: activity download"),
      why: "On a bank statement every PayPal payment reads \"PAYPAL\". PayPal's own data says which service each one paid.",
      connectStep: "Simplest: connect PayPal from the home page, like your bank (read-only, you sign in on PayPal's page). Or, without a connection:",
      steps: [
        "Sign in on paypal.com (the website, not the app).",
        "Open Activity, then Statements (Relevés), then Activity download (Télécharger l'activité).",
        "Choose Completed payments, CSV format, and the longest period offered.",
        "Upload the CSV here. PayPal receipts found by the Gmail scan also help.",
        "If PayPal only offers a few months, ask for your full history under the GDPR right of access (template below).",
      ],
      accepts: (canConnect: boolean): string => (canConnect ? "a PayPal connection or its CSV" : "CSV"),
      alert: (n: number) => `${n} ${n === 1 ? "PayPal payment" : "PayPal payments"} on your statements ${n === 1 ? "is" : "are"} still unnamed.`,
    },
    apple: {
      short: "Apple",
      title: "Apple: your subscriptions list",
      why: "Every App Store subscription reads \"APPLE.COM/BILL\" on a statement. The list on your iPhone names them.",
      steps: [
        "On your iPhone, open Settings, tap your name, then Subscriptions.",
        "Take a screenshot of the list (Active and Inactive), or copy its text.",
        "Upload the screenshot here, or paste the text and choose \"Apple\".",
        "For past purchases, reportaproblem.apple.com lists every charge.",
      ],
      accepts: "Screenshot or pasted text",
      alert: (n: number) => `${n} ${n === 1 ? "Apple charge" : "Apple charges"} on your statements ${n === 1 ? "is" : "are"} still unnamed.`,
    },
    google: {
      short: "Google Play",
      title: "Google Play: your subscriptions list",
      why: "Google Play charges read \"GOOGLE*GOOGLE PLAY APPS\" whatever the app. Several apps can cost the same price.",
      steps: [
        "Open the Play Store, tap your profile picture, then Payments and subscriptions, then Subscriptions.",
        "Take a screenshot of the list, or copy its text, and add it here with \"Google Play\".",
        "Even better: the Gmail scan reads every Google Play order confirmation, including past and canceled subscriptions.",
      ],
      accepts: "Screenshot, pasted text, or Gmail scan",
      alert: (n: number) => `${n} ${n === 1 ? "Google charge" : "Google charges"} on your statements ${n === 1 ? "is" : "are"} still unnamed.`,
    },
    amazon: {
      short: "Amazon",
      title: "Amazon: memberships and subscriptions",
      why: "Prime, Prime Video Channels, Kindle Unlimited and Audible renew on their own, often once a year.",
      steps: [
        "On amazon.fr, open Your Account, then Memberships and subscriptions.",
        "Check each active one. Their receipts come by email: the Gmail scan finds them.",
        "Tick this item once checked.",
      ],
      accepts: "Receipts by email",
    },
    mail: {
      mailbox: "Mailbox",
      gmailTitle: "Gmail: one-time receipt scan",
      title: (box: string) => `${box}: receipts`,
      why: "Receipts name the real service, the plan, the price and the next renewal. They also catch trials that are about to convert.",
      gmailSteps: [
        "Tap \"Connect Gmail and scan\" on the upload page.",
        "Google asks for read-only access. We read receipts only, keep amounts and merchants, and revoke the access right away.",
        "Repeat for each Gmail address you use for purchases.",
      ],
      search: "Search the mailbox for: receipt, invoice, facture, reçu, abonnement, subscription, renewal, trial.",
      outlook: "Open each receipt, then More actions (…), then Download: it saves a .eml file.",
      saveEml: "Save each receipt as a file (.eml), or forward them to a Gmail address and use the Gmail scan.",
      uploadEml: "Upload the .eml files here, or paste the text of a receipt in the paste box.",
      acceptsGmail: "Gmail scan",
      acceptsOther: ".eml files or pasted text",
    },
    operator: {
      short: "Phone and internet bills",
      title: "Phone and internet bills: options and third-party purchases",
      why: "Options on the box (Canal+, Netflix) and purchases billed to the phone (\"Internet+\", \"achats de contenus\") are hidden in the monthly bill.",
      steps: [
        "Open your operator's customer area and the latest bill.",
        "Look at Options, Services, Achats de contenus or Internet+ / SMS+.",
        "Anything you do not use: remove it there, and in Internet+ you can block third-party purchases.",
        "Tick this item once checked.",
      ],
      accepts: "Checked by hand",
    },
    bnpl: {
      short: "Installment plans",
      title: "Installment plans (Klarna, Alma, Oney, PayPal 4X)",
      why: "Installments repeat every month but pay for one purchase. They are left out of the report on purpose, so nothing to add.",
      steps: ["Nothing to do. If a subscription was paid in installments, its receipt still shows it."],
      accepts: "Nothing",
    },
  },

  gdpr: (service: string, since: string): string[] => [
    `Subject: Right of access request (GDPR article 15): full ${service} transaction history`,
    ``,
    `Hello,`,
    ``,
    `Under article 15 of the General Data Protection Regulation (EU 2016/679), I ask for a copy of all the personal data you hold about me, and in particular the complete history of my transactions since ${since}, with for each one the date, the amount, the currency, the merchant and the funding source.`,
    ``,
    `Under article 20 (right to data portability), I ask for this history in a structured, commonly used and machine-readable format, such as CSV.`,
    ``,
    `Article 12(3) gives you one month from receipt of this request to answer. My account is registered with this email address.`,
    ``,
    `Thank you,`,
    `[Your name]`,
  ],
};

type OnboardingDict = typeof en;

const fr: OnboardingDict = {
  choices: {
    banks: {
      "credit-mutuel": { label: "Crédit Mutuel / CIC" },
      bnp: { label: "BNP Paribas" },
      "societe-generale": { label: "Société Générale" },
      "credit-agricole": { label: "Crédit Agricole / LCL" },
      bpce: { label: "Caisse d'Épargne / Banque Populaire" },
      "banque-postale": { label: "La Banque Postale" },
      boursobank: { label: "BoursoBank / Hello bank! / Fortuneo" },
      n26: { label: "N26" },
      revolut: { label: "Revolut" },
      "other-bank": { label: "Une autre banque" },
    },
    cards: {
      amex: { label: "American Express", hint: "Ses dépenses ne figurent que sur le relevé Amex" },
      deferred: { label: "Une carte à débit différé", hint: "Une seule ligne par mois sur le compte" },
      "other-card": { label: "Une autre carte de crédit (Visa, Mastercard) avec son propre relevé" },
    },
    wallets: {
      paypal: { label: "PayPal" },
      "apple-pay": { label: "Apple Pay", hint: "Les paiements apparaissent sur le relevé de la carte" },
      "google-pay": { label: "Google Pay", hint: "Les paiements apparaissent sur le relevé de la carte" },
      lydia: { label: "Lydia / Sumeria" },
    },
    stores: {
      apple: { label: "iPhone / iPad (App Store)" },
      google: { label: "Android (Google Play)" },
      amazon: { label: "Amazon (Prime, Channels, Kindle, Audible)" },
    },
    mailboxes: {
      gmail: { label: "Gmail" },
      outlook: { label: "Outlook / Hotmail" },
      icloud: { label: "iCloud Mail" },
      yahoo: { label: "Yahoo" },
      "other-mail": { label: "Une autre boîte mail (Orange, Free, SFR, travail…)" },
    },
    other: {
      operator: { label: "Des services facturés par mon opérateur mobile ou internet", hint: "Canal+, Netflix ou achats d'applis sur la facture de la box ou du mobile" },
      bnpl: { label: "Paiement en plusieurs fois (Klarna, Alma, Oney, PayPal 4X)" },
    },
  },

  questions: {
    steps: {
      pay: { title: "Comment payez-vous ?", intro: "Tout abonnement finit sur un compte ou une carte. Cochez tout ce que vous utilisez, même rarement." },
      apps: { title: "Applis de paiement et boutiques", intro: "Elles cachent le vrai service derrière leur propre nom sur un relevé (« PAYPAL », « APPLE.COM/BILL »)." },
      mail: { title: "Où arrivent vos reçus ?", intro: "Les reçus donnent le service, la formule et le prochain renouvellement. Cochez chaque adresse qui vous sert pour vos achats." },
      other: { title: "Autre chose ?", intro: "Certains services sont facturés là où personne ne regarde." },
    },
    groups: {
      banks: "Comptes bancaires",
      cards: "Cartes avec leur propre relevé",
      wallets: "Applis de paiement",
      stores: "Boutiques d'applis et abonnements",
      mailboxes: "Boîtes mail",
      other: "Autres moyens de paiement",
    },
    stepOf: (n: number, total: number) => `Étape ${n} sur ${total}`,
    back: "Retour",
    next: "Suivant",
    saving: "Enregistrement…",
    seeChecklist: "Voir ma liste",
    saveError: "Impossible d'enregistrer vos réponses. Merci de réessayer.",
    privacy: "Nous gardons seulement ces choix (ni numéro de compte, ni mot de passe), chiffrés, et nous les supprimons avec le reste de vos données.",
  },

  checklist: {
    badge: { todo: "À ajouter", optional: "À vérifier", done: "Fait" },
    detected: "Repéré dans vos relevés",
    howTo: (accepts: string) => `Comment l'obtenir (${accepts})`,
    gdprSummary: "E-mail pour demander à PayPal tout votre historique",
    gdprNote: "Envoyez-le depuis l'adresse de votre compte PayPal, via le centre d'aide de PayPal (Nous contacter) ou à son délégué à la protection des données.",
    copy: "Copier l'e-mail",
    copied: "Copié",
    connect: (name: string) => `Connecter ${name}`,
    connectGmail: "Connecter Gmail et analyser",
    addPaste: "Ajouter une capture ou coller",
    upload: "Importer",
    undo: "Annuler",
    checked: "Vérifié",
    doneNotForMe: "Fait, ou pas pour moi",
  },

  page: {
    metaTitle: "Liste d'import · Subscription Detective",
    askTitle: "Avancé : que faut-il importer à la main ?",
    askIntro:
      "Utile seulement quand une banque ou une boîte mail ne peut pas être connectée. Quatre questions sur vos moyens de paiement donnent la liste des fichiers à ajouter, avec la marche à suivre pour chacun. Ni mot de passe, ni numéro de compte.",
    listTitle: "Votre liste d'import",
    listIntro: "Plus vous ajoutez de sources, plus nous pouvons nommer de dépenses cachées. Chaque élément est coché tout seul dès que le fichier correspondant est lu.",
    progress: (done: number, total: number) => `${done} ${done > 1 ? "sources ajoutées" : "source ajoutée"} sur ${total}`,
    pointsTo: (n: number, names: string) =>
      n === 1 ? `Vos relevés révèlent une source que vous n'avez pas citée : ${names}.` : `Vos relevés révèlent des sources que vous n'avez pas citées : ${names}.`,
    addFiles: "Ajouter des fichiers",
    seeReport: "Voir mon rapport",
    changeAnswers: "Modifier mes réponses",
    gdprSince: "l'ouverture de mon compte",
  },

  plan: {
    bank: {
      yourBank: "Votre compte bancaire",
      title: (bank: string) => `${bank} : 12 mois d'opérations`,
      why: "Tout abonnement finit sur un compte bancaire, même ceux payés via PayPal ou une boutique d'applis.",
      steps: [
        "Ouvrez le site de votre banque (l'export y est plus simple que dans l'appli) et allez dans la liste des opérations du compte.",
        "Cherchez Exporter ou Télécharger. Choisissez le format CSV (parfois appelé Excel ou tableur).",
        "Prenez les 12 derniers mois : les renouvellements annuels n'apparaissent qu'une fois par an.",
        "Importez le fichier ici. Recommencez pour chaque compte courant.",
      ],
      creditMutuelPdf: "Si seuls des relevés PDF sont proposés, téléchargez les relevés de compte mensuels en PDF : ils sont lus aussi.",
      revolut: ["Dans l'appli Revolut, ouvrez le compte, puis Relevé.", "Choisissez Excel/CSV et les 12 derniers mois.", "Importez le fichier ici."],
      n26: ["Dans l'appli web N26, ouvrez Téléchargements ou Relevés et exportez les opérations en CSV.", "Choisissez les 12 derniers mois.", "Importez le fichier ici."],
      accepts: "CSV ou relevés PDF",
      alertSeveral: "Nous avons lu les relevés d'une de vos banques. Cochez cet élément une fois ceux de cette banque ajoutés aussi.",
      alertShort: (from: string, to: string) =>
        `Vos relevés vont du ${from} au ${to}. Ajoutez des mois plus anciens pour repérer les renouvellements annuels (l'idéal, c'est 12 mois).`,
    },
    amex: {
      short: "American Express",
      title: "American Express : relevés mensuels",
      why: "Votre banque ne montre qu'un prélèvement mensuel vers Amex. Les abonnements payés avec la carte sont sur le relevé Amex.",
      steps: [
        "Connectez-vous à votre compte American Express sur le site.",
        "Ouvrez Relevés et téléchargez le relevé PDF de chacun des 12 derniers mois.",
        "Importez tous les PDF ici en une fois.",
      ],
      accepts: "Relevés PDF",
      alert: (n: number) =>
        `Nous avons trouvé ${n} ${n === 1 ? "prélèvement" : "prélèvements"} American Express sur votre compte, mais pas le relevé de la carte elle-même.`,
    },
    deferred: {
      short: "Carte à débit différé",
      title: "Carte à débit différé : relevés de carte",
      why: "Avec le débit différé, le relevé de compte peut n'afficher qu'un total par mois. Si vos paiements par carte n'y sont pas détaillés un par un, ajoutez le relevé de la carte.",
      steps: [
        "Dans votre banque en ligne, ouvrez la carte (Mes cartes) et son relevé d'opérations carte.",
        "Exportez-le en CSV, ou téléchargez les relevés mensuels en PDF, sur les 12 derniers mois.",
        "Importez les fichiers ici.",
      ],
      accepts: "CSV ou PDF",
      alert: (n: number) => `Nous avons trouvé ${n} ${n === 1 ? "total mensuel de carte" : "totaux mensuels de carte"} sur votre compte.`,
    },
    otherCard: {
      short: "Carte de crédit",
      title: "Carte de crédit : son propre relevé",
      why: "Les dépenses d'une carte de crédit ne figurent que sur le relevé de la carte.",
      steps: ["Téléchargez les relevés de la carte des 12 derniers mois sur le site de l'émetteur (CSV ou PDF).", "Importez-les ici."],
      accepts: "CSV ou PDF",
    },
    paypal: {
      short: "PayPal",
      title: (canConnect: boolean): string => (canConnect ? "PayPal : connectez-le, ou téléchargez son activité" : "PayPal : téléchargement de l'activité"),
      why: "Sur un relevé bancaire, chaque paiement PayPal s'affiche « PAYPAL ». Les données de PayPal disent quel service chacun a payé.",
      connectStep: "Le plus simple : connectez PayPal depuis la page d'accueil, comme votre banque (en lecture seule, vous vous identifiez sur la page de PayPal). Sinon, sans connexion :",
      steps: [
        "Connectez-vous sur paypal.com (le site, pas l'appli).",
        "Ouvrez Activité, puis Relevés, puis Télécharger l'activité.",
        "Choisissez Paiements effectués, le format CSV et la période la plus longue proposée.",
        "Importez le CSV ici. Les reçus PayPal trouvés par l'analyse Gmail aident aussi.",
        "Si PayPal ne propose que quelques mois, demandez tout votre historique au titre du droit d'accès du RGPD (modèle ci-dessous).",
      ],
      accepts: (canConnect: boolean): string => (canConnect ? "une connexion PayPal ou son CSV" : "CSV"),
      alert: (n: number) =>
        n === 1 ? "1 paiement PayPal sur vos relevés n'a pas encore de nom." : `${n} paiements PayPal sur vos relevés n'ont pas encore de nom.`,
    },
    apple: {
      short: "Apple",
      title: "Apple : la liste de vos abonnements",
      why: "Chaque abonnement App Store s'affiche « APPLE.COM/BILL » sur un relevé. La liste sur votre iPhone leur donne un nom.",
      steps: [
        "Sur votre iPhone, ouvrez Réglages, touchez votre nom, puis Abonnements.",
        "Faites une capture d'écran de la liste (actifs et expirés), ou copiez son texte.",
        "Importez la capture ici, ou collez le texte et choisissez « Apple ».",
        "Pour les achats passés, reportaproblem.apple.com liste chaque paiement.",
      ],
      accepts: "Capture d'écran ou texte collé",
      alert: (n: number) =>
        n === 1 ? "1 paiement Apple sur vos relevés n'a pas encore de nom." : `${n} paiements Apple sur vos relevés n'ont pas encore de nom.`,
    },
    google: {
      short: "Google Play",
      title: "Google Play : la liste de vos abonnements",
      why: "Les paiements Google Play s'affichent « GOOGLE*GOOGLE PLAY APPS » quelle que soit l'appli. Plusieurs applis peuvent coûter le même prix.",
      steps: [
        "Ouvrez le Play Store, touchez votre photo de profil, puis Paiements et abonnements, puis Abonnements.",
        "Faites une capture d'écran de la liste, ou copiez son texte, et ajoutez-la ici avec « Google Play ».",
        "Encore mieux : l'analyse Gmail lit chaque confirmation de commande Google Play, y compris les abonnements passés ou résiliés.",
      ],
      accepts: "Capture, texte collé ou analyse Gmail",
      alert: (n: number) =>
        n === 1 ? "1 paiement Google sur vos relevés n'a pas encore de nom." : `${n} paiements Google sur vos relevés n'ont pas encore de nom.`,
    },
    amazon: {
      short: "Amazon",
      title: "Amazon : adhésions et abonnements",
      why: "Prime, Prime Video Channels, Kindle Unlimited et Audible se renouvellent tout seuls, souvent une fois par an.",
      steps: [
        "Sur amazon.fr, ouvrez Votre compte, puis Vos abonnements et adhésions.",
        "Vérifiez chacun de ceux qui sont actifs. Leurs reçus arrivent par e-mail : l'analyse Gmail les trouve.",
        "Cochez cet élément une fois vérifié.",
      ],
      accepts: "Reçus par e-mail",
    },
    mail: {
      mailbox: "Boîte mail",
      gmailTitle: "Gmail : analyse ponctuelle des reçus",
      title: (box: string) => `${box} : reçus`,
      why: "Les reçus donnent le vrai service, la formule, le prix et le prochain renouvellement. Ils repèrent aussi les essais sur le point de devenir payants.",
      gmailSteps: [
        "Touchez « Connecter Gmail et analyser » sur la page d'import.",
        "Google demande un accès en lecture seule. Nous ne lisons que les reçus, gardons les montants et les marchands, puis révoquons l'accès aussitôt.",
        "Recommencez pour chaque adresse Gmail qui vous sert pour vos achats.",
      ],
      search: "Cherchez dans la boîte : facture, reçu, abonnement, renouvellement, essai, receipt, invoice, subscription.",
      outlook: "Ouvrez chaque reçu, puis Autres actions (…), puis Télécharger : cela enregistre un fichier .eml.",
      saveEml: "Enregistrez chaque reçu comme fichier (.eml), ou transférez-les vers une adresse Gmail et utilisez l'analyse Gmail.",
      uploadEml: "Importez les fichiers .eml ici, ou collez le texte d'un reçu dans la zone prévue.",
      acceptsGmail: "Analyse Gmail",
      acceptsOther: "Fichiers .eml ou texte collé",
    },
    operator: {
      short: "Factures mobile et internet",
      title: "Factures mobile et internet : options et achats de tiers",
      why: "Les options de la box (Canal+, Netflix) et les achats facturés sur le mobile (« Internet+ », « achats de contenus ») se cachent dans la facture mensuelle.",
      steps: [
        "Ouvrez l'espace client de votre opérateur et la dernière facture.",
        "Regardez les rubriques Options, Services, Achats de contenus ou Internet+ / SMS+.",
        "Tout ce que vous n'utilisez pas : supprimez-le depuis cet espace. Dans Internet+, vous pouvez aussi bloquer les achats de tiers.",
        "Cochez cet élément une fois vérifié.",
      ],
      accepts: "Vérifié à la main",
    },
    bnpl: {
      short: "Paiements en plusieurs fois",
      title: "Paiements en plusieurs fois (Klarna, Alma, Oney, PayPal 4X)",
      why: "Ces échéances reviennent chaque mois mais paient un seul achat. Elles sont volontairement exclues du rapport : rien à ajouter.",
      steps: ["Rien à faire. Si un abonnement a été payé en plusieurs fois, son reçu le montre quand même."],
      accepts: "Rien",
    },
  },

  gdpr: (service: string, since: string): string[] => [
    `Objet : demande de droit d'accès (article 15 du RGPD), historique complet de mes transactions ${service}`,
    ``,
    `Bonjour,`,
    ``,
    `En application de l'article 15 du Règlement général sur la protection des données (UE 2016/679), je vous demande une copie de l'ensemble des données personnelles que vous détenez à mon sujet, et en particulier l'historique complet de mes transactions depuis ${since}, avec pour chacune la date, le montant, la devise, le marchand et la source de financement.`,
    ``,
    `En application de l'article 20 (droit à la portabilité), je vous demande de me transmettre cet historique dans un format structuré, couramment utilisé et lisible par machine, comme le CSV.`,
    ``,
    `L'article 12, paragraphe 3, vous donne un mois à compter de la réception de cette demande pour y répondre. Mon compte est enregistré avec cette adresse e-mail.`,
    ``,
    `Merci d'avance,`,
    `[Votre nom]`,
  ],
};

export const ONBOARDING: Record<Locale, OnboardingDict> = { en, fr: withFrenchSpaces(fr) };

export const onboardingText = (locale: Locale) => ONBOARDING[locale];
