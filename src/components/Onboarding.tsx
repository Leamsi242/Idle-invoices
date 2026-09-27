"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { choiceLists, type Answers, type Choice, type PlanItem } from "@/lib/onboarding";
import { onboardingText } from "@/lib/i18n-onboarding";
import type { Locale } from "@/lib/i18n";
import { useI18n } from "@/components/I18n";

type ListKey = Exclude<keyof Answers, "done">;

function buildSteps(locale: Locale): { title: string; intro: string; groups: { key: ListKey; label: string; choices: Choice[] }[] }[] {
  const q = onboardingText(locale).questions;
  const c = choiceLists(locale);
  return [
    {
      ...q.steps.pay,
      groups: [
        { key: "banks", label: q.groups.banks, choices: c.banks },
        { key: "cards", label: q.groups.cards, choices: c.cards },
      ],
    },
    {
      ...q.steps.apps,
      groups: [
        { key: "wallets", label: q.groups.wallets, choices: c.wallets },
        { key: "stores", label: q.groups.stores, choices: c.stores },
      ],
    },
    { ...q.steps.mail, groups: [{ key: "mailboxes", label: q.groups.mailboxes, choices: c.mailboxes }] },
    { ...q.steps.other, groups: [{ key: "other", label: q.groups.other, choices: c.other }] },
  ];
}

function Chip({ choice, on, toggle }: { choice: Choice; on: boolean; toggle: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={toggle}
      className={`rounded-2xl border px-3 py-2 text-left text-sm ${on ? "border-brand bg-brand-soft text-brand-dark" : "border-line bg-surface hover:border-brand"}`}
    >
      <span className="font-medium">{on ? "✓ " : ""}{choice.label}</span>
      {choice.hint && <span className="block text-xs text-muted">{choice.hint}</span>}
    </button>
  );
}

export function OnboardingQuestions({ initial }: { initial: Answers }) {
  const router = useRouter();
  const { locale } = useI18n();
  const q = onboardingText(locale).questions;
  const STEPS = buildSteps(locale);
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
        setError(q.saveError);
        return;
      }
      router.push("/start");
      router.refresh();
    });

  return (
    <section className="space-y-4 rounded-2xl bg-surface p-4 shadow-card">
      <div className="flex items-center justify-between text-sm text-muted">
        <span>{q.stepOf(step + 1, STEPS.length)}</span>
        <div className="flex gap-1" aria-hidden>
          {STEPS.map((_, i) => <span key={i} className={`h-1.5 w-8 rounded-full ${i <= step ? "bg-brand" : "bg-line"}`} />)}
        </div>
      </div>
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">{current.title}</h2>
        <p className="text-sm text-muted">{current.intro}</p>
      </div>
      {current.groups.map((g) => (
        <fieldset key={g.key} className="space-y-2">
          <legend className="text-sm font-medium text-ink-2">{g.label}</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {g.choices.map((c) => <Chip key={c.id} choice={c} on={answers[g.key].includes(c.id)} toggle={() => toggle(g.key, c.id)} />)}
          </div>
        </fieldset>
      ))}
      {error && <p className="text-sm text-leak">{error}</p>}
      <div className="flex gap-2">
        {step > 0 && (
          <button type="button" onClick={() => setStep(step - 1)} className="rounded-2xl border border-line px-4 py-3 font-semibold">
            {q.back}
          </button>
        )}
        <button
          type="button"
          disabled={pending}
          onClick={() => (last ? save() : setStep(step + 1))}
          className="flex-1 rounded-2xl bg-brand px-4 py-3 font-semibold text-on-accent disabled:opacity-40"
        >
          {last ? (pending ? q.saving : q.seeChecklist) : q.next}
        </button>
      </div>
      <p className="text-xs text-muted">
        {q.privacy}
      </p>
    </section>
  );
}

const BADGE_CLASS: Record<PlanItem["status"], string> = {
  todo: "bg-warn-soft text-ink-2",
  optional: "bg-surface-2 text-ink-2",
  done: "bg-brand-soft text-brand",
};

function CopyButton({ text, label, done }: { text: string; label: string; done: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="rounded-full border border-line bg-surface px-3 py-1 text-sm hover:border-brand"
      onClick={async () => {
        await navigator.clipboard.writeText(text).catch(() => {});
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
    >
      {copied ? done : label}
    </button>
  );
}

export function Checklist({ plan, ticked, gmail, gdpr, banking = false }: { plan: PlanItem[]; ticked: string[]; gmail: boolean; gdpr: string; banking?: boolean }) {
  const router = useRouter();
  const { locale } = useI18n();
  const t = onboardingText(locale).checklist;
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
          <article className={`space-y-2 rounded-2xl bg-surface p-4 shadow-card ${i.status === "done" ? "opacity-75" : ""}`}>
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-medium">{i.title}</h3>
              <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs ${BADGE_CLASS[i.status]}`}>{t.badge[i.status]}</span>
            </div>
            {i.detected && <p className="text-xs font-medium text-brand">{t.detected}</p>}
            <p className="text-sm text-muted">{i.why}</p>
            {i.alert && <p className="rounded-lg bg-warn-soft p-2 text-sm text-ink-2">{i.alert}</p>}
            <details className="rounded-lg bg-surface-2 p-3 text-sm" open={i.status === "todo"}>
              <summary className="cursor-pointer font-medium text-brand">{t.howTo(i.accepts)}</summary>
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-ink-2">
                {i.steps.map((s) => <li key={s}>{s}</li>)}
              </ol>
              {i.action === "gdpr" && (
                <details className="mt-3 rounded-lg bg-surface p-3">
                  <summary className="cursor-pointer font-medium">{t.gdprSummary}</summary>
                  <pre className="mt-2 whitespace-pre-wrap text-xs text-ink-2">{gdpr}</pre>
                  <div className="mt-2"><CopyButton text={gdpr} label={t.copy} done={t.copied} /></div>
                  <p className="mt-2 text-xs text-muted">{t.gdprNote}</p>
                </details>
              )}
            </details>
            <div className="flex flex-wrap items-center gap-2">
              {i.status !== "done" && i.connect && banking && (
                <Link href={`/?bank=${encodeURIComponent(i.connect)}#bank`} className="rounded-full bg-brand px-3 py-1 text-sm font-medium text-on-accent">{t.connect(i.connect)}</Link>
              )}
              {i.status !== "done" && i.action === "gmail" && gmail && (
                <a href="/api/gmail/start" className="rounded-full bg-brand px-3 py-1 text-sm font-medium text-on-accent">{t.connectGmail}</a>
              )}
              {i.status !== "done" && (i.action === "upload" || i.action === "paste" || i.action === "gdpr" || (i.action === "gmail" && !gmail)) && (
                <Link href="/advanced#upload" className="rounded-full bg-brand px-3 py-1 text-sm font-medium text-on-accent">
                  {i.action === "paste" ? t.addPaste : t.upload}
                </Link>
              )}
              {ticked.includes(i.id) ? (
                <button type="button" disabled={pending} onClick={() => tick(i.id, false)} className="text-sm text-muted underline">{t.undo}</button>
              ) : (
                i.status !== "done" && (
                  <button type="button" disabled={pending} onClick={() => tick(i.id, true)} className="rounded-full border border-line px-3 py-1 text-sm hover:border-brand">
                    {i.status === "optional" ? t.checked : t.doneNotForMe}
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
