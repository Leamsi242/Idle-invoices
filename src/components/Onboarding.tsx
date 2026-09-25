"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BANKS, CARDS, MAILBOXES, OTHER, STORES, WALLETS, type Answers, type Choice, type PlanItem } from "@/lib/onboarding";

type ListKey = Exclude<keyof Answers, "done">;

const STEPS: { title: string; intro: string; groups: { key: ListKey; label: string; choices: Choice[] }[] }[] = [
  {
    title: "How do you pay?",
    intro: "Every subscription ends up on an account or a card. Pick all the ones you use, even rarely.",
    groups: [
      { key: "banks", label: "Bank accounts", choices: BANKS },
      { key: "cards", label: "Cards with their own statement", choices: CARDS },
    ],
  },
  {
    title: "Payment apps and stores",
    intro: "These hide the real service behind their own name on a statement (\"PAYPAL\", \"APPLE.COM/BILL\").",
    groups: [
      { key: "wallets", label: "Payment apps", choices: WALLETS },
      { key: "stores", label: "App stores and memberships", choices: STORES },
    ],
  },
  {
    title: "Where do your receipts arrive?",
    intro: "Receipts name the service, the plan and the next renewal. Pick every address you use for purchases.",
    groups: [{ key: "mailboxes", label: "Mailboxes", choices: MAILBOXES }],
  },
  {
    title: "Anything else?",
    intro: "Some services are billed where nobody looks.",
    groups: [{ key: "other", label: "Other ways you pay", choices: OTHER }],
  },
];

function Chip({ choice, on, toggle }: { choice: Choice; on: boolean; toggle: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={toggle}
      className={`rounded-xl border px-3 py-2 text-left text-sm ${on ? "border-brand bg-teal-50 text-brand-dark" : "border-slate-300 bg-white hover:border-brand"}`}
    >
      <span className="font-medium">{on ? "✓ " : ""}{choice.label}</span>
      {choice.hint && <span className="block text-xs text-slate-500">{choice.hint}</span>}
    </button>
  );
}

export function OnboardingQuestions({ initial }: { initial: Answers }) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Answers>(initial);
  const [step, setStep] = useState(0);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const current = STEPS[step];
  const last = step === STEPS.length - 1;

  const toggle = (key: ListKey, id: string) =>
    setAnswers((a) => ({ ...a, [key]: a[key].includes(id) ? a[key].filter((x) => x !== id) : [...a[key], id] }));

  const save = () =>
    start(async () => {
      setError(null);
      const res = await fetch("/api/onboarding", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(answers) });
      if (!res.ok) {
        setError("Could not save your answers. Please try again.");
        return;
      }
      router.push("/start");
      router.refresh();
    });

  return (
    <section className="space-y-4 rounded-xl bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between text-sm text-slate-500">
        <span>Step {step + 1} of {STEPS.length}</span>
        <div className="flex gap-1" aria-hidden>
          {STEPS.map((_, i) => <span key={i} className={`h-1.5 w-8 rounded-full ${i <= step ? "bg-brand" : "bg-slate-200"}`} />)}
        </div>
      </div>
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">{current.title}</h2>
        <p className="text-sm text-slate-600">{current.intro}</p>
      </div>
      {current.groups.map((g) => (
        <fieldset key={g.key} className="space-y-2">
          <legend className="text-sm font-medium text-slate-700">{g.label}</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {g.choices.map((c) => <Chip key={c.id} choice={c} on={answers[g.key].includes(c.id)} toggle={() => toggle(g.key, c.id)} />)}
          </div>
        </fieldset>
      ))}
      {error && <p className="text-sm text-red-700">{error}</p>}
      <div className="flex gap-2">
        {step > 0 && (
          <button type="button" onClick={() => setStep(step - 1)} className="rounded-xl border border-slate-300 px-4 py-3 font-semibold">
            Back
          </button>
        )}
        <button
          type="button"
          disabled={pending}
          onClick={() => (last ? save() : setStep(step + 1))}
          className="flex-1 rounded-xl bg-brand px-4 py-3 font-semibold text-white disabled:opacity-40"
        >
          {last ? (pending ? "Saving…" : "See my checklist") : "Next"}
        </button>
      </div>
      <p className="text-xs text-slate-500">
        We only keep these choices (no account number, no password), encrypted, and delete them with the rest of your data.
      </p>
    </section>
  );
}

const BADGE: Record<PlanItem["status"], { text: string; className: string }> = {
  todo: { text: "To add", className: "bg-amber-100 text-amber-800" },
  optional: { text: "Worth checking", className: "bg-slate-100 text-slate-700" },
  done: { text: "Done", className: "bg-teal-100 text-teal-800" },
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="rounded-full border border-slate-300 bg-white px-3 py-1 text-sm hover:border-brand"
      onClick={async () => {
        await navigator.clipboard.writeText(text).catch(() => {});
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
    >
      {copied ? "Copied" : "Copy the email"}
    </button>
  );
}

export function Checklist({ plan, ticked, gmail, gdpr }: { plan: PlanItem[]; ticked: string[]; gmail: boolean; gdpr: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const tick = (itemId: string, done: boolean) =>
    start(async () => {
      await fetch("/api/onboarding", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ itemId, done }) });
      router.refresh();
    });

  return (
    <ul className="space-y-3">
      {plan.map((i) => (
        <li key={i.id}>
          <article className={`space-y-2 rounded-xl bg-white p-4 shadow-sm ${i.status === "done" ? "opacity-75" : ""}`}>
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-medium">{i.title}</h3>
              <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs ${BADGE[i.status].className}`}>{BADGE[i.status].text}</span>
            </div>
            {i.detected && <p className="text-xs font-medium text-brand">Found in your statements</p>}
            <p className="text-sm text-slate-600">{i.why}</p>
            {i.alert && <p className="rounded-lg bg-amber-50 p-2 text-sm text-amber-800">{i.alert}</p>}
            <details className="rounded-lg bg-slate-50 p-3 text-sm" open={i.status === "todo"}>
              <summary className="cursor-pointer font-medium text-brand">How to get it ({i.accepts})</summary>
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-slate-700">
                {i.steps.map((s) => <li key={s}>{s}</li>)}
              </ol>
              {i.action === "gdpr" && (
                <details className="mt-3 rounded-lg bg-white p-3">
                  <summary className="cursor-pointer font-medium">Email to ask PayPal for your full history</summary>
                  <pre className="mt-2 whitespace-pre-wrap text-xs text-slate-700">{gdpr}</pre>
                  <div className="mt-2"><CopyButton text={gdpr} /></div>
                  <p className="mt-2 text-xs text-slate-500">Send it from the email address of your PayPal account, through PayPal&apos;s help centre (Contact us) or its data protection officer.</p>
                </details>
              )}
            </details>
            <div className="flex flex-wrap items-center gap-2">
              {i.status !== "done" && i.action === "gmail" && gmail && (
                <a href="/api/gmail/start" className="rounded-full bg-brand px-3 py-1 text-sm font-medium text-white">Connect Gmail and scan</a>
              )}
              {i.status !== "done" && (i.action === "upload" || i.action === "paste" || i.action === "gdpr" || (i.action === "gmail" && !gmail)) && (
                <Link href="/#upload" className="rounded-full bg-brand px-3 py-1 text-sm font-medium text-white">
                  {i.action === "paste" ? "Add a screenshot or paste" : "Upload"}
                </Link>
              )}
              {ticked.includes(i.id) ? (
                <button type="button" disabled={pending} onClick={() => tick(i.id, false)} className="text-sm text-slate-500 underline">Undo</button>
              ) : (
                i.status !== "done" && (
                  <button type="button" disabled={pending} onClick={() => tick(i.id, true)} className="rounded-full border border-slate-300 px-3 py-1 text-sm hover:border-brand">
                    {i.status === "optional" ? "Checked" : "Done, or not for me"}
                  </button>
                )
              )}
            </div>
          </article>
        </li>
      ))}
    </ul>
  );
}
