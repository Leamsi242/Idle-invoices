import UploadForm from "@/components/UploadForm";
import Link from "next/link";
import { gmailConfigured } from "@/lib/gmail";
import { getSessionId } from "@/lib/session";
import { getOnboarding } from "@/lib/store";
import { progress } from "@/lib/onboarding";

export const dynamic = "force-dynamic";

const GMAIL_MESSAGES: Record<string, string> = {
  denied: "Gmail access was not granted, nothing was read.",
  error: "The Gmail scan failed. Nothing was kept. Please try again.",
  limit: "You have scanned Gmail several times this hour. Please try again later.",
  unavailable: "Gmail scanning is not available on this server.",
};

export default async function Home({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const q = await searchParams;
  const gmail = q.gmail === "ok"
    ? `Gmail scanned: ${q.scanned ?? 0} emails checked, ${q.receipts ?? 0} receipts kept. Access was revoked right after.`
    : q.gmail ? GMAIL_MESSAGES[q.gmail] : null;
  const { answers, plan } = await getOnboarding(await getSessionId());
  const { done, total } = progress(plan);
  const next = plan.find((i) => i.status === "todo");
  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <h1 className="text-2xl font-bold leading-tight">You&apos;re paying for things you forgot you have.</h1>
        <p className="text-slate-600">
          Upload 3 to 12 months of statements. We find recurring charges, unmask the ones hidden behind PayPal, Apple or
          Paddle, and show what you could stop paying for.
        </p>
      </section>
      {gmail && <p className="rounded-xl bg-white p-4 text-sm shadow-sm">{gmail}</p>}
      {!answers ? (
        <Link href="/start" className="block rounded-xl border border-brand bg-teal-50 p-4 shadow-sm">
          <span className="font-semibold text-brand-dark">Not sure what to upload?</span>
          <span className="block text-sm text-slate-700">Answer 4 quick questions about how you pay and get a checklist, with the steps for your bank, cards, PayPal, app stores and mailboxes.</span>
        </Link>
      ) : (
        next && (
          <Link href="/start" className="block rounded-xl bg-white p-4 text-sm shadow-sm">
            <span className="font-semibold">Checklist: {done} of {total} sources added.</span> Next: {next.title}
          </Link>
        )
      )}
      {gmailConfigured() && (
        <section className="space-y-2 rounded-xl bg-white p-4 shadow-sm">
          <h2 className="font-semibold">Scan my Gmail receipts</h2>
          <p className="text-sm text-slate-600">
            One-time, read-only. We look only at emails from the last year whose subject mentions a receipt, invoice, subscription, renewal or
            trial, keep the amounts and merchants of real receipts, and revoke our access right after. Your emails are never stored.
          </p>
          <a href="/api/gmail/start" className="block rounded-xl border border-brand px-4 py-3 text-center font-semibold text-brand">Connect Gmail and scan</a>
        </section>
      )}
      <div id="upload" className="scroll-mt-4">
        <UploadForm />
      </div>
    </div>
  );
}
