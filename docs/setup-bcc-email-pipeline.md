# BCC Email Pipeline — Setup Guide for Client

## What this is

Salebiz now lets brokers track emails they send to buyers from **any inbox** (Gmail, Outlook, Apple Mail). The broker just BCCs a private Salebiz address and the email auto-logs to that buyer's CRM timeline — no manual entry.

To make this work, **you need to set up one inbound subdomain in Resend + DNS** and give the dev team two values back. About 25 minutes of work + waiting for DNS propagation.

You will need access to:

- The DNS panel for `salebiz.com.au` (wherever it's registered — GoDaddy, Crazy Domains, Cloudflare, etc.)
- Your Resend dashboard (`https://resend.com`)
- Your Vercel project dashboard

---

## Two values to set up + send back

By the end of this you'll have set these in Vercel and shared them with the dev team:

| Variable | What it is | Where it comes from |
|---|---|---|
| `SALEBIZ_INBOUND_DOMAIN` | The subdomain that catches inbound mail (e.g. `mail.salebiz.com.au`) | You decide it in Step 1, then add DNS for it |
| `INBOUND_EMAIL_SECRET` | A random password that protects the webhook | Pre-generated below — just copy it |

### ✅ Use this pre-generated secret

Copy this exactly — paste in Step 3 and Step 4:

```
6dc9f3cd19c6e16c13f6cc88eef20c2d7c87f7d2f9e8e09a1fbc42c44156a641
```

> If you'd prefer to generate your own, run `openssl rand -hex 32` in a terminal. Either is fine — just be consistent: the same value must go in **both** the Resend webhook custom header AND the Vercel env var.

---

## Step 1 — Add the inbound subdomain to Resend (5 min)

1. Go to **https://resend.com/domains**
2. Click **Add Domain**
3. Enter: `mail.salebiz.com.au`
4. Region: pick the closest to your users (e.g. `ap-southeast-2 — Sydney`)
5. Click **Add**

Resend now displays a list of DNS records you need to add. **Keep this page open in a tab** — you'll copy them in the next step.

You'll see something like:

```
MX   mail.salebiz.com.au       feedback-smtp.resend.com    Priority 10
TXT  mail.salebiz.com.au       "v=spf1 include:..."
TXT  resend._domainkey.mail    "p=MIGfMA0GCS..."
```

(The exact values vary per account — copy what Resend shows you.)

---

## Step 2 — Add DNS records at your registrar (5 min + propagation wait)

Open the DNS panel where `salebiz.com.au` is hosted.

1. Add the **MX record** Resend showed you. The host field is usually just `mail` (registrars auto-append `.salebiz.com.au`).
2. Add the **TXT records** Resend showed you (SPF + DKIM).
3. Save.

DNS propagation typically takes 5–15 minutes. To check from your machine:

```bash
dig MX mail.salebiz.com.au +short
# Expected output:
# 10 feedback-smtp.resend.com.
```

In Resend → Domains → `mail.salebiz.com.au` — the status will flip from **Pending** to **Verified** once DNS is live.

> **Don't continue past Step 2 until the domain shows Verified in Resend.** If you skip ahead, the webhook setup will work but no email will ever reach it.

---

## Step 3 — Create the inbound webhook in Resend (5 min)

This tells Resend: "Whenever any email arrives at `*@mail.salebiz.com.au`, POST it to the Salebiz app."

1. Resend dashboard → **Inbound** in the left sidebar
   - If you don't see "Inbound", you may need to enable it. Email Resend support — it's free.
2. Click **Create Route** (or **Add Route**)
3. Configure:
   - **Domain:** `mail.salebiz.com.au`
   - **Catch-all:** **ON** (very important — every broker gets a different local-part like `bcc-abc123@…`, so the route must accept all of them)
   - **Action:** Forward via **Webhook**
   - **Webhook URL:**
     ```
     https://YOUR-LIVE-DOMAIN/api/inbound/email
     ```
     Replace `YOUR-LIVE-DOMAIN` with whatever URL the deployed Salebiz app lives at. Examples:
     - `https://salebiz.com.au/api/inbound/email`
     - `https://salebiz-platform.vercel.app/api/inbound/email`
   - **Custom headers:** Add a header called `x-salebiz-inbound-secret` with the secret from the box above:
     ```
     Header name:  x-salebiz-inbound-secret
     Header value: 6dc9f3cd19c6e16c13f6cc88eef20c2d7c87f7d2f9e8e09a1fbc42c44156a641
     ```
4. Save

If Resend's UI uses a slightly different field labeled "Custom Header" or "HTTP Headers" — same thing. The dev team's webhook checks for an exact header name `x-salebiz-inbound-secret` and matches the value to the `INBOUND_EMAIL_SECRET` env var.

---

## Step 4 — Add the two env vars to Vercel (3 min)

1. **https://vercel.com** → your team → the Salebiz project → **Settings** → **Environment Variables**
2. Add the first variable:
   - **Name:** `SALEBIZ_INBOUND_DOMAIN`
   - **Value:** `mail.salebiz.com.au`
   - **Environments:** tick **Production** AND **Preview**
   - Click **Save**
3. Add the second variable:
   - **Name:** `INBOUND_EMAIL_SECRET`
   - **Value:** `6dc9f3cd19c6e16c13f6cc88eef20c2d7c87f7d2f9e8e09a1fbc42c44156a641`
   - **Environments:** tick **Production** AND **Preview**
   - **Sensitive:** ON if Vercel offers it
   - Click **Save**

### Trigger a redeploy so the new vars take effect

Env var changes don't apply to running deployments — you need a fresh build:

- Vercel → **Deployments** tab → click the **⋮** menu next to the latest production deployment → **Redeploy**.
- Wait until the deploy goes green.

---

## Step 5 — Verify it's working

### 5a. Quick webhook check (no email needed)

In a terminal anywhere — no auth required, you're just testing the public webhook:

```bash
curl -X POST https://YOUR-LIVE-DOMAIN/api/inbound/email \
  -H 'Content-Type: application/json' \
  -H 'x-salebiz-inbound-secret: 6dc9f3cd19c6e16c13f6cc88eef20c2d7c87f7d2f9e8e09a1fbc42c44156a641' \
  -d '{"from":"a@b.com","to":"x@y.com","subject":"test","text":"hi"}'
```

Replace `YOUR-LIVE-DOMAIN` with the real domain. Expected response:

```json
{"ok":true,"skipped":"no token"}
```

This means: webhook reachable, secret accepted, payload parsed, but the recipient `x@y.com` isn't a Salebiz BCC address so we skip it. ✅

If you get `503 Inbound not configured` → the Vercel env vars didn't apply yet (redeploy didn't happen, or they were saved to the wrong environment).
If you get `401 Unauthorized` → the secret in the curl doesn't match Vercel's value. Re-check both for typos / trailing whitespace.

### 5b. End-to-end test with a real email

1. Log in to Salebiz as a broker.
2. Go to **Dashboard → CRM**. At the top, you'll see a dashed-border card titled **"Your private CRM email"** with an address like `bcc-k9x2-abc12@mail.salebiz.com.au` and a **Copy** button.
3. Click **Copy**.
4. Open your normal email client (Gmail, Outlook, etc.).
5. Compose a fresh email to a buyer. Add the copied address as **BCC**.
6. Send.

Within ~30 seconds:

- Refresh the broker's CRM page.
- Open the buyer's profile (click the contact row).
- The "Recent activity" timeline shows a new **Email sent** entry with your subject and a snippet of your message.
- The contact's status auto-advances from **New Lead** → **Contacted**.
- The "Last emailed" timestamp updates.

If something looks off, check the **Vercel → Deployments → Function logs** for `/api/inbound/email` — Resend retries on failures so you'll see the requests and any errors.

---

## What to send back to the dev team

Once Steps 1–4 are complete, please reply with these so we can run identical local tests:

```
SALEBIZ_INBOUND_DOMAIN=mail.salebiz.com.au           ← whatever subdomain you picked
INBOUND_EMAIL_SECRET=6dc9f3cd19c6e16c13f6cc88eef20c2d7c87f7d2f9e8e09a1fbc42c44156a641
```

⚠️ Send these via a secure channel (encrypted password manager, Bitwarden / 1Password share, or in-platform secure note) — **not** plain Slack or email. The secret is what protects every broker's CRM from spoofed emails.

If you generated your own secret instead of using the pre-generated one above, please share both your secret AND the subdomain you picked.

---

## FAQ

**Q: Do I need a separate Resend account for inbound?**
No. Inbound is part of the same Resend account you use for outbound. You just enable it on the new subdomain.

**Q: Why a subdomain — why not the main domain?**
Subdomains keep inbound infrastructure separate from your outbound sender (`noreply@salebiz.com.au`). It also lets you use a different MX provider in future without touching your main domain's mail.

**Q: Can the brokers' real emails (the buyer's reply) come into this address?**
The pipeline only logs emails brokers BCC themselves on. When a buyer **replies** to a broker, the reply lands in the broker's normal inbox (because we set `Reply-To` to the broker's email). To capture replies in the CRM too, the broker should add the BCC address to their email client's "Auto-BCC" or "BCC list" rules — most clients support this.

**Q: What if I want to roll the secret later?**
Generate a new secret with `openssl rand -hex 32`. Update the value in two places — the Resend webhook custom header AND the Vercel env var — then redeploy. The next inbound email will use the new secret.

**Q: Cost?**
Resend Inbound is free up to a generous monthly limit (currently 3,000 messages/month on the free tier; check resend.com/pricing for current numbers). DNS records are free at every registrar. Vercel env vars are free.

---

## Checklist (print + tick as you go)

- [ ] Resend domain `mail.salebiz.com.au` added (Step 1)
- [ ] DNS MX + TXT records added at registrar (Step 2)
- [ ] `dig MX mail.salebiz.com.au +short` returns the Resend MX (Step 2)
- [ ] Resend domain shows **Verified** (Step 2)
- [ ] Inbound route created with catch-all + webhook URL + secret header (Step 3)
- [ ] Vercel env vars `SALEBIZ_INBOUND_DOMAIN` + `INBOUND_EMAIL_SECRET` saved (Step 4)
- [ ] Production redeploy triggered after adding env vars (Step 4)
- [ ] curl test returns `{"ok":true,"skipped":"no token"}` (Step 5a)
- [ ] BCC'd email auto-logs to broker's CRM (Step 5b)
- [ ] Two values securely shared back with dev team

---

## For the dev team — local testing without waiting for the client

You don't need the client's setup to develop or test the pipeline. The webhook is just an HTTP endpoint that accepts JSON — you can simulate Resend's payload directly.

### 1. Add to `.env.local`

```bash
SALEBIZ_INBOUND_DOMAIN=mail.salebiz.com.au
INBOUND_EMAIL_SECRET=local-dev-secret-change-me-anything
```

(Use any string for the secret in dev — it just has to match what your test curl sends.)

### 2. Restart dev server

```bash
cd Project1334
npm run dev
```

### 3. Make sure a broker has a BCC token row

Sign in as a broker and visit `/dashboard/contacts` once — the token is lazy-created on first visit. Or seed manually:

```sql
INSERT INTO public.broker_bcc_addresses (broker_id, token)
VALUES ('<your-broker-uuid>', 'localdev1234')
ON CONFLICT (broker_id) DO NOTHING;
-- Local-part will be: bcc-localdev1234@mail.salebiz.com.au
```

### 4. Simulate an outbound BCC

```bash
curl -X POST http://localhost:3000/api/inbound/email \
  -H 'Content-Type: application/json' \
  -H 'x-salebiz-inbound-secret: local-dev-secret-change-me-anything' \
  -d '{
    "from": "broker.email@example.com",
    "to": ["buyer@example.com"],
    "bcc": ["bcc-localdev1234@mail.salebiz.com.au"],
    "subject": "Following up on the listing",
    "text": "Hi Joe,\n\nJust wanted to follow up — let me know if you have questions.\n\n-- Broker",
    "headers": { "Message-Id": "<test-1@local>" }
  }'
```

Expected response:

```json
{"ok":true,"logged":1,"direction":"outbound"}
```

### 5. Simulate an inbound reply

```bash
curl -X POST http://localhost:3000/api/inbound/email \
  -H 'Content-Type: application/json' \
  -H 'x-salebiz-inbound-secret: local-dev-secret-change-me-anything' \
  -d '{
    "from": "buyer@example.com",
    "to": ["bcc-localdev1234@mail.salebiz.com.au"],
    "subject": "Re: Following up on the listing",
    "text": "Thanks for following up — yes please send me the financials.",
    "headers": { "Message-Id": "<test-reply-1@local>" }
  }'
```

Expected response:

```json
{"ok":true,"logged":1,"direction":"inbound"}
```

(`direction: "inbound"` because the broker's verified email isn't in the From header.)

### 6. Verify in DB

```sql
SELECT kind, subject, metadata->>'direction' AS direction,
       metadata->>'via' AS via, occurred_at
FROM public.crm_activities
WHERE metadata->>'message_id' IN ('<test-1@local>', '<test-reply-1@local>')
ORDER BY occurred_at DESC;
```

Should show 2 rows: one `email_sent`, one `email_received`, both with `via='bcc_pipeline'`.

### 7. Once the client returns the production values

Replace your local dev values with theirs (or pull via `vercel env pull .env.local` if you have read access to the Vercel project):

```bash
# Update .env.local with the values they sent
SALEBIZ_INBOUND_DOMAIN=mail.salebiz.com.au
INBOUND_EMAIL_SECRET=<value the client shares>
```

Now the same curl tests will work against the deployed Vercel URL too.
