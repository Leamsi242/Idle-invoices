import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Subscription Detective",
  description: "You're paying for things you forgot you have.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#0f766e" };

const nav = [
  { href: "/start", label: "Start" },
  { href: "/", label: "Upload" },
  { href: "/review", label: "Review" },
  { href: "/report", label: "Report" },
  { href: "/trials", label: "Trials" },
  { href: "/privacy", label: "Privacy" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh">
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-2xl items-center justify-between gap-2 px-4 py-3">
            <Link href="/" className="font-semibold text-brand">🔍 Subscription Detective</Link>
            <nav className="flex flex-wrap justify-end gap-x-3 gap-y-1 text-sm text-slate-600">
              {nav.map((n) => (
                <Link key={n.href} href={n.href} className="hover:text-brand">{n.label}</Link>
              ))}
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-2xl px-4 py-6">{children}</main>
        <footer className="mx-auto max-w-2xl px-4 pb-8 text-xs text-slate-500">
          Your files are deleted right after reading. <Link href="/privacy" className="underline">How we handle your data</Link>.
        </footer>
      </body>
    </html>
  );
}
