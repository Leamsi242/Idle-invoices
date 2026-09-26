import Link from "next/link";
import { gmailConfigured } from "@/lib/gmail";
import { outlookConfigured } from "@/lib/outlook";
import { bankingConfigured } from "@/lib/banking";
import { getSessionId } from "@/lib/session";
import { getConnections, listWatches } from "@/lib/store";
import { WatchControls } from "@/components/Watch";
import { emailConfigured } from "@/lib/notify";
import { BankPicker } from "@/components/Connect";
import { getMessages } from "@/lib/locale";
import type { Messages } from "@/lib/i18n";

export const dynamic = "force-dynamic";

function message(q: Record<string, string | undefined>, m: Messages): string | null {
  const h = m.home;
  if (q.bank === "ok") return q.watch === "1" ? h.bankOkWatch(q.count ?? "0") : h.bankOk(q.count ?? "0");
  if (q.bank === "empty") return q.accounts === "0" ? h.bankEmptyNoAccount : h.bankEmptyNoLines(Number(q.pending) || 0);
  if (q.gmail === "ok" || q.mail === "ok") return h.mailOk(q.scanned ?? "0", q.receipts ?? "0");
  if (q.bank === "error" && q.reason) return `${h.messages.bank.error} ${h.bankErrorCode(q.reason.replace(/[^A-Z_]/g, "").slice(0, 60))}`;
  for (const key of ["bank", "gmail", "mail"]) if (q[key] && h.messages[key][q[key]!]) return h.messages[key][q[key]!];
  return null;
}

function Step({ n, title, done, children }: { n: number; title: string; done: boolean; children: React.ReactNode }) {
  return (
    <section className="space-y-3 rounded-xl bg-white p-4 shadow-sm">
      <h2 className="flex items-center gap-2 font-semibold">
        <span className={`flex h-6 w-6 items-center justify-center rounded-full text-sm ${done ? "bg-brand text-white" : "bg-slate-200"}`}>{done ? "✓" : n}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

export default async function Home({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const q = await searchParams;
  const { m } = await getMessages();
  const h = m.home;
  const note = message(q, m);
  const sessionId = await getSessionId();
  const [c, watches] = await Promise.all([getConnections(sessionId), listWatches(sessionId)]);
  const banking = bankingConfigured();
  const gmail = gmailConfigured();
  const outlook = outlookConfigured();
  const anything = c.banks.length + c.mailboxes.length + c.files > 0;
  const pickBank = q.bank && q.bank !== "ok" && q.bank !== "empty" && !h.messages.bank[q.bank] ? q.bank : "";

  return (
    <div className="space-y-5">
      <section className="space-y-2">
        <h1 className="text-2xl font-bold leading-tight">{m.tagline}</h1>
        <p className="text-slate-600">{h.intro}</p>
      </section>
      {note && <p className="rounded-xl bg-white p-4 text-sm shadow-sm">{note}</p>}

      <Step n={1} title={h.step1} done={c.banks.length > 0}>
        {c.banks.length > 0 && (
          <ul className="text-sm text-slate-700">
            {c.banks.map((b) => <li key={b}>✓ {b}{m.lang === "fr" ? " : " : ": "}{watches.some((w) => w.institution === b) ? h.bankWatched : h.bankDone}</li>)}
          </ul>
        )}
        {watches.map((w) => <WatchControls key={w.id} watch={w} emailEnabled={emailConfigured()} />)}
        {banking ? (
          c.banks.length > 0 && !pickBank ? (
            <details id="bank">
              <summary className="cursor-pointer text-sm font-medium text-brand">{h.addAnother}</summary>
              <div className="mt-3"><BankPicker /></div>
            </details>
          ) : (
            <div id="bank" className="scroll-mt-4"><BankPicker initialQuery={pickBank} /></div>
          )
        ) : (
          <p className="text-sm text-slate-500">{h.bankNotSetUp} <Link href="/advanced" className="text-brand underline">{h.importStatement}</Link> {h.instead}</p>
        )}
        <p className="text-xs text-slate-500">{h.bankNote}</p>
      </Step>

      <Step n={2} title={h.step2} done={c.mailboxes.length > 0}>
        {c.mailboxes.length > 0 && <p className="text-sm text-slate-700">✓ {c.mailboxes.join(", ")}{m.lang === "fr" ? " : " : ": "}{h.mailDone}</p>}
        <p className="text-sm text-slate-600">{h.mailWhy}</p>
        <div className="flex flex-wrap gap-2">
          {gmail && <a href="/api/gmail/start" className="rounded-xl border border-brand px-4 py-2 font-semibold text-brand">Gmail</a>}
          {outlook && <a href="/api/outlook/start" className="rounded-xl border border-brand px-4 py-2 font-semibold text-brand">Outlook / Hotmail</a>}
          {!gmail && !outlook && <span className="text-sm text-slate-500">{h.mailNotSetUp}</span>}
        </div>
        <p className="text-xs text-slate-500">{h.mailNote}</p>
      </Step>

      {anything ? (
        <Link href="/report" className="block rounded-xl bg-brand px-4 py-3 text-center font-semibold text-white">{h.seeReport}</Link>
      ) : (
        <p className="rounded-xl bg-slate-100 px-4 py-3 text-center text-sm text-slate-600">{h.reportSoon}</p>
      )}
      <p className="text-center text-sm">
        <Link href="/advanced" className="text-slate-500 underline">{h.advancedLink}</Link>
      </p>
    </div>
  );
}
