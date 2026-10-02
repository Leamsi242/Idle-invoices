import type { Locale } from "./i18n";
import { withFrenchSpaces } from "./typo";

/** Texts of the account pages and of the sign-in e-mail. */
const en = {
  nav: "Account",
  title: "Your account",
  intro: "An account keeps your subscriptions when you change browser or device. No password: we send you a sign-in link by e-mail.",
  why: [
    "Open your findings on your phone and your computer.",
    "Keep them if you clear this browser's cookies.",
    "Nothing changes for your data: same encryption, same 30-day rule after your last import.",
  ],
  email: "Your e-mail",
  send: "Send me a sign-in link",
  sending: "Sending…",
  sent: (email: string) => `If ${email} is a valid address, a sign-in link is on its way. It works once, for 15 minutes. Check your spam folder too.`,
  devLink: "E-mail sending is not set up on this server (development): here is the link it would have sent.",
  invalid: "This e-mail address does not look right.",
  tooMany: "Too many requests. Wait a few minutes, then try again.",
  unavailable: "Sign-in by e-mail is not available yet on this server.",
  signedIn: "Signed in as",
  plan: (p: string) => `Plan: ${p}`,
  plans: { free: "Free", premium: "Premium" } as Record<string, string>,
  since: (d: string) => `Account opened on ${d}.`,
  logout: "Sign out",
  logoutHint: "Your data stays with your account. Sign in again from any device with the same e-mail.",
  deleteAccount: "Delete my account and all my data",
  deleteConfirm: "Delete your account, your e-mail and all your data? This cannot be undone.",
  deleted: "Your account and your data are deleted.",
  // The page the e-mail link opens.
  confirmTitle: "Sign in",
  confirmIntro: "Press the button to finish signing in on this browser.",
  confirm: "Sign me in",
  confirming: "Signing in…",
  replaceWarning: "This browser already holds findings made without an account. Your account has its own: signing in replaces this browser's findings with your account's, and erases them from our servers.",
  adoptNote: "The findings made on this browser are kept and attached to your account.",
  expired: "This link has expired or was already used. Ask for a new one.",
  again: "Get a new link",
  done: "You are signed in.",
  // The e-mail.
  mailSubject: "Your sign-in link",
  mailBody: (link: string) =>
    ["Hello,", "", "Here is your link to sign in to Subscription Detective:", link, "", "It works once, for 15 minutes.", "If you did not ask for it, ignore this e-mail: nothing happens without a click on the link."].join("\n"),
};

type Dict = typeof en;

const fr: Dict = {
  nav: "Compte",
  title: "Votre compte",
  intro: "Un compte garde vos abonnements quand vous changez de navigateur ou d'appareil. Pas de mot de passe : nous vous envoyons un lien de connexion par e-mail.",
  why: [
    "Retrouvez vos résultats sur votre téléphone et votre ordinateur.",
    "Gardez-les même si vous effacez les cookies de ce navigateur.",
    "Rien ne change pour vos données : même chiffrement, même règle des 30 jours après votre dernier import.",
  ],
  email: "Votre e-mail",
  send: "Recevoir un lien de connexion",
  sending: "Envoi…",
  sent: (email) => `Si ${email} est une adresse valide, un lien de connexion arrive. Il fonctionne une fois, pendant 15 minutes. Pensez à regarder dans les indésirables.`,
  devLink: "L'envoi d'e-mails n'est pas configuré sur ce serveur (développement) : voici le lien qui aurait été envoyé.",
  invalid: "Cette adresse e-mail ne semble pas correcte.",
  tooMany: "Trop de demandes. Attendez quelques minutes, puis réessayez.",
  unavailable: "La connexion par e-mail n'est pas encore disponible sur ce serveur.",
  signedIn: "Connecté avec",
  plan: (p) => `Formule : ${p}`,
  plans: { free: "Gratuite", premium: "Premium" },
  since: (d) => `Compte ouvert le ${d}.`,
  logout: "Se déconnecter",
  logoutHint: "Vos données restent avec votre compte. Reconnectez-vous depuis n'importe quel appareil avec le même e-mail.",
  deleteAccount: "Supprimer mon compte et toutes mes données",
  deleteConfirm: "Supprimer votre compte, votre e-mail et toutes vos données ? C'est définitif.",
  deleted: "Votre compte et vos données sont supprimés.",
  confirmTitle: "Connexion",
  confirmIntro: "Appuyez sur le bouton pour terminer la connexion sur ce navigateur.",
  confirm: "Me connecter",
  confirming: "Connexion…",
  replaceWarning: "Ce navigateur contient déjà des résultats faits sans compte. Votre compte a les siens : la connexion remplace les résultats de ce navigateur par ceux du compte, et les efface de nos serveurs.",
  adoptNote: "Les résultats faits sur ce navigateur sont conservés et rattachés à votre compte.",
  expired: "Ce lien a expiré ou a déjà servi. Demandez-en un nouveau.",
  again: "Recevoir un nouveau lien",
  done: "Vous êtes connecté.",
  mailSubject: "Votre lien de connexion",
  mailBody: (link) =>
    ["Bonjour,", "", "Voici votre lien pour vous connecter à Subscription Detective :", link, "", "Il fonctionne une fois, pendant 15 minutes.", "Si vous n'avez rien demandé, ignorez ce message : rien ne se passe sans un clic sur le lien."].join("\n"),
};

export const ACCOUNT_DICTS: Record<Locale, Dict> = { en, fr: withFrenchSpaces(fr) };
export type AccountText = Dict;
