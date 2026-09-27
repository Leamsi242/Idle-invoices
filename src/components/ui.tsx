/**
 * The small visual vocabulary of the app: icons, monograms, cards and chips. Server-safe (no
 * hooks), so pages can use them without shipping JavaScript.
 */
import type { ReactNode, SVGProps } from "react";

type IconName = "lens" | "bank" | "card" | "wallet" | "mail" | "calendar" | "bell" | "check" | "arrow" | "spark" | "shield" | "clock" | "file" | "home" | "list" | "hourglass" | "eye" | "trash" | "chevron";

const PATHS: Record<IconName, ReactNode> = {
  lens: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m15.5 15.5 5 5" /><path d="M8 9a3 3 0 0 1 3-2.5" /></>,
  bank: <><path d="M3 10 12 4l9 6" /><path d="M5 10v8M9.5 10v8M14.5 10v8M19 10v8" /><path d="M3 20h18" /></>,
  card: <><rect x="3" y="5.5" width="18" height="13" rx="2.5" /><path d="M3 10h18M7 15h4" /></>,
  wallet: <><path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H18v4" /><rect x="4" y="7.5" width="16" height="11.5" rx="2.5" /><circle cx="16" cy="13.25" r="1.25" /></>,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="m4 7 8 6 8-6" /></>,
  calendar: <><rect x="3.5" y="5" width="17" height="15" rx="2.5" /><path d="M3.5 10h17M8 3v4M16 3v4" /></>,
  bell: <><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z" /><path d="M10 20.5a2 2 0 0 0 4 0" /></>,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  arrow: <path d="M5 12h14m-5-5 5 5-5 5" />,
  spark: <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18" />,
  shield: <><path d="M12 3 5 6v5.5c0 4.2 2.9 7.9 7 9.5 4.1-1.6 7-5.3 7-9.5V6z" /><path d="m9 12 2 2 4-4" /></>,
  clock: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>,
  file: <><path d="M7 3h7l5 5v13H7z" /><path d="M14 3v5h5" /></>,
  home: <><path d="m4 11 8-7 8 7" /><path d="M6 9.5V20h12V9.5" /></>,
  list: <path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" />,
  hourglass: <><path d="M7 3h10M7 21h10" /><path d="M8 3c0 5 8 5 8 9s-8 4-8 9M16 3c0 5-8 5-8 9s8 4 8 9" /></>,
  eye: <><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" /><circle cx="12" cy="12" r="3" /></>,
  trash: <><path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13" /></>,
  chevron: <path d="m9 6 6 6-6 6" />,
};

export function Icon({ name, className = "h-5 w-5", ...rest }: { name: IconName } & SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden className={className} {...rest}>
      {PATHS[name]}
    </svg>
  );
}

/** The app's mark: a lens with a spark of light, the moment a forgotten charge is found. */
// Each instance needs its own gradient id: a hidden copy (the sidebar on mobile) would otherwise swallow it.
export function Logo({ className = "h-7 w-7", id = "lg" }: { className?: string; id?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#4f7bff" />
          <stop offset="1" stopColor="#1b3fb8" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill={`url(#${id})`} />
      <circle cx="14" cy="14" r="6.5" fill="none" stroke="#fff" strokeWidth="2.4" />
      <path d="m19 19 5.5 5.5" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="14" cy="14" r="2.2" fill="#ff5a36" />
    </svg>
  );
}

/** A stable, pleasant hue per service: the same name always gets the same color. */
export function hueOf(name: string): number {
  // FNV-1a, spread over the color wheel so neighbouring names get distinct hues.
  let h = 2166136261;
  for (const c of name.toLowerCase()) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return ((h >>> 0) * 137.508) % 360;
}

export function Monogram({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) {
  const letters = name.replace(/[^\p{L}\p{N} ]/gu, "").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "?";
  const h = hueOf(name);
  const dims = size === "lg" ? "h-12 w-12 text-base" : size === "sm" ? "h-8 w-8 text-[11px]" : "h-10 w-10 text-sm";
  return (
    <span
      aria-hidden
      className={`inline-flex shrink-0 items-center justify-center rounded-2xl font-semibold tracking-tight text-white ${dims}`}
      style={{ background: `linear-gradient(135deg, hsl(${h} 72% 58%), hsl(${(h + 40) % 360} 70% 44%))` }}
    >
      {letters}
    </span>
  );
}

export function Card({ children, className = "", as: Tag = "section" }: { children: ReactNode; className?: string; as?: "section" | "article" | "div" }) {
  return <Tag className={`rounded-3xl border border-line bg-surface p-5 shadow-card ${className}`}>{children}</Tag>;
}

/** A small label above a title, like a case file's stamp. */
export function Eyebrow({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <p className={`text-[11px] font-semibold uppercase tracking-[0.14em] text-muted ${className}`}>{children}</p>;
}

export function SectionTitle({ eyebrow, title, aside }: { eyebrow?: string; title: ReactNode; aside?: ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-3">
      <div>
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        <h2 className="font-display text-xl font-semibold tracking-tight">{title}</h2>
      </div>
      {aside}
    </div>
  );
}

const TONES = {
  neutral: "bg-surface-2 text-ink-2 border-line",
  brand: "bg-brand-soft text-brand border-transparent",
  leak: "bg-leak-soft text-leak border-transparent",
  save: "bg-save-soft text-save border-transparent",
  warn: "bg-warn-soft text-ink-2 border-transparent",
};

export function Pill({ children, tone = "neutral", className = "" }: { children: ReactNode; tone?: keyof typeof TONES; className?: string }) {
  return <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${TONES[tone]} ${className}`}>{children}</span>;
}

export const buttonClass = {
  primary: "inline-flex items-center justify-center gap-2 rounded-2xl bg-ink px-5 py-3 font-semibold text-bg transition hover:opacity-90 active:scale-[0.99] disabled:opacity-40",
  brand: "inline-flex items-center justify-center gap-2 rounded-2xl bg-brand px-5 py-3 font-semibold text-white transition hover:opacity-90 active:scale-[0.99] disabled:opacity-40",
  ghost: "inline-flex items-center justify-center gap-2 rounded-full border border-line bg-surface px-3.5 py-1.5 text-sm font-medium text-ink-2 transition hover:border-brand hover:text-brand disabled:opacity-40",
  small: "inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full bg-brand px-3.5 py-1.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-40",
};

/** Colors for the ways of paying, used in the split bar and its legend. */
export function payColor(name: string, i: number): string {
  if (/paypal/i.test(name)) return "#2f6bff";
  if (/american express|amex/i.test(name)) return "#18a0c8";
  const palette = ["#7c5cff", "#ff5a36", "#0fb67f", "#f5a524", "#e0457b", "#6b7280"];
  return palette[i % palette.length];
}
