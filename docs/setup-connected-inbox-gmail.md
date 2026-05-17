# Connected Inbox (Gmail) — Setup Guide

> **For the client.** Step-by-step, no code involved. ~20 minutes total.

---

## What this gives you

After this setup, every broker on Salebiz can connect their personal/work Gmail in **one click**. From then on, emails sent through the Salebiz composer:

- Go through the broker's **own Gmail account** (not Salebiz's address)
- Land in the broker's **Sent folder** like any normal email
- Get replies in the broker's **normal inbox** (no forwarding magic)
- Are still **auto-logged** to the CRM timeline

This is exactly the model HubSpot, Pipedrive, and Salesforce use. **No DNS changes needed.**

---

## Why we need you to do this

The Google integration has to be owned by **your** company Google account — we can't create it from our end because:

- The OAuth consent screen shows your company name + logo to brokers
- The Gmail API quota counts against your project
- Verification (Part 3) requires your privacy policy + your domain ownership

We've written this guide so it's straightforward to follow without engineering help. If you hit any blocker, send a screenshot.

---

## Three things you'll send back to us

When you're done with Parts 1 + 2, send these three values **via password manager** (1Password / Bitwarden — **not** plain email or Slack). The second and third are sensitive.

```
GOOGLE_CLIENT_ID            = ...
GOOGLE_CLIENT_SECRET        = ...
EMAIL_TOKEN_ENCRYPTION_KEY  = ...
```

Plus one action: **enable the Gmail API** on your Google project (Step 1.2 — easy to miss).

---

# Part 1 — Google Cloud setup (15 minutes)

## Step 1.1 — Create the Google Cloud project

1. Go to https://console.cloud.google.com
2. Sign in with the **Google account that should own this integration** (your company Google account, not a personal one)
3. Top-left → click the project dropdown → **NEW PROJECT**
4. Project name: `Salebiz`
5. Click **CREATE**, wait ~10 seconds
6. Click the project dropdown again → **select Salebiz**

You should now see "Salebiz" at the top of the page next to the Google Cloud logo.

## Step 1.2 — Enable the Gmail API

This is the most commonly missed step. Without it, the OAuth connection works but sending emails fails.

1. Left sidebar → **APIs & Services** → **Library**
2. Search box → type `Gmail API`
3. Click the **Gmail API** card (the one by Google)
4. Click the blue **ENABLE** button
5. Wait ~15 seconds. The page refreshes — you should see green "API enabled".

✅ Gmail API is now on for your project.

## Step 1.3 — Configure the consent screen

This is what users see when clicking "Connect Gmail".

1. Left sidebar → **APIs & Services** → **OAuth consent screen**
2. User Type → **External** → **CREATE**
3. **App information:**
   - App name: `Salebiz`
   - User support email: your support email (e.g. `support@salebiz.com.au`)
   - App logo: upload your Salebiz logo (recommended — needed for verification later)
4. **App domain** (very important for verification):
   - Application home page: `https://your-live-domain.com`
   - Application privacy policy link: `https://your-live-domain.com/privacy`
   - Application terms of service link: `https://your-live-domain.com/terms`
5. **Authorized domains** → click **+ ADD DOMAIN** → enter your live domain (e.g. `salebiz.com.au`) — **no `https://`, no path, just the domain**
6. **Developer contact information:** your email
7. Click **SAVE AND CONTINUE**

## Step 1.4 — Add the required scope

1. On the **Scopes** screen → click **ADD OR REMOVE SCOPES**
2. Filter / search box → paste: `gmail.send`
3. In the results, find this exact scope and tick it:
   ```
   https://www.googleapis.com/auth/gmail.send
   ```
   Description: "Send email on your behalf"
4. Click **UPDATE** → **SAVE AND CONTINUE**

You'll also see `openid`, `email`, and `profile` automatically included — that's fine, leave them on.

## Step 1.5 — Add test users (so brokers can connect before verification)

While the app is unverified, only **test users you explicitly list** can use it.

1. On the **Test users** screen → click **+ ADD USERS**
2. Enter every broker's Gmail address (or whatever address they'll connect — must be a Google account)
3. Add up to 100 users
4. **SAVE AND CONTINUE**

You can add more test users later from the same screen. **Until Google verifies the app, brokers not on this list will hit "Access blocked".**

## Step 1.6 — Publish to "In production" status

Even unverified, set the status to "In production" so testing-mode token expiry doesn't bite you.

1. Back on the **OAuth consent screen** main page
2. Find the **Publishing status** box → click **PUBLISH APP**
3. Confirm

The app is now "In production" but **unverified**. The yellow warning still appears for brokers when connecting, only test users can connect — and verification is what removes both of those (Part 3).

## Step 1.7 — Create the OAuth credentials

These are the first two values you'll send back to us.

1. Left sidebar → **APIs & Services** → **Credentials**
2. Top → **+ CREATE CREDENTIALS** → **OAuth client ID**
3. Application type: **Web application**
4. Name: `Salebiz Connected Inbox`
5. **Authorized JavaScript origins** → click **+ ADD URI** → add both:
   - `https://your-live-domain.com`
   - `http://localhost:3000` (so we can test locally too)
6. **Authorized redirect URIs** → click **+ ADD URI** → add both:
   - `https://your-live-domain.com/api/auth/google/callback`
   - `http://localhost:3000/api/auth/google/callback`
7. Click **CREATE**

A popup shows:
- **Client ID** (long string ending in `.apps.googleusercontent.com`)
- **Client secret** (starts with `GOCSPX-`)

**Click "Download JSON"** to save these — or copy both values somewhere safe. These are values #1 and #2 to send back to us.

---

# Part 2 — Encryption key + Vercel setup (5 minutes)

## Step 2.1 — Generate the encryption key

This is value #3. It's used by Salebiz to encrypt every broker's Gmail refresh token at rest, so even with database access nobody can use the tokens.

In a terminal on your computer:

```bash
openssl rand -base64 32
```

You'll get something like:

```
uZ1cKZHnZrZFNT62sPsJwzr3NmOsR94ebavq9JbCwAA=
```

**Copy this string.**

> **Important:** keep this key safe. If it's lost, every connected broker has to reconnect. If it's leaked, anyone with database access could decrypt the refresh tokens.

## Step 2.2 — Add the three env vars to Vercel

1. Go to https://vercel.com → your team → the Salebiz project
2. **Settings** → **Environment Variables**
3. Add each of these three. For each one:
   - Set the **Name** (exact spelling, case-sensitive)
   - Paste the **Value**
   - Tick **Production** AND **Preview**
   - Click **Save**

| Name | Value |
|---|---|
| `GOOGLE_CLIENT_ID` | The long string ending in `.apps.googleusercontent.com` from Step 1.7 |
| `GOOGLE_CLIENT_SECRET` | The string starting with `GOCSPX-` from Step 1.7 |
| `EMAIL_TOKEN_ENCRYPTION_KEY` | The base64 string from Step 2.1 |

Mark `GOOGLE_CLIENT_SECRET` and `EMAIL_TOKEN_ENCRYPTION_KEY` as **Sensitive** if Vercel offers the option.

## Step 2.3 — Apply the database migration

We've prepared a migration file. Run it in Supabase:

1. Open https://supabase.com → your project → **SQL Editor** → **New query**
2. Paste the entire contents of:
   ```
   supabase/migrations/20260511000001_broker_email_accounts.sql
   ```
3. Click **RUN**
4. Verify with:
   ```sql
   SELECT to_regclass('public.broker_email_accounts');
   ```
   Should return `broker_email_accounts` (not null).

## Step 2.4 — Redeploy on Vercel

Env var changes don't apply until rebuild:

1. Vercel → **Deployments** tab
2. Find the latest Production deployment → click the **⋮** menu → **Redeploy**
3. Wait for it to go green (~2-3 minutes)

## Step 2.5 — Send back to the dev team

Via 1Password / Bitwarden secure share:

```
GOOGLE_CLIENT_ID            = (from Step 1.7)
GOOGLE_CLIENT_SECRET        = (from Step 1.7)
EMAIL_TOKEN_ENCRYPTION_KEY  = (from Step 2.1)
```

## Step 2.6 — Smoke test

1. Open the live Salebiz site → log in as a broker (must be a test user from Step 1.5)
2. **Dashboard → Workspace → Profile tab**
3. At the top: **Connected inbox** card
4. Should show "Not connected yet" with a **Connect Gmail** button
5. Click it → Google's consent screen → click **Advanced → Go to Salebiz (unsafe) → Continue → Allow**
6. You should land back on Salebiz with a green toast: "Gmail connected — emails now send from your inbox."
7. The card flips to show your Gmail address with a green checkmark.

Then send a test email from CRM to verify the full flow:

1. `/dashboard/contacts` → click any contact (with an email you can receive) → **Email**
2. Type subject + body → **Send email**
3. Check **your Gmail Sent folder** — email is there
4. Check the **recipient's inbox** — `From:` is your Gmail address, not `noreply@salebiz.com.au`

✅ Connected Inbox is live for the test users you added.

---

# Part 3 — Get the app verified (remove warning + 100-user cap)

Right now your brokers see this when connecting:

> ⚠️ **Google hasn't verified this app** — The app is requesting access to sensitive info...

That's because we're using a "restricted" scope (`gmail.send`) and Google hasn't reviewed the app yet. To make the warning disappear AND remove the 100-test-user cap, submit the app for verification.

**It's bureaucratic, not technical. 2–6 weeks first time. Your app keeps working in testing mode while it's pending.**

## What Google requires

1. ✅ Publicly hosted **Privacy Policy URL** on your verified domain
2. ✅ Publicly hosted **Terms of Service URL** on your verified domain
3. ✅ A **3-minute demo video** on YouTube (Unlisted is fine)
4. ✅ **Domain ownership** verified via Google Search Console
5. ✅ A **CASA security assessment** (free, automated)

## Step 3.1 — Privacy policy + terms language

Your existing privacy policy needs to explicitly mention Gmail integration. Add this paragraph (or close paraphrase):

> **Gmail Integration.** Salebiz offers an optional "Connected Inbox" feature that allows brokers to authorise Salebiz to send emails on their behalf through their Gmail account via the `https://www.googleapis.com/auth/gmail.send` OAuth scope. Salebiz **does not** request or use any other Gmail permission, and we do **not** read, modify, or delete the user's emails. We only call Gmail's send endpoint to deliver emails the user has composed in Salebiz. We retain the resulting Gmail Message ID for the broker's CRM activity log; we do not retain inbox content. OAuth refresh tokens are encrypted at rest with AES-256-GCM and are never exposed to any client. Users can revoke this access at any time from within Salebiz or at https://myaccount.google.com/permissions. Salebiz's use and transfer of information received from Google APIs adheres to the [Google API Services User Data Policy](https://developers.google.com/terms/api-services-user-data-policy), including the Limited Use requirements.

Get this onto `https://your-domain.com/privacy` before submitting.

## Step 3.2 — Verify domain ownership

1. Go to https://search.google.com/search-console (Google Search Console)
2. Add a property → enter your domain (e.g. `salebiz.com.au`)
3. Verify via DNS TXT record (Google gives you the exact value to add)
4. Once verified, the domain shows under "Verified domains" in your OAuth consent screen settings

## Step 3.3 — Record the demo video

~3 minutes, hosted on YouTube (Unlisted is fine). Demonstrate:

1. **The OAuth flow** — show a broker clicking Connect Gmail, the consent screen with `gmail.send` clearly displayed, granting permission
2. **How the data is used** — show a broker composing an email in Salebiz, sending it, the email appearing in their Gmail Sent folder
3. **Where consent is revoked** — show the Disconnect button in the UI + mention they can also revoke at https://myaccount.google.com/permissions
4. **Narrate** that you only request `gmail.send` and don't read inbox content

Record your screen, narrate the steps. Final cut under 3 minutes. Upload to YouTube as Unlisted, get the link.

## Step 3.4 — Submit for verification

1. Google Cloud Console → **APIs & Services** → **OAuth consent screen**
2. Look for the **"Prepare for verification"** or **"Submit for verification"** button (or a notification banner prompting you to submit)
3. Click it. Google walks you through a form asking:
   - Privacy Policy URL → paste yours
   - Terms of Service URL → paste yours
   - YouTube demo link → paste yours
   - Justification for the `gmail.send` scope → see Step 3.5
   - Authorized domains → confirm your domain is listed
4. Submit

## Step 3.5 — Sample justification text

Google asks "Why do you need this scope?" Paste something close to this:

> Salebiz is a CRM platform for business brokers. Brokers send emails to buyers as part of their daily workflow. The `gmail.send` scope lets a broker compose an email in Salebiz and have it sent through their own Gmail account, so the email appears authentically from the broker (not from a generic Salebiz address) and replies are received in the broker's normal inbox.
>
> We **do not** request or use any other Gmail scope. We do not read, modify, delete, or store the user's emails. We only call `gmail.users.messages.send` to send emails the broker has composed in our app. We retain the resulting Gmail Message ID for the broker's CRM activity log; we do not retain message body or recipient information beyond what the broker has already typed into our app.
>
> OAuth tokens are encrypted at rest (AES-256-GCM) and never exposed to any client. Users can revoke access via the Disconnect button in our app or at https://myaccount.google.com/permissions at any time.

Adjust to match your privacy policy.

## Step 3.6 — Complete CASA assessment

CASA = Cloud Application Security Assessment. After you submit, Google emails you a link to fill out the CASA questionnaire — answer truthfully:

- Hosting: Vercel
- Database: Supabase (PostgreSQL)
- Authentication: NextAuth + Google OAuth
- TLS: Yes (HTTPS-only, enforced by Vercel)
- OAuth scopes used: `gmail.send`, `openid`, `email`, `profile`
- Token storage: encrypted at rest with AES-256-GCM
- No data shared with third parties

Submit. Google's auditor runs automated scans on your live HTTPS domain.

## Step 3.7 — Wait for approval

Typical timeline:
- Initial review: **1–2 weeks**
- CASA scan: **1–2 weeks** (runs in parallel)
- Total: **2–6 weeks** start to finish

Google may come back asking for clarifications — respond promptly to keep the clock moving.

**While verification is pending, the app keeps working** for the test users you added in Step 1.5.

## Step 3.8 — After approval

When Google emails you the approval:

1. The yellow "Google hasn't verified this app" warning **disappears**
2. The 100-test-user cap is **removed** — any broker with any Google account can connect
3. No code changes needed on your side — the existing OAuth client just stops triggering the warning

✅ You're done. Full production rollout.

---

# Checklist

Before you call the dev team to wire it up, tick these:

**Part 1 — Google Cloud**
- [ ] 1.1 — Project "Salebiz" created
- [ ] 1.2 — **Gmail API enabled** (most common miss)
- [ ] 1.3 — OAuth consent screen configured with privacy + terms URLs
- [ ] 1.4 — `gmail.send` scope added
- [ ] 1.5 — Test users added (at least your own Gmail)
- [ ] 1.6 — App published to "In production" status (still unverified)
- [ ] 1.7 — OAuth Client ID + Secret generated, with both prod + localhost redirect URIs

**Part 2 — Vercel + Supabase**
- [ ] 2.1 — Encryption key generated
- [ ] 2.2 — Three env vars set in Vercel (Production + Preview)
- [ ] 2.3 — Migration applied in Supabase
- [ ] 2.4 — Vercel redeployed
- [ ] 2.5 — Three env values securely shared with dev team
- [ ] 2.6 — Smoke test: broker connected + sent test email

**Part 3 — Verification (do whenever ready)**
- [ ] 3.1 — Privacy policy updated with Gmail integration language
- [ ] 3.2 — Domain verified in Google Search Console
- [ ] 3.3 — Demo video recorded + uploaded to YouTube
- [ ] 3.4 — Submitted for verification
- [ ] 3.6 — CASA questionnaire completed
- [ ] 3.8 — Approval email received → warning disappears

---

# Troubleshooting

| Problem | Cause | Fix |
|---|---|---|
| "Gmail API has not been used in project..." error when sending | **Gmail API not enabled** | Step 1.2 — enable Gmail API |
| "Access blocked: Salebiz has not completed verification" when connecting | User is not on the test-users list | Step 1.5 — add them to test users |
| `connect_error=missing_refresh_token` after connecting | Stale prior grant interfering | Revoke at https://myaccount.google.com/permissions → reconnect |
| `connect_error=fetch%20failed` in dev | Local Node.js or VPN blocking outbound to Google | Disable VPN, restart `npm run dev` |
| Toast appears but card still shows "Not connected" | DB row didn't write — migration missing | Step 2.3 — apply migration |
| Connect works locally but not in production | Redirect URI in Step 1.7 doesn't include the live domain | Add `https://your-live-domain.com/api/auth/google/callback` → wait 5 min for propagation |
| "redirect_uri_mismatch" error | URI in Step 1.7 has a typo / different path | Compare exactly to the URL bar at the moment of the error |

---

# FAQ

**Will Google see our customer emails?**
No. We only request `gmail.send`, which can only send mail — not read it. The OAuth consent screen explicitly tells the broker this. We don't see, store, or process inbox content.

**What happens if a broker doesn't use Gmail?**
The composer still works — it falls back to Resend (sending from `noreply@salebiz.com.au` with the broker's email as Reply-To). They can also use **Log past email** to paste in emails they sent from any other client.

**Can we add Outlook support?**
Yes. Microsoft Graph follows the same pattern with `Mail.Send` scope. Lower verification overhead than Google. Reach out to the dev team if you want this added.

**Cost?**
Free. Google's Gmail API is free up to ~1 billion quota units / day (well beyond anything realistic). Vercel env vars are free. Tokens stored in your existing Supabase. No new third-party invoice.

**What if a broker revokes from Google's side?**
Salebiz detects the failed token refresh, marks the connection `error` in the UI, and prompts the broker to reconnect. No emails get lost — composer falls back to Resend until they reconnect.

**Can multiple brokers share one Google project?**
Yes — that's exactly the model. One Google project for Salebiz; every broker on Salebiz uses it independently. Tokens are per-broker, isolated by `broker_id` in the database.

**What if we change the `EMAIL_TOKEN_ENCRYPTION_KEY` later?**
All existing connections fail to decrypt and need to be reconnected. Only rotate in an emergency (suspected leak) — coordinate as a single operation with the dev team.

---

> **Got stuck on any step?** Take a screenshot and send it to the dev team. We've got logs on our side too and can usually pinpoint the issue within a few minutes.
