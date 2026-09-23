# Subscription Detective: Prototype Spec

22 Sept 2026, @Ismael

## Overview

The prototype finds subscriptions people forgot they pay for, unmasks charges hidden behind intermediaries like PayPal, and flags idle services. It works from uploaded statements only, so it needs no bank API or Gmail approval.

Product promise: "You're paying for things you forgot you have."

The problems it solves:

- People forget subscriptions, especially free trials that converted, annual renewals, and small charges.
- Charges routed through intermediaries (PayPal, Apple, Google Play, Stripe, Paddle) hide the real merchant on bank statements.
- People keep paying for services they no longer use.

## Prototype scope

Version 1 is a web app where a user uploads 3 to 12 months of statements and gets a "forgotten subscriptions report" in under a minute.

| In version 1 | Out of version 1 (later) |
| --- | --- |
| Upload bank statements (CSV, PDF) | Live bank connection (Plaid, GoCardless, Tink) |
| Upload PayPal activity export (CSV) | PayPal API connection |
| Paste or upload app store subscription lists | Automatic Apple and Google import |
| Upload receipt emails (.eml files or forwarded) | Gmail and Outlook inbox connection |
| Recurring charge detection and reconciliation | One-tap cancellation on the user's behalf |
| Idle flag via a "Still using this?" question | Automatic usage tracking |
| Report: total yearly spend, forgotten items, idle items | Renewal alerts, mobile app, accounts |
| Cancellation links and guides per service | Payments and subscription tiers |

## Data inputs

Every source is normalized into one transaction format, so the engine never cares where a charge came from.

| Source | Format | What it reveals |
| --- | --- | --- |
| Bank or card statement | CSV (preferred) or PDF | Every charge, but often a vague label ("PAYPAL *UBER", "APPLE.COM/BILL") |
| PayPal activity export | CSV from PayPal's Activity page | The real merchant behind PayPal charges |
| Apple subscriptions | Screenshot or pasted text from Settings > Subscriptions | Services hidden behind "APPLE.COM/BILL" |
| Google Play subscriptions | Screenshot or pasted text from Play Store > Payments & subscriptions | Services hidden behind "Google Play" |
| Receipt emails | .eml files or pasted text | Merchant, amount, plan and renewal date |

Normalized transaction fields: date, amount, currency, raw label, source (bank, paypal, apple, google, email), and a link to matching records in other sources.

The prototype should ship with parsers for 3 or 4 common bank CSV layouts plus a manual column-mapping screen for any other bank.

## Core logic

Four steps turn raw charges into a clear list of subscriptions: detect, reconcile, label, flag.

Uploaded files, Normalize transactions, Detect recurring charges, Reconcile intermediaries, Label with descriptor map, Flag forgotten and idle, Report.

1. **Detect recurring charges.** Group charges by cleaned label and similar amount (within 10%). A group is recurring if intervals are regular: weekly, monthly (27 to 33 days), quarterly, or yearly (360 to 370 days). Allow for price increases and one missed month.
2. **Reconcile intermediaries.** For each vague bank charge (PayPal, Apple, Google, Stripe, Paddle, Klarna), look in the other sources for a record with the same amount and currency within 3 days. A match relabels the charge with the real merchant, for example "PAYPAL €24.99" becomes "Uber One". Several candidates? Pick the closest date and show the match confidence.
3. **Label with the descriptor map.** A JSON table maps known cryptic labels to services ("PADDLE.NET* NOTION" to Notion). Unknown labels trigger a one-time question to the user, and the answer is saved to the map.
4. **Flag forgotten and idle services.** A subscription is "possibly forgotten" if it is yearly, costs under €10 a month, started as a trial, or has no receipt email. Every subscription gets a "Still using this?" question; "No" or "Rarely" marks it idle and adds it to the potential savings.

Bundles: a charge like Apple One or a telecom plan with Netflix is split into its included services, but counted once in the total.

## Tech stack and data model

A single Next.js app in TypeScript keeps the prototype simple to build, test and deploy.

| Layer | Choice | Why |
| --- | --- | --- |
| App and API | Next.js (TypeScript) | One codebase for pages and server routes |
| Parsing | papaparse (CSV), pdf-parse (PDF), mailparser (.eml) | Mature, well-documented libraries |
| Screenshots | Claude API (vision) | Reads app store subscription screens |
| Database | SQLite via Prisma (Postgres later) | Zero setup for the prototype |
| UI | Tailwind CSS | Fast, clean mobile-friendly layout |
| Tests | Vitest with sample statement files | The engine must be tested on real-looking data |
| Hosting | Vercel | Free tier, one-command deploys |

Data model:

- **Upload**: id, source type, file name, uploaded at, deleted at.
- **Transaction**: id, upload id, date, amount, currency, raw label, source.
- **Subscription**: id, service name, category, frequency, average amount, yearly cost, first seen, last seen, status (active, idle, forgotten, cancelled), confidence.
- **Match**: bank transaction id, intermediary transaction id, confidence score.
- **Descriptor**: raw label pattern, service name, cancellation URL.

## Privacy and security

Trust is the product: users hand over financial data, so privacy rules are built in from the first line of code.

- Delete uploaded files right after parsing; keep only normalized transactions.
- Offer a "Delete everything" button that erases all of a user's data in one click.
- Mask account numbers, IBANs and card numbers during parsing, before anything is stored.
- Encrypt the database at rest and use HTTPS everywhere.
- Send only the minimum to the Claude API (a screenshot or a single label), never full statements.
- Show a plain-language privacy page explaining what is kept, for how long, and why.
- Before any public launch, get a GDPR review and a security audit.

## Validation plan

The prototype succeeds if real users find money they didn't know they were losing, and some would pay to keep finding it.

- Test it yourself first with your own statements, including your PayPal and Uber charges.
- Recruit 20 to 30 testers from friends, LinkedIn contacts, and people who commented on similar posts.
- After each report, ask two questions: "Did you find anything surprising?" and "Would you pay for alerts and cancellation help? How much?"

| Metric | Target |
| --- | --- |
| Testers who find at least one forgotten or idle subscription | 60% or more |
| Average yearly waste found per tester | Over €100 |
| Intermediary charges correctly unmasked | 80% or more |
| Testers willing to pay | 25% or more |

If the targets are met, move to live bank connections, PayPal API and Gmail verification. If not, the testers' answers show whether the problem is detection accuracy or demand.
