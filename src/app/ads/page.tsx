import { notFound } from "next/navigation";
import { adsAdmin } from "@/lib/ads-admin";
import { campaignReport } from "@/lib/ads";
import { NewCampaign, StatusButton } from "@/components/AdConsole";
import { today as todayLocal } from "@/lib/today";

export const dynamic = "force-dynamic";
export const metadata = { title: "Régie · Subscription Detective" };

const eur = (n: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(n);
const pct = (n: number) => new Intl.NumberFormat("fr-FR", { style: "percent", maximumFractionDigits: 1 }).format(n);
const PRICING: Record<string, string> = { cpm: "CPM", cpc: "CPC", cpa: "CPA" };
const FORMAT: Record<string, string> = { story: "Story", short: "Short", card: "Carte" };

/** The owner's ad console: campaigns, their counters and what they earned. */
export default async function AdConsole() {
  if (!(await adsAdmin())) notFound();
  const [rows, today] = await Promise.all([campaignReport(), todayLocal()]);
  const total = rows.reduce((t, r) => ({ impressions: t.impressions + r.impressions, clicks: t.clicks + r.clicks, conversions: t.conversions + r.conversions, revenue: t.revenue + r.revenue }), { impressions: 0, clicks: 0, conversions: 0, revenue: 0 });
  const kpis: [string, string][] = [
    ["Revenus (HT)", eur(total.revenue)],
    ["Vues", total.impressions.toLocaleString("fr-FR")],
    ["Clics", `${total.clicks.toLocaleString("fr-FR")} (${pct(total.impressions ? total.clicks / total.impressions : 0)})`],
    ["Souscriptions", total.conversions.toLocaleString("fr-FR")],
  ];
  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">Régie publicitaire</p>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Vos campagnes</h1>
        <p className="text-sm text-ink-2">Compteurs par campagne et par jour, sans rien sur les personnes. Les campagnes de démonstration ne sont jamais comptées.</p>
      </header>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map(([k, v]) => (
          <div key={k} className="rounded-2xl border border-line bg-surface p-4">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted">{k}</p>
            <p className="mt-1 font-display text-2xl font-semibold tabular">{v}</p>
          </div>
        ))}
      </div>
      <section className="overflow-x-auto rounded-3xl border border-line bg-surface">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="text-left text-[11px] uppercase tracking-wider text-muted">
            <tr>{["Campagne", "Format", "Tarif", "Vues", "Vues complètes", "Clics", "Taux de clic", "Souscriptions", "Revenus", "Budget restant", ""].map((h) => <th key={h} className="px-4 py-3 font-semibold">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-line/70">
            {rows.length === 0 && <tr><td colSpan={11} className="px-4 py-6 text-center text-muted">Aucune campagne pour l&apos;instant.</td></tr>}
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-3"><p className="font-semibold">{r.name}</p><p className="text-xs text-muted">{r.advertiser}{r.categories ? ` · ${r.categories}` : ""} · {r.status === "active" ? "active" : "en pause"}</p></td>
                <td className="px-4 py-3">{FORMAT[r.format] ?? r.format}</td>
                <td className="px-4 py-3 tabular">{PRICING[r.pricing]} {eur(r.rate)}</td>
                <td className="px-4 py-3 tabular">{r.impressions.toLocaleString("fr-FR")}</td>
                <td className="px-4 py-3 tabular">{r.views.toLocaleString("fr-FR")}</td>
                <td className="px-4 py-3 tabular">{r.clicks.toLocaleString("fr-FR")}</td>
                <td className="px-4 py-3 tabular">{pct(r.ctr)}</td>
                <td className="px-4 py-3 tabular">{r.conversions}</td>
                <td className="px-4 py-3 tabular font-semibold">{eur(r.revenue)}</td>
                <td className="px-4 py-3 tabular">{eur(r.left)}</td>
                <td className="px-4 py-3"><StatusButton id={r.id} status={r.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section className="space-y-3 rounded-3xl border border-line bg-surface p-5">
        <h2 className="font-display text-xl font-semibold">Nouvelle campagne</h2>
        <NewCampaign today={today} />
      </section>
      <section className="space-y-2 rounded-3xl bg-surface-2 p-5 text-sm text-ink-2">
        <h2 className="font-semibold text-ink">Suivi des souscriptions (CPA)</h2>
        <p>Chaque clic arrive chez l&apos;annonceur avec un identifiant aléatoire <code>sd_click</code>. Quand la personne souscrit, le serveur de l&apos;annonceur appelle : <code className="break-all">/api/ads/postback?click=&lt;sd_click&gt;&amp;key=&lt;clé de la campagne&gt;</code>. Une souscription n&apos;est comptée qu&apos;une fois par clic.</p>
      </section>
    </div>
  );
}
