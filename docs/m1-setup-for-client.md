# Salebiz M1 — Client Setup Guide

**TL;DR:** M1 needs zero new external services. Everything in the upgrade spec (sections 1–3 and 5) works with the Supabase + Resend + Stripe + OpenAI accounts you already have. Apply 3 database migrations, set a couple of optional env vars, and you're done.

---

## What's new in M1

- ✅ **CRM with buyer slide-out panels** — click any buyer name in CRM, enquiries, NDAs, document-access, or messages to open the full profile
- ✅ **Buyer preferences** — buyers can now fill in budget, industries, locations, funding status, and timeframe on `/account`
- ✅ **Full activity tracking** — last emailed/called/contacted, follow-ups due, first interaction date, contact status
- ✅ **Pipeline statuses** with auto-advance (email → Contacted, NDA signed → NDA Signed, docs shared → Documents Shared)
- ✅ **Custom CRM fields** — agency-level columns shared across all brokers
- ✅ **Call-log popup** — quick capture: outcome, notes, optional follow-up
- ✅ **Follow-up system** with daily "due today" banner + notifications
- ✅ **In-platform email composer** with templates + merge fields + auto-log to CRM
- ✅ **"Log past email"** — paste an email you sent from Gmail/Outlook, captured to CRM (no setup, no external service)
- ✅ **Internal broker ↔ buyer chat** with attachments, read receipts, in-app + email notifications
- ✅ **Send listing inside chat** + **Request NDA inside chat**
- ✅ **Buyer messages tab** on `/account`

---

## Setup — required (5 minutes)

### 1. Apply the 3 new database migrations

Either via Supabase CLI (`supabase db push`) or paste each file into the Supabase SQL editor and run:

```
supabase/migrations/20260509000001_buyer_profile_and_crm_columns.sql
supabase/migrations/20260509000002_crm_activities_followups_custom_fields.sql
supabase/migrations/20260509000003_messaging.sql
```

Verify they're applied:

```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema='public' AND table_name IN (
  'crm_activities','crm_follow_ups','crm_custom_fields','crm_custom_field_values',
  'broker_bcc_addresses','message_threads','messages'
);
-- Expect 7 rows.
```

### 2. Schedule the daily follow-ups cron (1 minute)

This sends "follow-up due today" notifications to brokers. One env-var-only setup — no new external service.

If you use **GitHub Actions** (most common), add `.github/workflows/follow-ups-due-cron.yml`:

```yaml
name: Follow-ups due daily
on:
  schedule:
    - cron: '0 22 * * *'   # 08:00 AEST = 22:00 UTC
  workflow_dispatch:
jobs:
  run:
    runs-on: ubuntu-latest
    env:
      NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
      SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm', cache-dependency-path: 'Project1334/package-lock.json' }
      - run: npm ci
        working-directory: Project1334
      - run: npm run cron:follow-ups-due
        working-directory: Project1334
```

The Supabase secrets are the same ones you already use for `cron:buyer-alerts`. No new service required.

Alternative: **Vercel Cron**, **Supabase Edge Functions schedule**, or any scheduler that can hit a Node process daily.

### 3. Redeploy on Vercel

After running migrations, trigger a fresh deploy so the new server actions ship. That's it for required setup.

---

## Optional Phase 2 — external email auto-tracking

**The spec mentions:** *"If brokers email buyers outside of Salebiz, we still need a simple way to track communication history inside CRM."* (Section 2 → External Email Tracking)

**M1 ships two complete options:**

| Option | How it works | Setup required |
|---|---|---|
| **In-platform composer** (recommended for M1) | Broker hits "Email" on any buyer profile → composes inside Salebiz → sends via your existing Resend account → auto-logs to CRM. Buyer replies arrive in broker's normal Gmail because `Reply-To` is set to the broker's address. | None — uses your existing `RESEND_API_KEY` |
| **"Log past email"** (recommended for emails sent from Gmail) | Same modal as the composer — broker clicks the **Log past email** toggle, pastes subject + body + date, Salebiz records it on the timeline. No actual sending. | None |

**Both cover the spec's external-email-tracking requirement without any new external service.** The BCC inbound pipeline (which would require setting up Resend Inbound, SendGrid Inbound Parse, or Cloudflare Email Workers) is **deferred to Phase 2** — it's nice to have but adds an external dependency.

If you want to enable the BCC pipeline later, the code is already in the repo — just set these env vars and configure an inbound provider:

```bash
# Optional — leave unset for now; M1 doesn't need them
SALEBIZ_INBOUND_DOMAIN=mail.salebiz.com.au
INBOUND_EMAIL_SECRET=<32-byte hex>
```

When these are not set, the **"Your private CRM email"** card simply doesn't render on the CRM page, and the `/api/inbound/email` endpoint returns 503. Everything else in M1 works fine.

---

## Setup — fully optional (skip for now)

These can be configured later without code changes:

- **BCC inbound email pipeline** — `SALEBIZ_INBOUND_DOMAIN` + `INBOUND_EMAIL_SECRET` + an inbound provider (Resend Inbound / SendGrid Inbound Parse / Cloudflare Email Workers / Mailgun Routes). See `setup-bcc-email-pipeline.md` if you decide to enable it.

---

## What you do NOT need for M1

- ❌ No new Resend products (existing outbound is enough)
- ❌ No SendGrid / Mailgun / Postmark account
- ❌ No new DNS records
- ❌ No new Vercel env vars (the BCC ones are optional)
- ❌ No queue / Redis / pub-sub
- ❌ No third-party chat service (built on Supabase + polling)

---

## How brokers actually use the email tracking

The spec lists 4 outcomes for external email tracking:
1. Log to CRM ✅
2. Update buyer history ✅
3. Track last email sent ✅
4. Track communication history ✅

**M1 delivers all 4** via the in-platform composer + the "Log past email" mode. Here's the broker UX:

### Scenario A — Broker wants to email a buyer they've never emailed before

1. Open `/dashboard/contacts` → click buyer → Email button
2. Compose inside Salebiz (templates + merge fields available) → Send
3. Timeline updates instantly, status auto-advances to Contacted
4. Buyer replies to the email → broker gets it in their normal Gmail inbox (Reply-To)

### Scenario B — Broker already emailed from Gmail, wants it in CRM

1. Open the buyer panel → Email button → click **Log past email** toggle
2. Paste the subject + body + pick the date it was sent → Log to CRM
3. Timeline shows the email with the original timestamp, status auto-advances

### Scenario C — Broker handles 50 emails/day from Gmail, wants automatic capture (Phase 2)

Enable the BCC pipeline. Broker sets up an **auto-BCC rule** in Gmail (one-time, 30 seconds) to BCC their private Salebiz address on every outbound email. Every email auto-logs from that point on.

---

## Final checklist

- [ ] 3 migrations applied (verify the 7-row query above)
- [ ] Daily follow-ups cron scheduled (GitHub Actions or equivalent)
- [ ] Vercel redeployed
- [ ] Smoke test: broker can open a buyer panel, send an email, log a past email, log a call, schedule a follow-up, message the buyer

That's M1. Nothing else is required.
