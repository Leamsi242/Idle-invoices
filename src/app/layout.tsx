import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";
import { getMessages } from "@/lib/locale";
import { I18nProvider } from "@/components/I18n";
import { LangSwitch } from "@/components/LangSwitch";

export async function generateMetadata(): Promise<Metadata> {
  const { m } = await getMessages();
  return { title: m.appTitle, description: m.tagline };
}

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#0f766e" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { locale, m } = await getMessages();
  const nav = [
    { href: "/", label: m.nav.connect },
    { href: "/review", label: m.nav.review },
    { href: "/report", label: m.nav.report },
    { href: "/trials", label: m.nav.trials },
    { href: "/privacy", label: m.nav.privacy },
  ];
  return (
    <html lang={locale}>
      <body className="min-h-dvh">
        <I18nProvider locale={locale}>
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
            {m.footer.readOnly} <Link href="/privacy" className="underline">{m.footer.how}</Link> ·{" "}
            <Link href="/advanced" className="underline">{m.footer.advanced}</Link> · <LangSwitch />
          </footer>
        </I18nProvider>
      </body>
    </html>
  );
}
