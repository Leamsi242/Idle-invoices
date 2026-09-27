"use client";

import { useEffect, useRef, useState } from "react";

const ease = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));

/**
 * A number that counts up to its value, the way a total "adds up" before your eyes. Starts from
 * the value seen on the last visit when there is one, so a change since then is visible.
 */
export function CountUp({ value, locale, currency, id, decimals = 0, className = "" }: { value: number; locale: string; currency: string; id: string; decimals?: number; className?: string }) {
  const format = (n: number) =>
    new Intl.NumberFormat(locale === "fr" ? "fr-FR" : "en-GB", { style: "currency", currency, maximumFractionDigits: decimals, minimumFractionDigits: decimals }).format(n);
  const [shown, setShown] = useState(value);
  const done = useRef(false);
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    const key = `sd_count_${id}`;
    let from = 0;
    try {
      from = Number(sessionStorage.getItem(key) ?? localStorage.getItem(key) ?? 0) || 0;
      localStorage.setItem(key, String(value));
    } catch {}
    if (from === value || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return setShown(value);
    const start = performance.now();
    const duration = 1400;
    let raf = 0;
    const tick = (now: number) => {
      const t = ease((now - start) / duration);
      setShown(from + (value - from) * t);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    setShown(from);
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [id, value]);
  return <span className={`tabular ${className}`}>{format(shown)}</span>;
}

/** A progress ring that draws itself to its value. */
export function ScoreRing({ value, label, size = 88 }: { value: number; label: string; size?: number }) {
  const r = 38;
  const c = 2 * Math.PI * r;
  const [drawn, setDrawn] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setDrawn(value));
    return () => cancelAnimationFrame(id);
  }, [value]);
  return (
    <div className="relative" style={{ width: size, height: size }} role="img" aria-label={`${label} ${value} %`}>
      <svg viewBox="0 0 88 88" className="h-full w-full -rotate-90">
        <circle cx="44" cy="44" r={r} fill="none" stroke="currentColor" strokeOpacity="0.15" strokeWidth="7" />
        <circle
          cx="44"
          cy="44"
          r={r}
          fill="none"
          stroke="url(#ring)"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - drawn / 100)}
          style={{ transition: "stroke-dashoffset 1.4s cubic-bezier(0.2, 0.8, 0.2, 1)" }}
        />
        <defs>
          <linearGradient id="ring" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#5ef2b8" />
            <stop offset="1" stopColor="#8b83ff" />
          </linearGradient>
        </defs>
      </svg>
      <span className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="tabular font-display text-xl font-semibold">{value}</span>
        <span className="text-[10px] uppercase tracking-widest opacity-70">{label}</span>
      </span>
    </div>
  );
}
