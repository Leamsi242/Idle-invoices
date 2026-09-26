"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "./I18n";

type Progress = { scanned: number; total: number };
type Outcome = { done: true; scanned?: number; receipts?: number; cut?: boolean; gone?: boolean } | { failed: true };

/**
 * One scan loop per page load, shared by every mount of the component: React mounts twice in
 * development, and two parts at once would read the same emails.
 */
let loop: { listeners: Set<(p: Progress) => void>; result: Promise<Outcome>; stopped: boolean } | null = null;
let stopTimer: ReturnType<typeof setTimeout> | undefined;

function startLoop(): NonNullable<typeof loop> {
  const listeners = new Set<(p: Progress) => void>();
  const current = { listeners, stopped: false, result: Promise.resolve<Outcome>({ failed: true }) };
  current.result = (async (): Promise<Outcome> => {
    for (;;) {
      const res = await fetch("/api/gmail/continue", { method: "POST" }).catch(() => null);
      const json = res ? await res.json().catch(() => ({})) : {};
      if (!res?.ok) return { failed: true };
      if (json.done) return json;
      if (current.stopped) return { failed: true };
      listeners.forEach((l) => l({ scanned: json.scanned, total: json.total }));
    }
  })();
  return current;
}

/** Leaving the page ends the scan: its access is revoked at once, what was read is kept. */
function stopScan() {
  if (loop) loop.stopped = true;
  navigator.sendBeacon?.("/api/gmail/cancel");
}

/** Carries on a long Gmail scan part by part, showing how far it has got. */
export function GmailContinue({ scanned, total }: { scanned: number; total: number }) {
  const { m } = useI18n();
  const router = useRouter();
  const [progress, setProgress] = useState<Progress>({ scanned, total });
  const latest = useRef(progress);

  useEffect(() => {
    const show = (p: Progress) => {
      latest.current = p;
      setProgress(p);
    };
    clearTimeout(stopTimer);
    loop ??= startLoop();
    const current = loop;
    let mounted = true;
    current.listeners.add(show);
    current.result.then((r) => {
      if (!mounted || current !== loop) return;
      loop = null;
      // Stopped without an answer: the emails read so far are kept, their receipts count is unknown here.
      if ("failed" in r) return router.replace(`/?gmail=cut&scanned=${latest.current.scanned}`);
      if (r.gone) return router.replace("/");
      router.replace(`/?gmail=${r.cut ? "cut" : "ok"}&scanned=${r.scanned ?? 0}&receipts=${r.receipts ?? 0}`);
    });
    window.addEventListener("pagehide", stopScan);
    return () => {
      mounted = false;
      current.listeners.delete(show);
      window.removeEventListener("pagehide", stopScan);
      // A real departure (not React's development remount): stop shortly after.
      stopTimer = setTimeout(() => {
        if (loop === current) {
          stopScan();
          loop = null;
        }
      }, 500);
    };
  }, [router]);

  return (
    <p className="rounded-xl bg-white p-4 text-sm shadow-sm" role="status" aria-live="polite">
      {m.home.gmailReading(progress.scanned, progress.total)}
    </p>
  );
}
