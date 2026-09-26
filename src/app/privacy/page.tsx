import { RETENTION_DAYS } from "@/lib/store";
import { DeleteEverythingButton } from "@/components/Questions";
import { getLocale } from "@/lib/locale";

export const dynamic = "force-dynamic";
export const metadata = { title: "Privacy · Subscription Detective" };

export default async function Privacy() {
  if ((await getLocale()) === "fr") return <PrivacyFr />;
  return (
    <article className="space-y-5 leading-relaxed">
      <h1 className="text-2xl font-bold">How we handle your data</h1>
      <p>You are trusting us with financial data. Here is exactly what happens to it, in plain language.</p>

      <section className="space-y-2">
        <h2 className="font-semibold">What we keep</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>For each payment: its date, amount, currency and description. Nothing else.</li>
          <li>The subscriptions we found, and your answers to &quot;Still using this?&quot; and &quot;What is this charge?&quot;.</li>
          <li>Free trials you asked us to track (name, end date, price). Calendar reminders are created on your phone, not by us.</li>
          <li>The names of the files you uploaded and of the banks and mailboxes you connected, so you know what was read.</li>
          <li>Your answers to &quot;How do you pay?&quot; (which banks, cards, payment apps, stores and mailboxes you use, never any number or password), encrypted, to build your checklist.</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold">What we never keep</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li><strong>Your files.</strong> They are read in memory and deleted right after. They are never written to disk.</li>
          <li><strong>Account numbers, IBANs and card numbers.</strong> They are masked while reading, before anything is stored (for example ••••7890).</li>
          <li>Your balance, your name or your address.</li>
          <li><strong>Your bank password or your email password.</strong> You type them on your bank&apos;s or your email provider&apos;s own page, never on ours.</li>
          <li><strong>Any access to your bank or mailbox you did not ask to keep.</strong> Each connection is used once, right after you sign in, then closed, unless you tick &quot;Keep watching for 90 days&quot;: then the read-only bank access is kept (encrypted), read again every night, and closed when you stop, when you delete everything, or after 90 days. An alert email, if you give one, is stored encrypted and used for nothing else.</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold">How it is protected</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Payment descriptions are encrypted in the database (AES-256).</li>
          <li>All traffic uses HTTPS.</li>
          <li>There are no accounts: your data is linked to a random identifier stored in a cookie in this browser only.</li>
          <li>
            If you connect your bank, the connection goes through Enable Banking, a payment institution licensed under the European PSD2
            rules to read account information. The access is read-only (nobody can move money with it), limited to one day, and we close
            it as soon as your transactions have been read. We read up to two years of history, depending on your bank (Crédit Mutuel shares the last 90 days).
          </li>
          <li>
            If you connect Outlook or Hotmail, we ask Microsoft for mail reading only, without a long-term token. We open only emails that
            look like receipts and keep the same fields as for Gmail. The access expires by itself within about an hour and is never stored.
          </li>
          <li>
            If you scan Gmail, we get read-only access for the length of the scan. We only open emails whose subject
            mentions a receipt, invoice, subscription, renewal or trial, keep the amount, merchant and date of real receipts, and revoke our
            access right after. Your emails are never stored.
          </li>
          <li>
            If you upload a screenshot of your app store subscriptions, only that image is sent to Claude (Anthropic&apos;s AI) to read the
            text. Your statements are never sent.
          </li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold">How long</h2>
        <p>
          Until you press &quot;Delete everything&quot;, and never longer than {RETENTION_DAYS} days after your last upload. After that it is erased
          automatically.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold">Why</h2>
        <p>Only to show you your subscriptions report. We don&apos;t sell, share or use your data for anything else.</p>
      </section>

      <p className="text-sm text-slate-500">This is a prototype. A GDPR review and a security audit will happen before any public launch.</p>
      <DeleteEverythingButton />
    </article>
  );
}

function PrivacyFr() {
  return (
    <article className="space-y-5 leading-relaxed">
      <h1 className="text-2xl font-bold">Ce que nous faisons de vos données</h1>
      <p>Vous nous confiez des données financières. Voici exactement ce qu&apos;elles deviennent, en termes simples.</p>

      <section className="space-y-2">
        <h2 className="font-semibold">Ce que nous gardons</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Pour chaque paiement : sa date, son montant, sa devise et son libellé. Rien d&apos;autre.</li>
          <li>Les abonnements trouvés, et vos réponses à « Vous l&apos;utilisez encore ? » et « Qu&apos;est-ce que c&apos;est ? ».</li>
          <li>Les essais gratuits que vous nous demandez de suivre (nom, date de fin, prix). Les rappels sont créés dans l&apos;agenda de votre téléphone, pas chez nous.</li>
          <li>Les noms des fichiers envoyés et des banques et boîtes mail connectées, pour que vous sachiez ce qui a été lu.</li>
          <li>Vos réponses à « Comment payez-vous ? » (quelles banques, cartes, applications de paiement, magasins et boîtes mail, jamais un numéro ni un mot de passe), chiffrées, pour construire votre liste.</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold">Ce que nous ne gardons jamais</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li><strong>Vos fichiers.</strong> Ils sont lus en mémoire puis effacés aussitôt. Ils ne sont jamais écrits sur disque.</li>
          <li><strong>Les numéros de compte, IBAN et numéros de carte.</strong> Ils sont masqués pendant la lecture, avant tout enregistrement (par exemple ••••7890).</li>
          <li>Votre solde, votre nom ou votre adresse.</li>
          <li><strong>Le mot de passe de votre banque ou de votre boîte mail.</strong> Vous le tapez sur la page de votre banque ou de votre messagerie, jamais sur la nôtre.</li>
          <li><strong>Un accès à votre banque ou à votre boîte mail que vous n&apos;avez pas demandé à garder.</strong> Chaque connexion sert une fois, juste après votre identification, puis elle est fermée, sauf si vous cochez « Continuer à surveiller pendant 90 jours » : l&apos;accès bancaire en lecture seule est alors gardé (chiffré), relu chaque nuit, et fermé quand vous arrêtez, quand vous supprimez tout, ou au bout de 90 jours. L&apos;e-mail d&apos;alerte, si vous en donnez un, est chiffré et ne sert à rien d&apos;autre.</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold">Comment c&apos;est protégé</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Les libellés de paiement sont chiffrés dans la base de données (AES-256).</li>
          <li>Toutes les connexions passent en HTTPS.</li>
          <li>Il n&apos;y a pas de compte : vos données sont liées à un identifiant aléatoire gardé dans un cookie de ce navigateur uniquement.</li>
          <li>
            Si vous connectez votre banque, la connexion passe par Enable Banking, un établissement de paiement agréé selon la directive
            européenne DSP2 pour lire les informations de compte. L&apos;accès est en lecture seule (personne ne peut déplacer d&apos;argent avec),
            limité à un jour, et nous le fermons dès que vos opérations sont lues. Nous lisons jusqu&apos;à deux ans d&apos;historique selon votre
            banque (le Crédit Mutuel partage les 90 derniers jours).
          </li>
          <li>
            Si vous connectez Outlook ou Hotmail, nous demandons à Microsoft la seule lecture des e-mails, sans jeton de longue durée. Nous
            n&apos;ouvrons que les e-mails qui ressemblent à des reçus et gardons les mêmes informations que pour Gmail. L&apos;accès expire seul
            en une heure environ et n&apos;est jamais conservé.
          </li>
          <li>
            Si vous lisez Gmail, nous obtenons un accès en lecture seule le temps de la lecture. Nous n&apos;ouvrons que les e-mails dont
            l&apos;objet parle de reçu, facture, abonnement, renouvellement ou essai, gardons le montant, le marchand et la date des vrais reçus,
            et révoquons l&apos;accès juste après. Vos e-mails ne sont jamais conservés.
          </li>
          <li>
            Si vous envoyez une capture de vos abonnements, seule cette image est transmise à Claude (l&apos;IA d&apos;Anthropic) pour en lire le
            texte. Vos relevés ne sont jamais envoyés.
          </li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold">Combien de temps</h2>
        <p>
          Jusqu&apos;à ce que vous appuyiez sur « Tout supprimer », et jamais plus de {RETENTION_DAYS} jours après votre dernier envoi. Ensuite,
          tout est effacé automatiquement.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold">Pourquoi</h2>
        <p>Uniquement pour vous montrer votre rapport d&apos;abonnements. Nous ne vendons, ne partageons et n&apos;utilisons vos données pour rien d&apos;autre.</p>
      </section>

      <p className="text-sm text-slate-500">Ceci est un prototype. Un examen RGPD et un audit de sécurité auront lieu avant tout lancement public.</p>
      <DeleteEverythingButton />
    </article>
  );
}
