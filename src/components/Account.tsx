"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useI18n } from "./I18n";
import { ACCOUNT_DICTS } from "@/lib/i18n-account";

const field = "w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-ink outline-none focus:border-brand";
const primary = "inline-flex items-center justify-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-on-accent hover:opacity-90 disabled:opacity-50";

/** Asks for a sign-in link. */
export function SignInForm() {
  const { locale } = useI18n();
  const t = ACCOUNT_DICTS[locale];
  const [email, setEmail] = useState("");
  const [state, setState] = useState<{ kind: "idle" | "sending" | "sent" | "error"; message?: string; devLink?: string }>({ kind: "idle" });
  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setState({ kind: "sending" });
        const res = await fetch("/api/auth/request", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) }).catch(() => null);
        const data = (await res?.json().catch(() => null)) as { error?: string; devLink?: string } | null;
        if (res?.ok) return setState({ kind: "sent", message: t.sent(email.trim()), devLink: data?.devLink });
        setState({ kind: "error", message: data?.error === "invalid" ? t.invalid : data?.error === "too-many" ? t.tooMany : t.unavailable });
      }}
    >
      <label className="block space-y-1 text-sm font-medium text-ink-2">
        {t.email}
        <input className={field} type="email" required autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>
      <button type="submit" className={primary} disabled={state.kind === "sending"}>{state.kind === "sending" ? t.sending : t.send}</button>
      {state.message && (
        <p role="status" className={`rounded-2xl p-3 text-sm ${state.kind === "error" ? "bg-leak-soft text-leak" : "bg-save-soft text-ink-2"}`}>{state.message}</p>
      )}
      {state.devLink && (
        <p className="rounded-2xl bg-warn-soft p-3 text-xs text-ink-2">
          {t.devLink} <a className="break-all font-medium text-brand underline" href={state.devLink}>{state.devLink}</a>
        </p>
      )}
    </form>
  );
}

/** Sign out, or delete the account with its data. */
export function AccountActions() {
  const { locale } = useI18n();
  const t = ACCOUNT_DICTS[locale];
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <div className="space-y-3 border-t border-line pt-4">
      <button
        className="rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium text-ink-2 hover:border-brand hover:text-brand disabled:opacity-50"
        disabled={pending}
        onClick={() => start(async () => {
          await fetch("/api/auth/logout", { method: "POST" });
          router.push("/");
          router.refresh();
        })}
      >
        {t.logout}
      </button>
      <p className="text-xs text-muted">{t.logoutHint}</p>
      <button
        className="w-full rounded-2xl border border-leak/30 bg-surface px-4 py-3 text-sm font-semibold text-leak hover:bg-leak-soft disabled:opacity-50"
        disabled={pending}
        onClick={() => {
          if (!confirm(t.deleteConfirm)) return;
          start(async () => {
            await fetch("/api/auth/account", { method: "DELETE" });
            router.push("/");
            router.refresh();
          });
        }}
      >
        {t.deleteAccount}
      </button>
    </div>
  );
}

/**
 * The page the e-mail link opens: says what signing in will do to this browser's findings, then
 * signs in on a click.
 */
export function ConfirmSignIn() {
  const { locale } = useI18n();
  const t = ACCOUNT_DICTS[locale];
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [state, setState] = useState<"checking" | "ready" | "signing" | "expired">("checking");
  const [outcome, setOutcome] = useState<string | null>(null);

  useEffect(() => {
    const value = new URLSearchParams(window.location.hash.slice(1)).get("t");
    // The token leaves the address bar and the history right away.
    history.replaceState(null, "", window.location.pathname);
    if (!value) return setState("expired");
    setToken(value);
    fetch("/api/auth/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: value, check: true }) })
      .then(async (res) => {
        const data = (await res.json().catch(() => null)) as { outcome?: string } | null;
        if (!res.ok) return setState("expired");
        setOutcome(data?.outcome ?? null);
        setState("ready");
      })
      .catch(() => setState("expired"));
  }, []);

  if (state === "expired")
    return (
      <section className="space-y-4 rounded-3xl border border-line bg-surface p-5">
        <h1 className="font-display text-2xl font-semibold">{t.confirmTitle}</h1>
        <p className="text-ink-2">{t.expired}</p>
        <Link href="/account" className={primary}>{t.again}</Link>
      </section>
    );
  return (
    <section className="space-y-4 rounded-3xl border border-line bg-surface p-5">
      <h1 className="font-display text-2xl font-semibold">{t.confirmTitle}</h1>
      <p className="text-ink-2">{t.confirmIntro}</p>
      {outcome === "replace" && <p className="rounded-2xl bg-warn-soft p-3 text-sm text-ink-2">{t.replaceWarning}</p>}
      {outcome === "adopt" && <p className="rounded-2xl bg-save-soft p-3 text-sm text-ink-2">{t.adoptNote}</p>}
      <button
        className={primary}
        disabled={state !== "ready" || !token}
        onClick={async () => {
          setState("signing");
          const res = await fetch("/api/auth/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) }).catch(() => null);
          if (!res?.ok) return setState("expired");
          router.push("/report");
          router.refresh();
        }}
      >
        {state === "signing" ? t.confirming : t.confirm}
      </button>
    </section>
  );
}
