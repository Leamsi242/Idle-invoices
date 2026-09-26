# Subscription Detective

"You're paying for things you forgot you have."

Connect your bank and your mailbox, read-only. The app finds recurring charges, unmasks the ones hidden behind PayPal, Apple, Google, Stripe, Paddle or Klarna, flags the ones you probably forgot, and asks "Still using this?" to work out what you could stop paying for. It only asks for your help where the data is not enough ("Which service is the €9.99 a week paid through Google Play?"). Importing files (CSV, PDF, receipts, app store lists) is still possible under "Advanced". The original product spec is in [SPEC.md](SPEC.md).

## Run it locally

Requirements: Node.js 20.19 or later (22 recommended).

```bash
npm install                        # also generates the Prisma client
cp .env.example .env
# put a key in .env:  DATA_ENCRYPTION_KEY="$(openssl rand -base64 32)"
npx prisma db push                 # creates prisma/dev.db (SQLite)
npm run dev                        # http://localhost:3000
```

Then upload the files in [`samples/`](samples) to see a full report. Optional: set `ANTHROPIC_API_KEY` to read app store screenshots (without it, paste the text of the list instead).

## Run the tests

```bash
npm test            # Vitest: parsers, engine, storage, reminders, Gmail, privacy checks, bank and mailbox connections, doubts, French and English (150 tests)
npm run typecheck
```

The tests create a throwaway database in `prisma/test.db` and run the whole engine on the sample files. To regenerate the samples: `node scripts/generate-samples.ts`.

## How it works

```
Uploaded files
  -> parsers (src/lib/parsers)        one NormalizedTransaction format, numbers masked
  -> reconcile (engine/reconcile.ts)  vague bank charge = record with same amount and currency within 3 days
  -> detect (engine/recurring.ts)     same label, amount within 10%, weekly / monthly / quarterly / yearly
  -> label (engine/descriptors.ts)    55 known services (src/data/descriptors.json) + the user's answers
  -> flag (engine/flags.ts)           possibly forgotten, idle, cancelled, bundles
  -> report
```

| Source | Accepted formats |
| --- | --- |
| Bank statements | CSV from N26, Revolut, French banks (Débit / Crédit), UK banks (Debit / Credit Amount), and any CSV with usual column names ("Date", "Libellé" or "Description", "Débit" and "Crédit" or "Amount"); any other CSV through the column-mapping screen; PDF statements with one line per operation, including those with a single unsigned amount column and the card merchant on the next line (Crédit Mutuel, CIC); American Express France card statements (both layouts, since 2019, checked against the statement's debit total) |
| PayPal | Activity download CSV (English or French headers, 12 months per download); authorizations, holds and 4X instalments ("PayPal Inc.") are left out, and the service behind Google Play or Paddle is read from the item title |
| Receipts | `.eml` files, pasted text, or a one-time Gmail scan |
| Apple / Google Play | Pasted text of the subscriptions screen, or a screenshot (read by Claude) |

### Decisions worth knowing

- **Reconciliation runs before grouping.** Several services can hide behind the same `PAYPAL *` label; grouping first would merge them. Charges that were not matched directly inherit the merchant found for the same label and amount (for example every Notion charge after the one matched to the receipt).
- **Yearly plans seen once.** Twelve months of statements often show a yearly charge only once. Such a charge counts as a yearly subscription when a receipt or app store list says the plan is yearly (Duolingo in the samples). Two yearly charges 360 to 370 days apart are detected without help (Amazon Prime).
- **Noisy labels.** Every PayPal debit can carry the same label ("PRLV SEPA PAYPAL EUROPE S.A.R.L"). Series at exactly the same amount that repeat regularly are looked for first, so a €23.99 subscription is found among a hundred other PayPal payments; price steps between such series are joined afterwards. Unknown merchants whose amount keeps moving by more than 5% (a bakery, taxis) are not subscriptions. Loan instalments, taxes, co-ownership charges, credit card settlements and instalment plans (PayPal 4X, Oney, Alma) are left out.
- **Card statements.** A card processor can change the label every month ("NETFLIX.COM AMSTERDAM", "NETFLIX.COM 521525 NL"). When a known service shows under several labels, its charges are detected again together and that result is kept when it explains more charges, so two accounts of the same service still count as two. A known service may also change plan (Claude at €108 then €216, the first charge prorated) once the new price has been charged twice. A yearly fee that rises in steps (a card fee at €165, €165, €180, €180, €192) is kept even for an unknown merchant, since every price but the last is paid at least twice.
- **Paid trial on the statement only.** A token charge (€2 or less) followed within 35 days by one full charge of a known service (PDF Guru: €0.99, then €49.99) is reported as a converted trial, billed monthly until a second charge says otherwise.
- **Overlapping statements.** The same bank line found in two uploads counts once; identical lines inside one statement (two €5.99 payments the same day) are kept.
- **Minimum evidence.** Weekly, monthly and quarterly need 3 charges; yearly needs 2. A price change is only accepted after at least 2 charges at the old price, so two unrelated purchases at the same shop are not mistaken for a subscription.
- **App store lists** show the next renewal, not past charges, so the parser projects the last 12 months of charges back from the renewal date to reconcile them with `APPLE.COM/BILL` lines.
- **"No receipt email"** is only used as a reason when the user uploaded at least one receipt; otherwise every subscription would be flagged.
- **"Possibly forgotten" vs "idle".** Answering "Yes" to "Still using this?" clears the forgotten flag; "Rarely" or "No" makes it idle and adds its yearly cost to the potential savings. A subscription with no charge for 1.5 periods is shown as stopped and left out of the total.
- **Free trials not yet charged** (for example "Free trial, then €69.99/year" in an app store list) are shown at the top of the report with the date of the first charge, so the user can cancel in time (Calm in the samples).
- **Trials that keep charging.** A subscription first charged in the last 60 days is marked "New" and shown in a "Started recently" banner (only when the statements go back at least 30 days before it, so everything is not "new" on a short statement). Weekly billing is flagged with its monthly cost ("about €43.29 a month"), and a small first charge (at most half the price, up to 35 days before) is shown as a paid trial. A known service (in the descriptor map) is accepted after 2 charges instead of 3, so a converted trial is caught after its first renewal. In the samples: WeTransfer at €9.99 a week and Strava after a €1 trial.
- **Reminders.** On the Trials page the user notes a free trial they just started; the report lists it with the trial found in app store lists. Every trial and every subscription has a button that downloads a calendar reminder (.ics): 2 days before a trial ends, 3 days before a renewal, at 9:00. It works with any phone calendar and needs no account or email address.
- **How to cancel** depends on how the user pays: Apple and Google Play subscriptions can only be cancelled in the store, PayPal payments also need the automatic payment stopped, and direct debits can be backed by revoking the SEPA mandate. The report shows these steps plus the service's account page, the next charge date and the amount paid so far.
- **A mailbox is enough on its own.** Receipts that no bank line accounts for become charges themselves (one per payment: a PayPal receipt and the merchant's own email for the same payment count once). The parser reads the formats met in a real mailbox: Google Play order confirmations (the real app is only named in the body; weekly, monthly, every 3 months or yearly), PayPal receipts in French and English (a payment to "Google Payment Ireland" is named after its item line, e.g. Google AI Pro, which is Google One), Stripe and Paddle receipts, Amazon Channels introductory prices, renewal reminders. Cancellation emails are kept as evidence and end a subscription; instalment plans, transfers to people, refunds and failed payments are ignored.
- **Trials that converted without a cancellation** ("On September 14 you will be charged €49.99 every month", no cancellation email since) are reported as probably charging, with the amount to look for on the statement. Announced price increases ("€49.99 the first year, then €99.99") appear in the "Coming up" section with a reminder.
- **Duplicates.** The same service paid twice over the same period, at the same billing frequency (two accounts, or the app store and the website), is flagged "Charged twice". A monthly plan followed by a yearly one is a plan change, and a cancellation email sent before a plan started does not end it.
- **Bundles** (Apple One, Canal+) list their included services and count once. A service paid separately while also in a bundle gets "Already included in ..." (iCloud+ and Netflix in the samples).
- **No accounts in version 1.** Each browser gets a random session id in an httpOnly cookie; every row carries it.
- The cancellation links in the descriptor map are starting points (account or help pages). Check them before relying on them.

## User journey

1. **Connect your bank** (`/`): search the bank, sign in on the bank's own page (PSD2 strong authentication), come back. The app reads the transactions of every account the user shared, up to 24 months (90 days at Crédit Mutuel, the bank's limit), once, then deletes the consent (`lib/banking`, `api/bank/*`). Cards with their own statement (American Express) are connected the same way.
2. **Connect your mailbox**: Gmail or Outlook / Hotmail, one-time read-only scan of receipts (`lib/gmail.ts`, `lib/outlook.ts`).
3. **Report**, with "We need your help" on top (`lib/doubts.ts`): only the points the data could not settle, each with one small action. Unnamed PayPal, Google Play or Apple payments without a mailbox connected ask for the mailbox (one action answers many); a bank paying an American Express card asks to connect the card; a recurring charge still unnamed asks for its name, or a screenshot of the store's subscription list.
4. **Advanced** (`/advanced`, `/start`): manual import of files and the import checklist, for testing, for banks the provider does not cover, or for a PayPal export.

### Bank connection provider

The connection goes through [Enable Banking](https://enablebanking.com), a licensed PSD2 account information provider with self-serve sign-up and coverage of French banks. (GoCardless Bank Account Data, formerly Nordigen, no longer accepts new customers.) Its "restricted production" mode is enough for the test phase: it connects real accounts that you whitelist. Other providers (Powens, Bridge, Tink) can be added behind the same `BankProvider` interface (`lib/banking/types.ts`).

Setup: create an application in the Enable Banking control panel, register the redirect URL `https://<your-domain>/api/bank/callback`, and set `ENABLE_BANKING_APP_ID` and `ENABLE_BANKING_PRIVATE_KEY` (the application's PEM key). Requests are authenticated with a one-hour JWT signed with that key (RS256). Without it, `BANK_DEMO=1` shows a made-up "Demo bank (test data)" to try the whole journey; it is on by default in development.

### Testing with a real bank (Crédit Mutuel)

1. Create an account and an application on enablebanking.com (production, restricted mode is enough for your own accounts), with the redirect URL `https://<your-domain>/api/bank/callback`. The bank sign-in needs a public HTTPS address: deploy on Vercel first (see below).
2. In the Enable Banking control panel, link your own Crédit Mutuel account to the application (restricted mode only reads the accounts linked there).
3. Put the application id and its private key in `ENABLE_BANKING_APP_ID` and `ENABLE_BANKING_PRIVATE_KEY`, then run `npm run bank:check -- https://<your-domain>/api/bank/callback "Crédit Mutuel"`. It checks the key, the application, the redirect URL, and lists the Crédit Mutuel entries with the headers the bank requires. Nothing is connected.
4. Open the app, search "Crédit Mutuel", sign in on the bank's page and confirm in the Crédit Mutuel app.

What to expect: Crédit Mutuel shares 90 days of history through PSD2. The app asks for 24 months, then 13, then 90 days, and keeps the first period the bank accepts. With 90 days, a monthly charge shows two or three times: two identical charges a month apart count, marked "Seen twice so far". Yearly renewals are outside that window, so the report asks to connect the mailbox, whose receipts go back years. If the connection fails, the home page shows the bank's error code (for example `PSU_HEADER_NOT_PROVIDED`) and the server log has the details.

### Outlook setup

Register an application in Microsoft Entra (supported account types: any organizational directory and personal Microsoft accounts), add the delegated permission `Mail.Read`, create a client secret, register the redirect URI `https://<your-domain>/api/outlook/callback`, and set `MICROSOFT_CLIENT_ID` and `MICROSOFT_CLIENT_SECRET`. No `offline_access` is requested, so there is no refresh token; the access token (about an hour) lives only during the scan, since Microsoft has no endpoint to revoke a single access token.

## Import checklist (Advanced)

For manual imports, `/start` asks four questions (bank accounts and cards, payment apps and stores, mailboxes, other channels such as operator bills) and turns the answers into a checklist, with the steps to get each export: CSV or PDF statements for each bank, Amex PDF statements, PayPal's activity download (and a GDPR access request when PayPal only offers a few months), the App Store and Google Play subscription lists, the Gmail scan or `.eml` files for other mailboxes, and operator bills to check by hand.

The checklist also reads what was uploaded (`lib/onboarding.ts`):

- an item is ticked when a file of its kind has been read (with several banks, the user ticks each bank, since a file does not say which bank it comes from);
- sources the user did not mention are added when the statements point to them: PayPal, Apple or Google charges that nothing explains yet (with the count), payments to American Express without the Amex statement, a deferred debit card total, telecom bills;
- statements covering less than about 10 months get a note, since yearly renewals would be missed.

The report shows "This report may be incomplete" while items are left to add. The answers hold known ids only, are encrypted, and are deleted with everything else.

## Languages

The interface is in French and English (`lib/i18n.ts`, one dictionary per language). The language comes from the browser (Accept-Language), and the link in the footer switches it and remembers the choice in a cookie. Texts made by the engine (reasons, doubts) are written in English and translated for display by `translateReason`, so the engine and its tests stay language-free; cancellation steps and calendar reminders take the locale. The import checklist (`/start`) and the column-mapping screen, both under "Advanced", are still in English only.

## Privacy and security

What the code does for each point of the spec's "Privacy and security" section:

| Rule | Where |
| --- | --- |
| Delete uploaded files right after parsing | Files are read into memory only, wiped (`fill(0)`) after parsing and never written to disk (`api/upload/route.ts`; `tests/privacy.test.ts` fails if any file-writing call appears). The `Upload` row is created with `deletedAt` already set. |
| "Delete everything" button | On the report and privacy pages; `DELETE /api/data` erases every row of the session in every table and clears the cookie. Data is also purged automatically 30 days after the last upload. |
| Mask account numbers, IBANs and card numbers during parsing | `lib/mask.ts`, applied by `makeTx()` in every parser and to stored file names. |
| Encrypt the database at rest | Labels, merchants, plans and subscription details are encrypted with AES-256-GCM before storage (`lib/crypto.ts`, key in `DATA_ENCRYPTION_KEY`). Dates and amounts are not. For production, also use a database with disk encryption (Turso and managed Postgres provide it). |
| HTTPS everywhere | HSTS, Content-Security-Policy and other security headers in `next.config.ts`; the session cookie is `Secure` in production; Vercel serves HTTPS only. |
| Minimum data to the Claude API | Only a screenshot, in `lib/parsers/screenshot.ts` (the only file importing the SDK; checked by a test). Statements are never sent. |
| Plain-language privacy page | `/privacy` (also covers the Gmail scan) |
| GDPR review and security audit | Still to do before any public launch. |

The upload route is rate limited (20 uploads per 10 minutes per IP address), since screenshots call the Claude API.

Known gaps for later: the rate limiter and the CSP are prototype-grade (the limiter keeps its counters in memory, per server instance, and the CSP allows inline scripts because Next.js needs them without a nonce setup), and `npm audit` reports two advisories inside Prisma's own dependencies (`mysql2`, not used at runtime, and `deepmerge-ts`, used by the Prisma config loader) whose only fix today is a forced upgrade to a Prisma release candidate.

## Gmail scan (optional)

The upload page shows "Scan my Gmail receipts" when `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set. The scan:

- asks Google for `gmail.readonly` only, without a refresh token (`access_type=online`), with PKCE and a state check;
- searches the last year for emails whose subject mentions a receipt, invoice, payment, subscription, renewal or trial (at most 300);
- keeps only the ones that read as receipts (amount plus billing words, no promotions), with the same fields as an uploaded `.eml` (merchant, amount, date, plan, frequency, trial), and discards the emails themselves;
- never stores the access token and revokes it as soon as the scan ends.

Setup in [Google Cloud console](https://console.cloud.google.com/): create a project, enable the Gmail API, configure the OAuth consent screen (External, **Testing** mode) and add each tester's Gmail address as a test user (up to 100), then create an OAuth client of type "Web application" with the redirect URI `https://<your-domain>/api/gmail/callback` (and `http://localhost:3000/api/gmail/callback` for local runs).

`gmail.readonly` is a restricted scope: in Testing mode it works for the listed test users (Google shows an "unverified app" warning), which is enough for the 20 to 30 testers of the validation plan. A public launch needs Google's verification and a yearly third-party security assessment (CASA).

## Deploy on Vercel

A step-by-step guide in French, from the Turso database to the first real Crédit Mutuel and Gmail connection, with a check after each step: [docs/DEPLOIEMENT.md](docs/DEPLOIEMENT.md). `GET /api/health` tells what is configured (database, encryption, bank provider, Gmail, Outlook, screenshots, purge) without returning any value, and `vercel.json` schedules the daily retention purge (`/api/cron/purge`, protected by `CRON_SECRET`).

A SQLite file does not survive on Vercel (each function has its own temporary disk), so use a hosted libSQL database. [Turso](https://turso.tech) has a free tier and works with the same schema.

1. Create the database and apply the schema:
   ```bash
   turso db create subscription-detective
   npm run db:sql                                  # writes prisma/schema.sql
   turso db shell subscription-detective < prisma/schema.sql
   turso db show subscription-detective --url      # libsql://...
   turso db tokens create subscription-detective
   ```
2. Import the repository in Vercel (framework: Next.js, no other settings needed) and set these environment variables:
   - `DATABASE_URL`: the `libsql://...` URL
   - `DATABASE_AUTH_TOKEN`: the token
   - `DATA_ENCRYPTION_KEY`: `openssl rand -base64 32` (keep it safe: losing it makes stored data unreadable)
   - `ANTHROPIC_API_KEY`: optional, for screenshots
   - `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`: optional, for the Gmail scan
3. Deploy (`vercel --prod` or a push). The build runs `prisma generate && next build`.

Vercel limits request bodies to 4.5 MB, so the app accepts files up to 4 MB each; upload large statements in several goes.

## Project layout

```
samples/                 fake test data (no real personal data)
scripts/                 sample generator
prisma/schema.prisma     data model (Upload, Transaction, Subscription, Match, Descriptor, TrackedTrial, Profile)
src/lib/parsers/         one parser per source, plus file-type detection
src/lib/engine/          reconcile, detect, label, flag, pipeline
src/data/descriptors.json
src/lib/store.ts         database access, recompute, delete everything, retention
src/app/                 pages (upload, review, report, privacy) and API routes
tests/                   Vitest suites
```
