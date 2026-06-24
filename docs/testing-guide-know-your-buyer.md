# Know Your Buyer (KYB) — Overview & Testing Guide

A plain-language summary of what was added, and a simple step-by-step you can
follow to test it before handing it to the client.

---

## 1. What we added (high level)

**Before:** the CRM tracked buyers through pipeline stages (New Lead → … → Sold /
Lost) with Activity, Follow-ups, notes and per-listing stages. There was **no way
to verify a buyer's identity**.

**Now:** we added **Know Your Buyer** — identity verification powered by
**Sumsub** — without changing anything that worked before. What's new:

- A new **"Know Your Buyer" tab** on each buyer's profile (next to Listings &
  Enquiries).
- A new pipeline stage **"Know Your Buyer"** (sits right after *NDA Signed*).
- A **compliance form** the broker fills in for the buyer **on a specific
  listing**: full legal name, date of birth, residential address, purchasing
  structure (Individual / Company / Trust / Company as Trustee), company name,
  ACN/ABN, beneficial owner, source of funds, and the three risk questions
  (acting on behalf of another, beneficial owners offshore, PEP).
- A **"Send verification request"** button. The buyer gets an **email with a
  secure Sumsub link**, completes the ID check on their own phone/computer, and
  the **result comes back automatically**: the tab shows Approved / Rejected,
  and the buyer's **date of birth and address are pulled in from Sumsub**.
- The broker gets a **notification** (the bell) when a result lands.
- **(Company verification)** For Company/Trust buyers, an optional **"Company
  verification"** step that verifies the business and its beneficial owners.
  This only switches on when the company product is enabled in Sumsub.

**How the pieces connect:** Broker fills the form → clicks Send → buyer verifies
in Sumsub → Sumsub notifies SaleBiz → result is saved against the **buyer,
listing and broker** and shown in the tab.

> One Sumsub account serves all of SaleBiz. Records stay correctly linked to the
> broker and listing that started them. We never store ID documents — those live
> in Sumsub; we only store the result + the form.

---

## 2. One-time setup (before testing)

1. **Apply the database migrations** (Supabase → SQL editor, in this order):
   `20260620000001_contact_listing_status` →
   `20260621000001_contact_status_sold_lost` →
   `20260624000001_kyb_foundation`
2. **Environment values** (in `.env`) — the Sumsub sandbox token, secret and
   level are already set. Add a webhook secret (any value for local testing):
   ```
   SUMSUB_WEBHOOK_SECRET=local-test-secret-123
   ```
3. **Start the app:** `npm run dev`

> Until the migration is applied, the tab shows a friendly "apply the migration"
> message and Save/Send won't work — that's expected.

---

## 3. Test A — Quick check (no buyer phone, no tunnel) ✅ recommended first

This proves the whole pipeline using our test helpers.

- [ ] **Credentials work:** `npm run smoke:sumsub` → prints a Sumsub link.
      Opening that link shows the Sumsub flow. *(Already passing.)*
- [ ] **See the tab:** open any buyer who is in your CRM **and** linked to a
      listing → the **Know Your Buyer** tab appears.
- [ ] **Save the form:** fill a few fields → **Save details** → refresh the page
      → the values are still there.
- [ ] **Send the request:** click **Send verification request** → you see a
      success toast, and the email lands (check the buyer's inbox or your Resend
      dashboard). Status changes to **Link sent**.
- [ ] **Simulate an approved result:** copy the buyer's contact ID (the `id` in
      the URL `/dashboard/buyers/<id>`), then run:
      ```
      npm run test:sumsub-webhook <contactId> GREEN
      ```
      → the tab status flips to **Approved** and a **notification** appears in
      the bell.
- [ ] **Simulate a rejection:** `npm run test:sumsub-webhook <contactId> RED`
      → status becomes **Rejected**.
- [ ] **Security check:** the webhook only accepts correctly-signed requests —
      a tampered request is rejected with a 400 (the script proves the valid
      path; the app rejects anything else).

---

## 4. Test B — Real end-to-end (the actual buyer experience)

Do this once Test A passes, to confirm the real Sumsub round-trip.

1. Expose your local app publicly: `ngrok http 3000` → copy the `https://…`
   address.
2. In Sumsub → **Dev space → Webhooks → Create webhook**:
   - URL: `https://<your-ngrok>/api/sumsub/webhook`
   - Events: `applicantReviewed`, `applicantPending`, `applicantOnHold`,
     `applicantCreated`
   - Copy the secret it shows into `.env` as `SUMSUB_WEBHOOK_SECRET`, then
     restart `npm run dev`.
3. In the app: open a buyer → **Know Your Buyer** → fill form → **Save** →
   **Send verification request**.
4. Open the emailed link, complete the flow with Sumsub's sandbox test documents.
5. Force the outcome in Sumsub → **Dev space → Sandbox mode for verification
   testing** (set Approved or Rejected).
6. Back in SaleBiz: the tab updates automatically, DOB/address fill in, and the
   broker gets a notification.

---

## 5. Test C — Company verification (optional, only if enabled)

Only needed if the **company (KYB)** product is enabled in your Sumsub plan.

1. In Sumsub, create a company level and put its name in `.env` as
   `SUMSUB_COMPANY_LEVEL_NAME`, then restart.
2. In the buyer's KYB tab, set **Purchasing structure = Company / Trust /
   Company as Trustee**, enter the company name + ACN/ABN, **Save**.
3. A **Company verification** card appears → **Send company verification** →
   same email/link/result flow, and beneficial-owner results are stored.

---

## 6. Final checklist before handing to the client

- [ ] New "Know Your Buyer" tab visible on a buyer profile
- [ ] Form saves and reloads correctly
- [ ] Verification email is received with a working link
- [ ] An approved result shows **Approved** + DOB/address + a notification
- [ ] A rejected result shows **Rejected**
- [ ] The "Know Your Buyer" pipeline stage appears in the stage dropdowns
- [ ] Nothing in the existing CRM (stages, follow-ups, listings) changed/broke

> **For production:** the client generates their own Sumsub **production** app
> token, secret and webhook secret, sets up the verification level(s), and
> registers the live webhook URL. Everything else stays the same.
