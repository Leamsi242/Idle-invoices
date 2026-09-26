"use client";

import { useEffect, useMemo, useState } from "react";

interface Institution { name: string; country: string }

const COUNTRIES = [
  ["FR", "France"], ["BE", "Belgique"], ["LU", "Luxembourg"], ["DE", "Deutschland"], ["ES", "España"], ["IT", "Italia"], ["NL", "Nederland"], ["PT", "Portugal"],
] as const;

// Shown first before the user types, in this order, when the provider lists them.
const POPULAR = [/demo bank/i, /cr[ée]dit mutuel/i, /bnp/i, /soci[ée]t[ée] g[ée]n[ée]rale/i, /cr[ée]dit agricole/i, /caisse d.[ée]pargne/i, /banque populaire/i, /banque postale/i, /lcl/i, /bourso/i, /\bcic\b/i, /american express|amex/i, /revolut/i, /n26/i];

const rank = (name: string) => {
  const i = POPULAR.findIndex((re) => re.test(name));
  return i < 0 ? POPULAR.length : i;
};

/** Search a bank, then go to its own sign-in page. We never see the password. */
export function BankPicker({ initialQuery = "" }: { initialQuery?: string }) {
  const [country, setCountry] = useState("FR");
  const [query, setQuery] = useState(initialQuery);
  const [list, setList] = useState<Institution[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [going, setGoing] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    setList(null);
    setError(null);
    fetch(`/api/bank/institutions?country=${country}`)
      .then(async (r) => {
        const json = await r.json();
        if (!r.ok) throw new Error(json.error ?? "The list of banks is unavailable.");
        if (live) setList(json.institutions);
      })
      .catch((e) => live && setError(e instanceof Error ? e.message : "The list of banks is unavailable."));
    return () => {
      live = false;
    };
  }, [country]);

  const shown = useMemo(() => {
    if (!list) return [];
    const q = query.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    const matches = q ? list.filter((i) => i.name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").includes(q)) : list;
    return [...matches].sort((a, b) => rank(a.name) - rank(b.name) || a.name.localeCompare(b.name)).slice(0, 8);
  }, [list, query]);

  async function connect(i: Institution) {
    setGoing(i.name);
    setError(null);
    try {
      const res = await fetch("/api/bank/start", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(i) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "This bank cannot be reached right now.");
      window.location.href = json.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "This bank cannot be reached right now.");
      setGoing(null);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search your bank (Crédit Mutuel, BNP, Amex...)"
          aria-label="Search your bank"
          className="min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-2"
        />
        <select value={country} onChange={(e) => setCountry(e.target.value)} aria-label="Country" className="rounded-xl border border-slate-300 px-2 py-2 text-sm">
          {COUNTRIES.map(([code, name]) => <option key={code} value={code}>{name}</option>)}
        </select>
      </div>
      {error && <p className="text-sm text-red-700">{error}</p>}
      {!list && !error && <p className="text-sm text-slate-500">Loading banks…</p>}
      {list && (
        <ul className="grid gap-2 sm:grid-cols-2">
          {shown.map((i) => (
            <li key={`${i.country}:${i.name}`}>
              <button
                type="button"
                disabled={!!going}
                onClick={() => connect(i)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-left text-sm font-medium hover:border-brand disabled:opacity-50"
              >
                {going === i.name ? "Opening your bank…" : i.name}
              </button>
            </li>
          ))}
          {shown.length === 0 && <li className="text-sm text-slate-500">No bank matches “{query}”.</li>}
        </ul>
      )}
    </div>
  );
}
