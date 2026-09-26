import type { SourceCoverage } from "@/lib/store";
import { daysBetween } from "@/lib/dates";
import { formatDate, type Locale, type Messages } from "@/lib/i18n";
import { Icon } from "./ui";

const ICON = { bank: "bank", paypal: "wallet", mail: "mail", file: "file" } as const;

export const spanDays = (s: SourceCoverage) => (s.from && s.to ? daysBetween(s.from, s.to) + 1 : 0);

/** One source: what it shared (period, items) and the limit that comes with it. */
export function CoverageLine({ s, m, locale }: { s: SourceCoverage; m: Messages; locale: Locale }) {
  const u = m.ui;
  const days = spanDays(s);
  const what =
    s.kind === "mail" ? u.coverMail(s.checked ?? 0, s.items) : s.kind === "paypal" ? u.coverPaypal(s.items, days) : s.kind === "bank" ? u.coverBank(s.items, days) : u.coverFile(s.items);
  const limit = s.kind === "mail" ? u.limitMail : s.kind === "paypal" ? u.limitPaypal : s.kind === "bank" ? u.limitBank(days) : u.limitFile;
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-ink-2">
        <Icon name={s.kind === "bank" && /american express|amex/i.test(s.name) ? "card" : ICON[s.kind]} className="h-[18px] w-[18px]" />
      </span>
      <div className="min-w-0 text-sm">
        <p className="font-medium">
          {s.name} <span className="font-normal text-muted">· {what}</span>
        </p>
        {s.from && s.to && <p className="text-xs text-muted">{u.period(formatDate(s.from, locale), formatDate(s.to, locale))}</p>}
        <p className="mt-0.5 text-xs text-muted">{limit}</p>
      </div>
    </div>
  );
}

/**
 * Every source on one time axis: at a glance, which period each one covers. A bank sharing 90
 * days next to a mailbox going back two years shows why a yearly renewal may be missing.
 */
export function CoverageTimeline({ sources, m, locale }: { sources: SourceCoverage[]; m: Messages; locale: Locale }) {
  const dated = sources.filter((s) => s.from && s.to);
  if (dated.length === 0) return null;
  const start = dated.map((s) => s.from!).sort()[0];
  const end = dated.map((s) => s.to!).sort().at(-1)!;
  const total = Math.max(1, daysBetween(start, end));
  const pos = (d: string) => (daysBetween(start, d) / total) * 100;
  const color = { bank: "var(--brand)", paypal: "#2f6bff", mail: "var(--save)", file: "var(--warn)" };
  return (
    <div className="space-y-2.5">
      {dated.map((s) => (
        <div key={`${s.kind}:${s.name}`} className="grid grid-cols-[7.5rem_1fr] items-center gap-3 text-xs">
          <span className="truncate font-medium text-ink-2">{s.name}</span>
          <div className="relative h-2.5 rounded-full bg-surface-2">
            <div
              className="absolute inset-y-0 rounded-full"
              style={{ left: `${pos(s.from!)}%`, width: `${Math.max(2, pos(s.to!) - pos(s.from!))}%`, background: color[s.kind] }}
            />
          </div>
        </div>
      ))}
      <div className="grid grid-cols-[7.5rem_1fr] gap-3 text-[11px] text-muted">
        <span />
        <span className="flex justify-between">
          <span>{formatDate(start, locale)}</span>
          <span>{formatDate(end, locale)}</span>
        </span>
      </div>
    </div>
  );
}
