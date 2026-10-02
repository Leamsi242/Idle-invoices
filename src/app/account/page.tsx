import { getSessionId } from "@/lib/session";
import { getAccount, maskEmail } from "@/lib/accounts";
import { ACCOUNT_DICTS } from "@/lib/i18n-account";
import { formatDate } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";
import { AccountActions, SignInForm } from "@/components/Account";
import { Icon } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Account · Subscription Detective" };

export default async function AccountPage() {
  const locale = await getLocale();
  const t = ACCOUNT_DICTS[locale];
  const account = await getAccount(await getSessionId());
  return (
    <article className="mx-auto max-w-xl space-y-6">
      <header className="space-y-2">
        <h1 className="font-display text-3xl font-semibold tracking-tight">{t.title}</h1>
        {!account && <p className="text-ink-2">{t.intro}</p>}
      </header>
      {account ? (
        <section className="space-y-4 rounded-3xl border border-line bg-surface p-5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-soft text-brand"><Icon name="shield" className="h-5 w-5" /></span>
            <div className="min-w-0">
              <p className="text-xs text-muted">{t.signedIn}</p>
              <p className="truncate font-semibold text-ink">{maskEmail(account.email)}</p>
            </div>
            <span className="ml-auto rounded-full bg-surface-2 px-3 py-1 text-xs font-semibold text-ink-2">{t.plan(t.plans[account.plan] ?? account.plan)}</span>
          </div>
          <p className="text-xs text-muted">{t.since(formatDate(account.createdAt, locale))}</p>
          <AccountActions />
        </section>
      ) : (
        <section className="space-y-4 rounded-3xl border border-line bg-surface p-5">
          <ul className="space-y-1.5 text-sm text-ink-2">
            {t.why.map((w) => (
              <li key={w} className="flex gap-2"><Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-save" />{w}</li>
            ))}
          </ul>
          <SignInForm />
        </section>
      )}
    </article>
  );
}
