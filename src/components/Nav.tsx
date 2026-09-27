"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";
import { Icon } from "./ui";

type IconName = "home" | "list" | "calendar" | "bank";
export type NavItem = { href: string; label: string; icon: IconName; badge?: number };

function useActive() {
  const path = usePathname() || "/";
  return (href: string) => (href === "/" ? path === "/" : path.startsWith(href));
}

/** The sidebar of a large screen: the four places of the app, with what waits in each. */
export function SideNav({ items, label, badgeHint }: { items: NavItem[]; label: string; badgeHint: string }) {
  const on = useActive();
  return (
    <nav className="space-y-1" aria-label={label}>
      {items.map((i) => (
        <Link
          key={i.href}
          href={i.href}
          aria-current={on(i.href) ? "page" : undefined}
          className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition ${on(i.href) ? "bg-brand-soft text-brand" : "text-ink-2 hover:bg-surface-2"}`}
        >
          <Icon name={i.icon} className="h-[18px] w-[18px]" />
          <span className="flex-1">{i.label}</span>
          {!!i.badge && <span className="tabular rounded-full bg-brand px-2 py-0.5 text-[11px] font-semibold text-on-accent">{i.badge}<span className="sr-only"> {badgeHint}</span></span>}
        </Link>
      ))}
    </nav>
  );
}

/** A thumb-reachable tab bar on a phone. */
export function TabBar({ items, label, badgeHint }: { items: NavItem[]; label: string; badgeHint: string }) {
  const on = useActive();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden" aria-label={label}>
      <ul className="mx-auto grid max-w-md grid-cols-4">
        {items.map((i) => (
          <li key={i.href}>
            <Link href={i.href} aria-current={on(i.href) ? "page" : undefined} className={`relative flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${on(i.href) ? "text-brand" : "text-muted"}`}>
              <Icon name={i.icon} className="h-6 w-6" />
              {i.label}
              {!!i.badge && <span className="tabular absolute right-[22%] top-1 rounded-full bg-brand px-1.5 text-[10px] font-semibold text-on-accent">{i.badge}<span className="sr-only"> {badgeHint}</span></span>}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** Leaves the demo: its made-up data is deleted and the user's own space comes back. */
export function QuitDemo({ label }: { label: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      className="inline-flex items-center gap-1 font-semibold underline decoration-white/40 underline-offset-4"
      onClick={() => start(async () => {
        await fetch("/api/demo", { method: "DELETE" });
        router.push("/");
        router.refresh();
      })}
    >
      {label}
    </button>
  );
}

/** Tries the app on made-up data, in a separate space. */
export function TryDemo({ label, className }: { label: string; className: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      className={className}
      onClick={() => start(async () => {
        await fetch("/api/demo", { method: "POST" });
        router.push("/report");
        router.refresh();
      })}
    >
      {pending ? "…" : label}
    </button>
  );
}
