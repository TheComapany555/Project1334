# Know Your Buyer (KYB) — End-to-End Test Guide

How to test the whole feature from the app (UI), in **sandbox**, and confirm it
works before handing to the client. The client later just swaps the sandbox
Sumsub values for production ones.

---

## What it does (one paragraph)

The broker opens a buyer, fills a short compliance form, and clicks **Send
verification request**. The buyer gets an email with a secure Sumsub link,
completes an ID check, and the result comes back automatically: the buyer's
**Know Your Buyer** tab shows **Approved / Rejected**, the verified date of birth
and address are filled in, and the broker gets a notification. For company/trust
buyers there's an optional company verification step.

---

## One-time setup (already mostly done)

1. **Database** — the 3 migrations are applied to the Supabase the deployed app
   uses (in order): `20260620000001` → `20260621000001` → `20260624000001`.
2. **Host env vars** (on salebiz.com.au's hosting, then redeploy):
   `SUMSUB_APP_TOKEN`, `SUMSUB_SECRET_KEY`, `SUMSUB_LEVEL_NAME=id-and-liveness`,
   `SUMSUB_WEBHOOK_SECRET` (= the webhook's secret).
3. **Webhook in Sumsub** (Dev space → Webhooks, **Sandbox** mode):
   URL = `https://www.salebiz.com.au/api/sumsub/webhook` (the `www.` matters),
   events `applicantReviewed` + `applicantPending` + `applicantOnHold` +
   `applicantCreated`.

> Status so far: endpoint, signature, secret and a real Sumsub webhook delivery
> are all verified working. This guide is the final UI confirmation.

---

## The end-to-end test (broker's point of view)

Do this on **www.salebiz.com.au**.

1. **Log in** as a broker.
2. Open a buyer who is **in your CRM and linked to a listing** (CRM → a contact,
   or a buyer profile). Go to the **Know Your Buyer** tab.
   - *If the tab says "add to CRM" or "link a listing", pick a buyer who has both.*
3. **Fill the form** (legal name, DOB, address, purchasing structure, etc.) →
   **Save details**. Refresh the page → the values should still be there.
4. Click **Send verification request**.
   - You see a success toast, and the **Identity verification** status changes to
     **Link sent**.
   - The buyer receives an email titled *"Complete your identity verification"*
     with a button/link. *(Use a buyer email you can open, or check your Resend
     dashboard for the outgoing email.)*
5. **Open the link** (on any device) and complete the Sumsub flow — in sandbox
   you can upload any sample image as the ID document and finish.
6. **Set the result in Sumsub** (sandbox doesn't auto-decide):
   - Sumsub → **Applicants** → open the applicant that just appeared →
     simulate the review result as **Approved (GREEN)** or **Rejected (RED)**.
   - *(Equivalent dashboard path: Dev space → Sandbox mode for verification
     testing.)*
7. **Back in SaleBiz**, on the buyer's Know Your Buyer tab:
   - The status flips to **Approved** (or **Rejected**).
   - **Date of birth** and **address** are filled in from Sumsub (on approval).
   - The **bell notification** shows "Identity verification approved/rejected".
   - The buyer's pipeline stage shows **Know Your Buyer**.

That's the full loop. ✅

---

## What you should see (success checklist)

- [ ] New **Know Your Buyer** tab on the buyer profile
- [ ] Form **saves** and persists after refresh
- [ ] **Email** with the verification link arrives
- [ ] Status goes **Link sent → In review → Approved/Rejected**
- [ ] On approval: **DOB + address** appear, pulled from Sumsub
- [ ] Broker gets a **notification**
- [ ] **"Know Your Buyer"** appears as a pipeline stage
- [ ] Existing CRM (stages, follow-ups, listings) is unchanged

---

## If something doesn't update — quick checks

1. **Sumsub → Dev space → Webhooks → delivery log.** Each result should show
   **HTTP 200**.
   - **400** = the `SUMSUB_WEBHOOK_SECRET` on the host doesn't match the
     webhook's secret. Re-copy it and redeploy.
   - **3xx / failed** = the URL is redirecting; make sure it's the **`www.`**
     host exactly.
   - **No entry at all** = the result wasn't simulated in Sumsub yet (step 6),
     or the webhook URL is wrong.
2. **Tab shows "apply the latest migration"** = the 3 migrations aren't applied
   on this deployment's database.
3. **"Sumsub isn't configured"** on Send = a `SUMSUB_*` env var is missing on
   the host (redeploy after adding).

---

## Company verification (optional)

Only if the company/KYB product is enabled in Sumsub: set
`SUMSUB_COMPANY_LEVEL_NAME`, then on a buyer with **Purchasing structure =
Company / Trust / Company as Trustee**, save the company name + ACN/ABN, and a
**Company verification** card appears with the same send/result flow.

---

## Handover to the client

The client only needs to: generate their **production** Sumsub app token +
secret, set up the verification level(s), create a **production** webhook
(pointing at their production URL), and replace the four `SUMSUB_*` env values.
Everything else is identical.
