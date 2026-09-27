"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";

/**
 * A side panel over the page: focus moves into it, Escape or the backdrop closes it, and Tab stays
 * inside while it is open.
 */
export function Drawer({ closeHref, label, closeLabel, children }: { closeHref: string; label: string; closeLabel: string; children: ReactNode }) {
  const router = useRouter();
  const panel = useRef<HTMLElement>(null);
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    panel.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") router.push(closeHref, { scroll: false });
      if (e.key !== "Tab" || !panel.current) return;
      const items = panel.current.querySelectorAll<HTMLElement>("a[href], button:not([disabled]), input, select, textarea, summary, [tabindex]:not([tabindex='-1'])");
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) (e.preventDefault(), last.focus());
      else if (!e.shiftKey && document.activeElement === last) (e.preventDefault(), first.focus());
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      opener?.focus?.();
    };
  }, [closeHref, router]);
  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label={label}>
      <Link href={closeHref} scroll={false} tabIndex={-1} aria-hidden className="absolute inset-0 bg-night/40 backdrop-blur-sm">
        <span className="sr-only">{closeLabel}</span>
      </Link>
      <aside ref={panel} tabIndex={-1} className="drawer relative flex h-full w-full max-w-md flex-col gap-5 overflow-y-auto bg-surface p-6 shadow-2xl outline-none">
        {children}
      </aside>
    </div>
  );
}
