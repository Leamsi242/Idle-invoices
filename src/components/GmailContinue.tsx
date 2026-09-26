"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "./I18n";

/** Carries on a long Gmail scan part by part, showing how far it has got. */
export function GmailContinue({ scanned, total }: { scanned: number; total: number }) {
  const { m } = useI18n();
  const router = useRouter();
  const [progress, setProgress] = useState({ scanned, total });
  // One loop only: React runs effects twice in development, and two parts at once would read the same emails.
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    (async () => {
      for (;;) {
        const res = await fetch("/api/gmail/continue", { method: "POST" }).catch(() => null);
        const json = res ? await res.json().catch(() => ({})) : {};
        if (!res?.ok) return router.replace(res?.status === 404 ? "/" : "/?gmail=error");
        if (json.done) return router.replace(`/?gmail=ok&scanned=${json.scanned}&receipts=${json.receipts}`);
        setProgress({ scanned: json.scanned, total: json.total });
      }
    })();
  }, [router]);

  return (
    <p className="rounded-xl bg-white p-4 text-sm shadow-sm" role="status" aria-live="polite">
      {m.home.gmailReading(progress.scanned, progress.total)}
    </p>
  );
}
