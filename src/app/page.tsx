import Link from "next/link";
import { gmailConfigured } from "@/lib/gmail";
import { outlookConfigured } from "@/lib/outlook";
import { bankingConfigured } from "@/lib/banking";
import { getSessionId } from "@/lib/session";
import { getConnections, getDoubts, getSources, listWatches } from "@/lib/store";
import { WatchControls } from "@/components/Watch";
import { emailConfigured } from "@/lib/notify";
import { BankPicker } from "@/components/Connect";
import { GmailContinue } from "@/components/GmailContinue";
import { CoverageLine, CoverageTimeline } from "@/components/Coverage";
import { Doubts } from "@/components/Doubts";
import { DeleteEverythingButton } from "@/components/Questions";
import { TryDemo } from "@/components/Nav";
import { v3 } from "@/lib/i18n-v3";
import { bankOpenToMe, hasBetaAccess } from "@/lib/beta";
import { BetaCode } from "@/components/BetaCode";
import { buttonClass, Card, Icon, Pill, SectionTitle } from "@/components/ui";
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
          <span className={`flex h-11 w-11 items-center justify-center rounded-2xl ${done ? "bg-brand text-on-accent" : "bg-surface-2 text-ink-2"}`}>
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
  const w = v3(locale);
  const betaNote = q.beta && q.beta in w.beta ? w.beta[q.beta as keyof typeof w.beta] : null;
  const note = betaNote ?? message(q, m);
  // Invitation-only beta: the code is asked before the first real connection, not after a refusal.
  const askCode = q.beta === "code" || !(await hasBetaAccess());
  const sessionId = await getSessionId();
  const [c, watches, sources, doubts] = await Promise.all([getConnections(sessionId), listWatches(sessionId), getSources(sessionId), sessionId ? getDoubts(sessionId, locale) : Promise.resolve([])]);
  const banking = bankingConfigured();
  const bankOpen = banking && (await bankOpenToMe());
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
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">{w.nav.sources}</p>
          <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">{w.srcTitle}</h1>
          <p className="text-muted">{w.srcIntro}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-2 text-sm text-muted">
            {[0, 1, 2].map((i) => <span key={i} className={`h-1.5 w-6 rounded-full ${i < kinds ? "bg-brand" : "bg-line"}`} />)}
            {u.sourcesProgress(kinds)}
          </span>
          {anything ? (
            <Link href="/report" className={buttonClass.small}>{u.openCase} <Icon name="arrow" className="h-4 w-4" /></Link>
          ) : (
            <TryDemo label={w.tryDemo} className={buttonClass.small} />
          )}
        </div>
      </section>

      <ol className="grid gap-3 sm:grid-cols-3">
        {w.steps.map(([title, text], i) => (
          <li key={title} className="rise flex gap-3 rounded-2xl border border-line bg-surface p-4" style={{ animationDelay: `${i * 80}ms` }}>
            <span className="tabular flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-line text-xs font-semibold text-brand">0{i + 1}</span>
            <span>
              <span className="block font-semibold">{title}</span>
              <span className="text-sm text-muted">{text}</span>
            </span>
          </li>
        ))}
      </ol>

      {note && !askCode && <p className="rise rounded-2xl border border-line bg-surface p-4 text-sm shadow-card">{note}</p>}
      {askCode && (
        <div className="rise rounded-2xl border border-line bg-surface p-4 text-sm shadow-card">
          <p>{w.beta.code}</p>
          <BetaCode t={{ codeLabel: w.beta.codeLabel, codeSubmit: w.beta.codeSubmit, codeWrong: w.beta.codeWrong }} />
        </div>
      )}
      {q.gmail === "partial" && <GmailContinue scanned={Number(q.scanned) || 0} total={Number(q.total) || 0} />}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 [&>*]:min-w-0">
        <Tile icon="bank" title={u.banksTitle} done={c.banks.length > 0} m={m}>
          {of("bank").map((x) => <CoverageLine key={x.name} s={x} m={m} locale={locale} />)}
          {watchesFor(c.banks).map((w) => <WatchControls key={w.id} watch={w} emailEnabled={emailConfigured()} />)}
          {banking && !bankOpen ? (
            <p className="text-sm text-muted">{w.beta.owner} <Link href="/advanced#upload" className="text-brand underline">{w.beta.ownerCta}</Link></p>
          ) : banking ? (
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
          {(!banking || bankOpen) && <p className="text-xs text-muted">{h.bankNote}</p>}
        </Tile>

        <div className="grid gap-5">
          <Tile icon="wallet" title={u.paypalTitle} done={wallets.length > 0} m={m}>
            {of("paypal").map((x) => <CoverageLine key={x.name} s={x} m={m} locale={locale} />)}
            {watchesFor(wallets).map((w) => <WatchControls key={w.id} watch={w} emailEnabled={emailConfigured()} />)}
            {wallets.length === 0 && (
              <>
                <p className="text-sm text-muted">{h.paypalHint}</p>
                {bankOpen && <BankPicker initialQuery="PayPal" />}
                {banking && !bankOpen && <Link href="/advanced#upload" className="text-sm text-brand underline">{w.beta.ownerCta}</Link>}
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
            <p className="text-sm text-muted">{w.takeout} <Link href="/advanced#upload" className="text-brand underline">{w.takeoutCta}</Link></p>
            <p className="text-xs text-muted">{h.mailNote}</p>
          </Tile>
        </div>
      </div>

      {doubts.length > 0 && (
        <section id="clarify" className="scroll-mt-24 space-y-2">
          <Doubts doubts={doubts} gmail={gmail} outlook={outlook} banking={bankOpen} />
        </section>
      )}

      {sources.length > 0 && (
        <Card className="space-y-5">
          <SectionTitle title={u.coverage} />
          <p className="-mt-3 text-sm text-muted">{u.coverageIntro}</p>
          <CoverageTimeline sources={sources} m={m} locale={locale} />
          {of("file").length > 0 && <div className="space-y-4">{of("file").map((x) => <CoverageLine key={x.name} s={x} m={m} locale={locale} />)}</div>}
        </Card>
      )}

      <Link href="/advanced" className="flex items-center justify-between gap-3 rounded-3xl border border-line bg-surface px-5 py-4 shadow-card transition hover:border-ink/40">
        <span className="flex items-center gap-3 font-semibold"><Icon name="file" className="h-5 w-5 text-muted" />{w.complete}</span>
        <span className="text-sm text-muted">{w.optional}</span>
      </Link>

      <Card className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <h2 className="font-display text-lg font-semibold tracking-tight">{w.control}</h2>
          <Icon name="shield" className="h-5 w-5 text-brand" />
        </div>
        <p className="text-sm text-muted">{w.controlText}</p>
        <div className="flex flex-wrap gap-2">
          <Link href="/privacy" className={buttonClass.ghost}>{m.footer.how}</Link>
          <a href="/api/export" className={buttonClass.ghost}><Icon name="arrow" className="h-4 w-4 rotate-90" />{w.exportData}</a>
          {anything && <DeleteEverythingButton compact label={w.eraseData} />}
        </div>
      </Card>
    </div>
  );
}
