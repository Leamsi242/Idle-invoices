import type { Metadata } from "next";
import Link from "next/link";
import UploadForm from "@/components/UploadForm";
import { getMessages } from "@/lib/locale";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { m } = await getMessages();
  return { title: `${m.advanced.metaTitle} · Subscription Detective` };
}

/** Manual import, for testing or when a bank or mailbox cannot be connected. */
export default async function Advanced() {
  const { m } = await getMessages();
  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <h1 className="text-2xl font-bold leading-tight">{m.advanced.title}</h1>
        <p className="text-slate-600">{m.advanced.intro}</p>
        <p className="text-sm">
          <Link href="/start" className="text-brand underline">{m.advanced.checklist}</Link>
        </p>
      </section>
      <div id="upload" className="scroll-mt-4">
        <UploadForm />
      </div>
    </div>
  );
}
