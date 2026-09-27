import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";
import { getMessages } from "@/lib/locale";
import { v3 } from "@/lib/i18n-v3";
import { I18nProvider } from "@/components/I18n";
import { LangSwitch } from "@/components/LangSwitch";
import { QuitDemo, SideNav, TabBar, type NavItem } from "@/components/Nav";
import { Icon, Logo } from "@/components/ui";
import { getSessionId } from "@/lib/session";
import { subscriptionsForRequest } from "@/lib/store";
import { statusOf } from "@/lib/engagements";
import { inDemo } from "@/lib/demo-mode";

export async function generateMetadata(): Promise<Metadata> {
  const { m } = await getMessages();
  return { title: m.appTitle, description: m.tagline };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f7f9" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0b10" },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { locale, m } = await getMessages();
  const w = v3(locale);
  const sessionId = await getSessionId();
  const [subs, demo] = await Promise.all([sessionId ? subscriptionsForRequest(sessionId) : Promise.resolve([]), inDemo()]);
  const todo = subs.filter((s) => statusOf(s) === "todo" || statusOf(s) === "idle").length;
  const nav: NavItem[] = [
    { href: "/report", label: w.nav.overview, icon: "home" },
    { href: "/subscriptions", label: w.nav.subs, icon: "list", badge: todo },
    { href: "/calendar", label: w.nav.calendar, icon: "calendar" },
    { href: "/", label: w.nav.sources, icon: "bank" },
  ];
  return (
    <html lang={locale}>
      <body className="min-h-dvh">
        <I18nProvider locale={locale}>
          <div className="lg:grid lg:grid-cols-[260px_1fr]">
            <div className="hidden border-r border-line bg-surface lg:block">
            <aside className="sticky top-0 flex h-dvh flex-col gap-6 px-4 py-6">
              <Link href="/report" className="flex items-center gap-2.5 px-2">
                <Logo className="h-9 w-9" id="lg-side" />
                <span className="leading-tight">
                  <span className="block font-display text-[17px] font-semibold tracking-tight">Subscription <span className="text-brand">Detective</span></span>
                </span>
              </Link>
              <div className="flex items-center gap-3 rounded-2xl border border-line px-3 py-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-soft text-brand"><Icon name="shield" className="h-4 w-4" /></span>
                <span className="text-xs leading-tight">
                  <span className="block font-semibold text-ink">{w.space}</span>
                  <span className="text-muted">{w.spaceHint}</span>
                </span>
                <span className="ml-auto h-2 w-2 rounded-full bg-save" />
              </div>
              <SideNav items={nav} />
              <div className="mt-auto space-y-4">
                <div className="rounded-2xl bg-surface-2 p-4 text-xs">
                  <Icon name="shield" className="h-5 w-5 text-brand" />
                  <p className="mt-2 font-semibold text-ink">{w.privacyTitle}</p>
                  <p className="mt-1 text-muted">{w.privacyText}</p>
                </div>
                <p className="flex flex-wrap gap-x-3 gap-y-1 px-2 text-xs text-muted">
                  <Link href="/privacy" className="hover:text-ink">{m.nav.privacy}</Link>
                  <Link href="/advanced" className="hover:text-ink">{m.footer.advanced}</Link>
                  <LangSwitch />
                </p>
              </div>
            </aside>
            </div>
            <div className="min-w-0">
              <header className="sticky top-0 z-30 border-b border-line/70 bg-bg/80 backdrop-blur-xl lg:hidden">
                <div className="flex items-center justify-between gap-3 px-4 py-3">
                  <Link href="/report" className="flex items-center gap-2.5">
                    <Logo id="lg-top" />
                    <span className="font-display text-[17px] font-semibold tracking-tight">Subscription <span className="text-brand">Detective</span></span>
                  </Link>
                  <LangSwitch />
                </div>
              </header>
              {demo && (
                <div className="flex flex-wrap items-center justify-between gap-2 bg-brand px-4 py-2 text-xs text-white sm:px-8">
                  <span><span className="font-semibold uppercase tracking-widest">Demo</span> · {w.demoBanner}</span>
                  <QuitDemo label={w.quitDemo} />
                </div>
              )}
              <main className="mx-auto max-w-6xl px-4 pb-28 pt-6 sm:px-8 lg:pb-12 lg:pt-10">{children}</main>
              <footer className="mx-auto max-w-6xl px-4 pb-28 text-xs text-muted sm:px-8 lg:hidden">
                <p className="flex flex-wrap gap-x-3 gap-y-1">
                  <span>{m.ui.footerMade}</span>
                  <Link href="/privacy" className="underline decoration-line underline-offset-4">{m.footer.how}</Link>
                  <Link href="/advanced" className="underline decoration-line underline-offset-4">{m.footer.advanced}</Link>
                </p>
              </footer>
            </div>
          </div>
          <TabBar items={nav} />
        </I18nProvider>
      </body>
    </html>
  );
}
