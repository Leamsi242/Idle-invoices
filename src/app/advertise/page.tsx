import Link from "next/link";
import { Icon } from "@/components/ui";

export const metadata = { title: "Annoncer chez nous · Subscription Detective" };

/**
 * The public media kit: the formats, the rules, indicative launch prices. In French only for now:
 * the first advertisers are French.
 */
const FORMATS = [
  { name: "Story", ratio: "9:16, plein écran", what: "Vidéo ou image de 6 à 15 secondes, ouverte par l'utilisateur depuis la rangée « Bons plans du mois ». Bouton d'action en bas.", media: "/ads/demo/forfait.webm", poster: "/ads/demo/forfait.jpg" },
  { name: "Short", ratio: "9:16, dans la page", what: "Vidéo verticale muette en boucle dans l'aperçu, le son au toucher. Le format le plus vu.", media: "/ads/demo/stream.webm", poster: "/ads/demo/stream.jpg" },
  { name: "Offre au bon moment", ratio: "carte contextuelle", what: "Votre offre affichée sur la fiche d'un abonnement plus cher de la même catégorie, ou juste après une hausse de prix.", media: null, poster: "/ads/demo/energie.jpg" },
];
const PRICES = [
  ["Story", "CPM", "25 € HT les 1 000 vues"],
  ["Short", "CPM", "18 € HT les 1 000 vues"],
  ["Offre au bon moment", "CPC", "0,60 € HT le clic"],
  ["Tous formats", "CPA", "à partir de 12 € HT par souscription"],
];
const RULES = [
  ["Contextuel, sans pistage", "Le ciblage se fait sur la catégorie des abonnements trouvés (téléphone, énergie, streaming...), calculée dans l'application. Aucun cookie publicitaire, aucune donnée personnelle transmise."],
  ["Toujours signalé", "Chaque format porte la mention « Publicité » et le nom de l'annonceur."],
  ["Utile d'abord", "Les offres plus chères que ce que la personne paie déjà ne sont pas affichées sur sa fiche. Les membres Premium ne voient ni Stories ni Shorts."],
  ["Mesure transparente", "Vues, vues complètes, clics et souscriptions par jour, dans une console partagée. Les souscriptions sont remontées par un lien serveur à serveur."],
];

export default async function Advertise({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  const { from } = await searchParams;
  const contact = process.env.ADS_CONTACT_EMAIL;
  return (
    <div className="space-y-10">
      {from === "demo" && <p className="rounded-2xl bg-warn-soft p-3 text-sm text-ink-2">Vous venez d&apos;une publicité de démonstration : la marque est fictive. Voici comment fonctionne l&apos;espace publicitaire.</p>}
      <section className="spotlight grain sweep relative overflow-hidden rounded-[28px] px-6 py-12 text-white sm:px-10">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">Annoncer chez nous</p>
        <h1 className="mt-3 max-w-2xl font-display text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">Parlez aux gens au moment exact où ils veulent payer moins.</h1>
        <p className="mt-4 max-w-xl text-white/80">Nos utilisateurs viennent de découvrir ce qu&apos;ils paient chaque mois. Ils cherchent mieux, maintenant. Vous leur montrez votre offre en Story, en Short ou sur la fiche de l&apos;abonnement qu&apos;elle remplace.</p>
        <div className="mt-7 flex flex-wrap gap-3">
          {contact ? (
            <a href={`mailto:${contact}?subject=${encodeURIComponent("Campagne sur Subscription Detective")}`} className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 font-semibold text-night">Lancer une campagne <Icon name="arrow" className="h-4 w-4" /></a>
          ) : (
            <span className="rounded-2xl bg-white/15 px-5 py-3 text-sm">Ouverture aux annonceurs : bientôt</span>
          )}
          <Link href="/report" className="rounded-2xl border border-white/30 px-5 py-3 font-semibold hover:bg-white/10">Voir l&apos;application</Link>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-2xl font-semibold tracking-tight">Trois formats, pensés pour le mobile</h2>
        <div className="grid gap-5 md:grid-cols-3">
          {FORMATS.map((f) => (
            <article key={f.name} className="space-y-3 rounded-3xl border border-line bg-surface p-4">
              <div className="relative mx-auto aspect-[9/16] w-full max-w-[220px] overflow-hidden rounded-[22px] bg-black ring-4 ring-night/80">
                {f.media ? (
                  <video src={f.media} poster={f.poster} autoPlay muted loop playsInline className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full flex-col justify-end bg-surface-2 p-3">
                    <div className="space-y-1.5 rounded-2xl border border-save/40 bg-save-soft p-3 text-[11px]">
                      <p className="font-semibold uppercase tracking-wider text-save">Moins cher ailleurs</p>
                      <p className="font-semibold text-ink">Électricité, prix bloqué 2 ans</p>
                      <p className="text-ink-2">Votre offre, sur la fiche de l&apos;abonnement qu&apos;elle remplace.</p>
                    </div>
                  </div>
                )}
                <span className="absolute left-2 top-2 rounded-full bg-black/50 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-white">Publicité</span>
              </div>
              <div>
                <p className="font-semibold">{f.name} <span className="text-xs font-normal text-muted">· {f.ratio}</span></p>
                <p className="mt-1 text-sm text-ink-2">{f.what}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        {RULES.map(([title, text]) => (
          <div key={title} className="rounded-3xl border border-line bg-surface p-5">
            <p className="flex items-center gap-2 font-semibold"><Icon name="shield" className="h-4 w-4 text-brand" />{title}</p>
            <p className="mt-2 text-sm text-ink-2">{text}</p>
          </div>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-2xl font-semibold tracking-tight">Tarifs de lancement</h2>
        <div className="overflow-hidden rounded-3xl border border-line bg-surface">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-line/70">
              {PRICES.map(([f, m, p]) => (
                <tr key={f + m}><td className="px-5 py-3 font-medium">{f}</td><td className="px-5 py-3 text-muted">{m}</td><td className="px-5 py-3 text-right tabular font-semibold">{p}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted">Tarifs indicatifs, hors TVA, ajustés selon le volume et la durée. Budget plafonné : la campagne s&apos;arrête d&apos;elle-même une fois le budget dépensé.</p>
      </section>
    </div>
  );
}
