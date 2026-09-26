import Link from "next/link";
import UploadForm from "@/components/UploadForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Advanced import · Subscription Detective" };

/** Manual import, for testing or when a bank or mailbox cannot be connected. */
export default function Advanced() {
  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <h1 className="text-2xl font-bold leading-tight">Advanced: import files</h1>
        <p className="text-slate-600">
          You don&apos;t need this if your bank and mailbox are connected. Use it to add what a connection cannot reach: a statement from a
          bank that is not listed, a PayPal export, an app store screenshot, a receipt.
        </p>
        <p className="text-sm">
          <Link href="/start" className="text-brand underline">Checklist of what can be imported, and how</Link>
        </p>
      </section>
      <div id="upload" className="scroll-mt-4">
        <UploadForm />
      </div>
    </div>
  );
}
