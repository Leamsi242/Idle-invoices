import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";
import { getMessages } from "@/lib/locale";
import { I18nProvider } from "@/components/I18n";
import { LangSwitch } from "@/components/LangSwitch";
import { Nav, TabBar } from "@/components/Nav";
import { Logo } from "@/components/ui";

export async function generateMetadata(): Promise<Metadata> {
  const { m } = await getMessages();
  return { title: m.appTitle, description: m.tagline };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f3ef" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0b10" },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { locale, m } = await getMessages();
  const nav = [
    { href: "/report", label: m.nav.report, icon: "lens" as const },
    { href: "/review", label: m.nav.review, icon: "check" as const },
    { href: "/", label: m.nav.connect, icon: "bank" as const },
    { href: "/trials", label: m.nav.trials, icon: "hourglass" as const },
  ];
  return (
    <html lang={locale}>
      <body className="min-h-dvh">
        <I18nProvider locale={locale}>
          <header className="sticky top-0 z-30 border-b border-line/70 bg-bg/80 backdrop-blur-xl">
            <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
              <Link href="/report" className="flex items-center gap-2.5">
                <Logo />
                <span className="font-display text-[17px] font-semibold tracking-tight">
                  Subscription <span className="text-brand">Detective</span>
                </span>
              </Link>
              <Nav items={nav} />
            </div>
          </header>
          <main className="mx-auto max-w-5xl px-4 pb-28 pt-6 sm:pb-12">{children}</main>
          <footer className="mx-auto max-w-5xl px-4 pb-28 text-xs text-muted sm:pb-10">
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span>{m.ui.footerMade}</span>
              <Link href="/privacy" className="underline decoration-line underline-offset-4 hover:text-ink">{m.footer.how}</Link>
              <Link href="/advanced" className="underline decoration-line underline-offset-4 hover:text-ink">{m.footer.advanced}</Link>
              <LangSwitch />
            </p>
          </footer>
          <TabBar items={nav} />
        </I18nProvider>
      </body>
    </html>
  );
}
