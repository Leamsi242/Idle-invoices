import { RETENTION_DAYS } from "@/lib/store";
import { DeleteEverythingButton } from "@/components/Questions";

export const metadata = { title: "Privacy · Subscription Detective" };

export default function Privacy() {
  return (
    <article className="space-y-5 leading-relaxed">
      <h1 className="text-2xl font-bold">How we handle your data</h1>
      <p>You are trusting us with financial data. Here is exactly what happens to it, in plain language.</p>

      <section className="space-y-2">
        <h2 className="font-semibold">What we keep</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>For each payment: its date, amount, currency and description. Nothing else.</li>
          <li>The subscriptions we found, and your answers to &quot;Still using this?&quot; and &quot;What is this charge?&quot;.</li>
          <li>Free trials you asked us to track (name, end date, price). Calendar reminders are created on your phone, not by us.</li>
          <li>The names of the files you uploaded, so you know what was read.</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold">What we never keep</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li><strong>Your files.</strong> They are read in memory and deleted right after. They are never written to disk.</li>
          <li><strong>Account numbers, IBANs and card numbers.</strong> They are masked while reading, before anything is stored (for example ••••7890).</li>
          <li>Your balance, your name or your address.</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold">How it is protected</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Payment descriptions are encrypted in the database (AES-256).</li>
          <li>All traffic uses HTTPS.</li>
          <li>There are no accounts: your data is linked to a random identifier stored in a cookie in this browser only.</li>
          <li>
            If you scan Gmail, we get read-only access for the length of the scan. We only open emails from the last year whose subject
            mentions a receipt, invoice, subscription, renewal or trial, keep the amount, merchant and date of real receipts, and revoke our
            access right after. Your emails are never stored.
          </li>
          <li>
            If you upload a screenshot of your app store subscriptions, only that image is sent to Claude (Anthropic&apos;s AI) to read the
            text. Your statements are never sent.
          </li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold">How long</h2>
        <p>
          Until you press &quot;Delete everything&quot;, and never longer than {RETENTION_DAYS} days after your last upload. After that it is erased
          automatically.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold">Why</h2>
        <p>Only to show you your subscriptions report. We don&apos;t sell, share or use your data for anything else.</p>
      </section>

      <p className="text-sm text-slate-500">This is a prototype. A GDPR review and a security audit will happen before any public launch.</p>
      <DeleteEverythingButton />
    </article>
  );
}
