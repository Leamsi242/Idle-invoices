"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

/** Asks for the beta invitation code once; the browser remembers it. */
export function BetaCode({ t }: { t: { codeLabel: string; codeSubmit: string; codeWrong: string } }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [wrong, setWrong] = useState(false);
  const [pending, start] = useTransition();
  return (
    <form
      className="mt-3 flex flex-wrap items-end gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await fetch("/api/beta", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }) });
          if (!res.ok) return setWrong(true);
          router.replace("/");
          router.refresh();
        });
      }}
    >
      <label className="flex-1 text-sm">
        <span className="text-muted">{t.codeLabel}</span>
        <input value={code} onChange={(e) => (setCode(e.target.value), setWrong(false))} autoComplete="off" className="mt-1 w-full rounded-xl border border-line px-3 py-2" />
      </label>
      <button disabled={pending || !code.trim()} className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-on-accent disabled:opacity-40">{t.codeSubmit}</button>
      {wrong && <p className="w-full text-sm text-leak" role="alert">{t.codeWrong}</p>}
    </form>
  );
}
