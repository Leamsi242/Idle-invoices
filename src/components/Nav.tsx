"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "./ui";

type Item = { href: string; label: string; icon: "lens" | "check" | "bank" | "hourglass" };

function useActive() {
  const path = usePathname() || "/";
  return (href: string) => (href === "/" ? path === "/" : path.startsWith(href));
}

/** Top links on a large screen. */
export function Nav({ items }: { items: Item[] }) {
  const on = useActive();
  return (
      <nav className="hidden items-center gap-1 sm:flex" aria-label="Main">
        {items.map((i) => (
          <Link
            key={i.href}
            href={i.href}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${on(i.href) ? "bg-ink text-bg" : "text-ink-2 hover:bg-surface-2"}`}
          >
            {i.label}
          </Link>
        ))}
      </nav>
  );
}

/** A thumb-reachable tab bar on a phone (outside the blurred header, which would trap it). */
export function TabBar({ items }: { items: Item[] }) {
  const on = useActive();
  return (
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl sm:hidden"
        aria-label="Main"
      >
        <ul className="mx-auto grid max-w-md grid-cols-4">
          {items.map((i) => (
            <li key={i.href}>
              <Link href={i.href} className={`flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${on(i.href) ? "text-brand" : "text-muted"}`}>
                <Icon name={i.icon} className="h-6 w-6" />
                {i.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
  );
}
