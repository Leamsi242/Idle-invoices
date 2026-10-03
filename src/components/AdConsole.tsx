"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const field = "w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-brand";
const CATEGORIES = ["telecom", "energy", "streaming", "music", "insurance", "gaming", "productivity", "cloud storage", "fitness", "news", "food", "transport"];

/** The form that creates a campaign. Shows the advertiser's postback key once. */
export function NewCampaign({ today }: { today: string }) {
  const router = useRouter();
  const [errors, setErrors] = useState<string[]>([]);
  const [created, setCreated] = useState<{ id: string; postbackSecret: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [cats, setCats] = useState<string[]>([]);
  return (
    <form
      className="grid gap-3 sm:grid-cols-2"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        const data = Object.fromEntries(new FormData(e.currentTarget).entries());
        const res = await fetch("/api/ads/campaigns", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...data, categories: cats.join(",") }) });
        const out = await res.json();
        setBusy(false);
        if (!res.ok) return setErrors(out.errors ?? [out.error ?? "erreur"]);
        setErrors([]);
        setCreated(out);
        router.refresh();
      }}
    >
      <label className="space-y-1 text-xs font-medium text-ink-2">Annonceur<input name="advertiser" className={field} required /></label>
      <label className="space-y-1 text-xs font-medium text-ink-2">Nom de la campagne<input name="name" className={field} required /></label>
      <label className="space-y-1 text-xs font-medium text-ink-2">Format
        <select name="format" className={field}><option value="story">Story (plein écran, 9:16)</option><option value="short">Short (vidéo dans la page)</option><option value="card">Carte</option></select>
      </label>
      <label className="space-y-1 text-xs font-medium text-ink-2">Tarification
        <select name="pricing" className={field}><option value="cpm">CPM (pour 1 000 vues)</option><option value="cpc">CPC (par clic)</option><option value="cpa">CPA (par souscription)</option></select>
      </label>
      <label className="space-y-1 text-xs font-medium text-ink-2">Tarif (€ HT)<input name="rate" type="number" step="0.01" min="0" className={field} required /></label>
      <label className="space-y-1 text-xs font-medium text-ink-2">Budget total (€ HT)<input name="budget" type="number" step="1" min="0" className={field} required /></label>
      <label className="space-y-1 text-xs font-medium text-ink-2">Début<input name="startsOn" type="date" defaultValue={today} className={field} required /></label>
      <label className="space-y-1 text-xs font-medium text-ink-2">Fin<input name="endsOn" type="date" className={field} required /></label>
      <label className="space-y-1 text-xs font-medium text-ink-2 sm:col-span-2">Titre<input name="title" className={field} required maxLength={80} /></label>
      <label className="space-y-1 text-xs font-medium text-ink-2 sm:col-span-2">Texte<input name="body" className={field} maxLength={140} /></label>
      <label className="space-y-1 text-xs font-medium text-ink-2">Bouton<input name="cta" className={field} required maxLength={24} defaultValue="Voir l'offre" /></label>
      <label className="space-y-1 text-xs font-medium text-ink-2">Page de destination (https)<input name="url" type="url" className={field} required /></label>
      <label className="space-y-1 text-xs font-medium text-ink-2">Vidéo ou image (https ou /public)<input name="mediaUrl" className={field} /></label>
      <label className="space-y-1 text-xs font-medium text-ink-2">Type de média
        <select name="mediaKind" className={field}><option value="video">Vidéo</option><option value="image">Image</option></select>
      </label>
      <label className="space-y-1 text-xs font-medium text-ink-2 sm:col-span-2">Vignette (https ou /public)<input name="posterUrl" className={field} /></label>
      <fieldset className="space-y-1 sm:col-span-2">
        <legend className="text-xs font-medium text-ink-2">Ciblage par catégorie d&apos;abonnements (aucune : tout le monde)</legend>
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((c) => (
            <button key={c} type="button" onClick={() => setCats(cats.includes(c) ? cats.filter((x) => x !== c) : [...cats, c])} className={`rounded-full border px-3 py-1 text-xs ${cats.includes(c) ? "border-brand bg-brand-soft text-brand" : "border-line text-ink-2"}`}>{c}</button>
          ))}
        </div>
      </fieldset>
      <div className="space-y-2 sm:col-span-2">
        <button disabled={busy} className="rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-on-accent disabled:opacity-50">{busy ? "Création…" : "Créer la campagne"}</button>
        {errors.length > 0 && <p role="alert" className="rounded-2xl bg-leak-soft p-3 text-sm text-leak">{errors.join(" ; ")}</p>}
        {created && (
          <p className="rounded-2xl bg-save-soft p-3 text-xs text-ink-2">
            Campagne créée. Clé de suivi des souscriptions à transmettre à l&apos;annonceur (affichée une seule fois) : <code className="break-all font-semibold">{created.postbackSecret}</code>
          </p>
        )}
      </div>
    </form>
  );
}

export function StatusButton({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const next = status === "active" ? "paused" : "active";
  return (
    <button
      type="button"
      className="rounded-full border border-line px-3 py-1 text-xs hover:border-brand"
      onClick={async () => { await fetch("/api/ads/campaigns", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status: next }) }); router.refresh(); }}
    >
      {status === "active" ? "Mettre en pause" : "Relancer"}
    </button>
  );
}
