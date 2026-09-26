import Link from "next/link";
import { gmailConfigured } from "@/lib/gmail";
import { outlookConfigured } from "@/lib/outlook";
import { bankingConfigured } from "@/lib/banking";
import { getSessionId } from "@/lib/session";
import { getConnections, getSources, listWatches } from "@/lib/store";
import { WatchControls } from "@/components/Watch";
import { emailConfigured } from "@/lib/notify";
import { BankPicker } from "@/components/Connect";
import { GmailContinue } from "@/components/GmailContinue";
import { CoverageLine } from "@/components/Coverage";
import { buttonClass, Card, Eyebrow, Icon, Pill } from "@/components/ui";
import { getMessages } from "@/lib/locale";
import type { Messages } from "@/lib/i18n";

export const dynamic = "force-dynamic";

function message(q: Record<string, string | undefined>, m: Messages): string | null {
  const h = m.home;
  const paypal = q.via === "paypal";
  const days = Number(q.days) > 0 ? Number(q.days) : 90;
  if (q.bank === "ok" && paypal) return q.watch === "1" ? h.paypalOkWatch(q.count ?? "0", days) : h.paypalOk(q.count ?? "0");
  if (q.bank === "ok") return q.watch === "1" ? h.bankOkWatch(q.count ?? "0", days) : h.bankOk(q.count ?? "0");
  if (q.bank === "empty" && paypal) return q.accounts === "0" ? h.paypalEmptyNoAccount : h.paypalEmptyNoLines;
  if (q.bank === "empty") return q.accounts === "0" ? h.bankEmptyNoAccount : h.bankEmptyNoLines(Number(q.pending) || 0);
  if (q.gmail === "ok" || q.mail === "ok") return h.mailOk(q.scanned ?? "0", q.receipts ?? "0");
  if (q.gmail === "cut") return h.mailCut(q.scanned ?? "0", q.receipts);
  if (q.bank === "error" && q.reason) return `${h.messages.bank.error} ${h.bankErrorCode(q.reason.replace(/[^A-Z_]/g, "").slice(0, 60))}`;
  for (const key of ["bank", "gmail", "mail"]) if (q[key] && h.messages[key][q[key]!]) return h.messages[key][q[key]!];
  return null;
}

function Tile({ icon, title, done, m, children }: { icon: "bank" | "wallet" | "mail"; title: string; done: boolean; m: Messages; children: React.ReactNode }) {
  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className={`flex h-11 w-11 items-center justify-center rounded-2xl ${done ? "bg-brand text-white" : "bg-surface-2 text-ink-2"}`}>
            <Icon name={icon} className="h-[22px] w-[22px]" />
          </span>
          <h2 className="font-display text-lg font-semibold tracking-tight">{title}</h2>
        </div>
        {done ? <Pill tone="save"><Icon name="check" className="h-3.5 w-3.5" />{m.ui.connected}</Pill> : <Pill>{m.ui.toConnect}</Pill>}
      </div>
      {children}
    </Card>
  );
}

export default async function Home({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const q = await searchParams;
  const { m, locale } = await getMessages();
  const h = m.home;
  const u = m.ui;
  const note = message(q, m);
  const sessionId = await getSessionId();
  const [c, watches, sources] = await Promise.all([getConnections(sessionId), listWatches(sessionId), getSources(sessionId)]);
  const banking = bankingConfigured();
  const gmail = gmailConfigured();
  const outlook = outlookConfigured();
  const wallets = c.wallets ?? [];
  const anything = c.banks.length + wallets.length + c.mailboxes.length + c.files > 0;
  const pickBank = q.bank && q.bank !== "ok" && q.bank !== "empty" && !h.messages.bank[q.bank] ? q.bank : "";
  const kinds = [c.banks.length > 0, wallets.length > 0, c.mailboxes.length > 0].filter(Boolean).length;
  const of = (kind: string) => sources.filter((x) => x.kind === kind);
  const watchesFor = (names: string[]) => watches.filter((w) => names.includes(w.institution));

  return (
    <div className="space-y-6">
      <section className="spotlight grain relative overflow-hidden rounded-[28px] px-6 py-8 text-white sm:px-10 sm:py-12">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60">{u.sourcesTitle}</p>
        <h1 className="mt-2 max-w-2xl font-display text-3xl font-semibold leading-[1.1] tracking-tight sm:text-5xl">{m.tagline}</h1>
        <p className="mt-3 max-w-xl text-white/75">{h.intro}</p>
        <div className="mt-6 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            {[0, 1, 2].map((i) => <span key={i} className={`h-2 w-8 rounded-full ${i < kinds ? "bg-white" : "bg-white/20"}`} />)}
            <span className="ml-1 text-sm text-white/75">{u.sourcesProgress(kinds)}</span>
          </div>
          {anything && (
            <Link href="/report" className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-2.5 font-semibold text-night transition hover:opacity-90">
              {u.openCase} <Icon name="arrow" className="h-4 w-4" />
            </Link>
          )}
        </div>
      </section>

      {note && <p className="rise rounded-2xl border border-line bg-surface p-4 text-sm shadow-card">{note}</p>}
      {q.gmail === "partial" && <GmailContinue scanned={Number(q.scanned) || 0} total={Number(q.total) || 0} />}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 [&>*]:min-w-0">
        <Tile icon="bank" title={u.banksTitle} done={c.banks.length > 0} m={m}>
          {of("bank").map((x) => <CoverageLine key={x.name} s={x} m={m} locale={locale} />)}
          {watchesFor(c.banks).map((w) => <WatchControls key={w.id} watch={w} emailEnabled={emailConfigured()} />)}
          {banking ? (
            c.banks.length > 0 && !pickBank ? (
              <details id="bank" className="group rounded-2xl bg-surface-2 p-3">
                <summary className="flex items-center gap-1 text-sm font-medium text-brand"><Icon name="chevron" className="chev h-4 w-4" />{h.addAnother}</summary>
                <div className="mt-3"><BankPicker /></div>
              </details>
            ) : (
              <div id="bank" className="scroll-mt-24"><BankPicker key={pickBank || "none"} initialQuery={pickBank} /></div>
            )
          ) : (
            <p className="text-sm text-muted">{h.bankNotSetUp} <Link href="/advanced" className="text-brand underline">{h.importStatement}</Link> {h.instead}</p>
          )}
          <p className="text-xs text-muted">{h.bankNote}</p>
        </Tile>

        <div className="grid gap-5">
          <Tile icon="wallet" title={u.paypalTitle} done={wallets.length > 0} m={m}>
            {of("paypal").map((x) => <CoverageLine key={x.name} s={x} m={m} locale={locale} />)}
            {watchesFor(wallets).map((w) => <WatchControls key={w.id} watch={w} emailEnabled={emailConfigured()} />)}
            {wallets.length === 0 && (
              <>
                <p className="text-sm text-muted">{h.paypalHint}</p>
                {banking && <BankPicker initialQuery="PayPal" />}
              </>
            )}
          </Tile>

          <Tile icon="mail" title={u.mailTitle} done={c.mailboxes.length > 0 && q.gmail !== "partial"} m={m}>
            {of("mail").map((x) => <CoverageLine key={x.name} s={x} m={m} locale={locale} />)}
            {c.mailboxes.length === 0 && <p className="text-sm text-muted">{h.mailWhy}</p>}
            <div className="flex flex-wrap gap-2">
              {gmail && <a href="/api/gmail/start" className={c.mailboxes.length ? buttonClass.ghost : buttonClass.small}><Icon name="mail" className="h-4 w-4" />Gmail</a>}
              {outlook && <a href="/api/outlook/start" className={c.mailboxes.length ? buttonClass.ghost : buttonClass.small}><Icon name="mail" className="h-4 w-4" />Outlook / Hotmail</a>}
              {!gmail && !outlook && <span className="text-sm text-muted">{h.mailNotSetUp}</span>}
            </div>
            <p className="text-xs text-muted">{h.mailNote}</p>
          </Tile>
        </div>
      </div>

      {of("file").length > 0 && (
        <Card className="space-y-3">
          <Eyebrow>{m.footer.advanced}</Eyebrow>
          {of("file").map((x) => <CoverageLine key={x.name} s={x} m={m} locale={locale} />)}
        </Card>
      )}

      {anything ? (
        <Link href="/report" className={`${buttonClass.primary} w-full py-4 text-base`}>{u.openCase} <Icon name="arrow" className="h-5 w-5" /></Link>
      ) : (
        <p className="rounded-2xl bg-surface-2 px-4 py-3 text-center text-sm text-muted">{h.reportSoon}</p>
      )}
      <p className="text-center text-sm">
        <Link href="/advanced" className="text-muted underline decoration-line underline-offset-4 hover:text-ink">{h.advancedLink}</Link>
      </p>
    </div>
  );
}
