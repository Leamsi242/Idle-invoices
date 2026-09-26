import Link from "next/link";
import { gmailConfigured } from "@/lib/gmail";
import { outlookConfigured } from "@/lib/outlook";
import { bankingConfigured } from "@/lib/banking";
import { getSessionId } from "@/lib/session";
import { getConnections } from "@/lib/store";
import { BankPicker } from "@/components/Connect";

export const dynamic = "force-dynamic";

const MESSAGES: Record<string, Record<string, string>> = {
  bank: {
    denied: "The bank connection was cancelled. Nothing was read.",
    expired: "The bank connection took too long. Please try again.",
    error: "We could not read your bank this time. Nothing was kept. Please try again.",
  },
  gmail: {
    denied: "Gmail access was not granted, nothing was read.",
    error: "The Gmail scan failed. Nothing was kept. Please try again.",
    limit: "You have scanned Gmail several times this hour. Please try again later.",
    unavailable: "Gmail scanning is not available on this server.",
  },
  mail: {
    denied: "Mailbox access was not granted, nothing was read.",
    error: "The mailbox scan failed. Nothing was kept. Please try again.",
    limit: "You have scanned your mailbox several times this hour. Please try again later.",
    unavailable: "Outlook scanning is not available on this server.",
  },
};

function message(q: Record<string, string | undefined>): string | null {
  if (q.bank === "ok") return `Bank read: ${q.count ?? 0} transactions. The access is already closed.`;
  if (q.gmail === "ok" || q.mail === "ok") return `Mailbox read: ${q.scanned ?? 0} emails checked, ${q.receipts ?? 0} receipts kept. Access closed right after.`;
  if (q.bank === "error" && q.reason) return `${MESSAGES.bank.error} (Bank error: ${q.reason.replace(/[^A-Z_]/g, "").slice(0, 60)})`;
  for (const key of ["bank", "gmail", "mail"]) if (q[key] && MESSAGES[key][q[key]!]) return MESSAGES[key][q[key]!];
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
  const note = message(q);
  const c = await getConnections(await getSessionId());
  const banking = bankingConfigured();
  const gmail = gmailConfigured();
  const outlook = outlookConfigured();
  const anything = c.banks.length + c.mailboxes.length + c.files > 0;
  const pickBank = q.bank && q.bank !== "ok" && !MESSAGES.bank[q.bank] ? q.bank : "";

  return (
    <div className="space-y-5">
      <section className="space-y-2">
        <h1 className="text-2xl font-bold leading-tight">You&apos;re paying for things you forgot you have.</h1>
        <p className="text-slate-600">
          Connect your bank and your mailbox, read-only. We find every subscription, unmask the ones hidden behind PayPal or the app stores,
          and show what you could stop paying for. About two minutes.
        </p>
      </section>
      {note && <p className="rounded-xl bg-white p-4 text-sm shadow-sm">{note}</p>}

      <Step n={1} title="Connect your bank" done={c.banks.length > 0}>
        {c.banks.length > 0 && (
          <ul className="text-sm text-slate-700">
            {c.banks.map((b) => <li key={b}>✓ {b}: read, access closed</li>)}
          </ul>
        )}
        {banking ? (
          c.banks.length > 0 && !pickBank ? (
            <details id="bank">
              <summary className="cursor-pointer text-sm font-medium text-brand">Add another bank or a card (Amex...)</summary>
              <div className="mt-3"><BankPicker /></div>
            </details>
          ) : (
            <div id="bank" className="scroll-mt-4"><BankPicker initialQuery={pickBank} /></div>
          )
        ) : (
          <p className="text-sm text-slate-500">Bank connection is not set up on this server yet. You can <Link href="/advanced" className="text-brand underline">import a statement</Link> instead.</p>
        )}
        <p className="text-xs text-slate-500">
          You sign in on your bank&apos;s own page. We never see your password and cannot move money: the access is read-only, used once,
          then closed.
        </p>
      </Step>

      <Step n={2} title="Connect your mailbox" done={c.mailboxes.length > 0}>
        {c.mailboxes.length > 0 && <p className="text-sm text-slate-700">✓ {c.mailboxes.join(", ")}: receipts read, access closed</p>}
        <p className="text-sm text-slate-600">Receipts name the real service behind PayPal and app store charges, and catch trials about to turn paid.</p>
        <div className="flex flex-wrap gap-2">
          {gmail && <a href="/api/gmail/start" className="rounded-xl border border-brand px-4 py-2 font-semibold text-brand">Gmail</a>}
          {outlook && <a href="/api/outlook/start" className="rounded-xl border border-brand px-4 py-2 font-semibold text-brand">Outlook / Hotmail</a>}
          {!gmail && !outlook && <span className="text-sm text-slate-500">Mailbox connection is not set up on this server yet.</span>}
        </div>
        <p className="text-xs text-slate-500">We only open emails that look like receipts, keep the amount and the service, and never store the emails.</p>
      </Step>

      {anything ? (
        <Link href="/report" className="block rounded-xl bg-brand px-4 py-3 text-center font-semibold text-white">See my report</Link>
      ) : (
        <p className="rounded-xl bg-slate-100 px-4 py-3 text-center text-sm text-slate-600">Your report appears as soon as your bank or mailbox is connected.</p>
      )}
      <p className="text-center text-sm">
        <Link href="/advanced" className="text-slate-500 underline">Advanced: import files instead</Link>
      </p>
    </div>
  );
}
