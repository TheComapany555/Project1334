# End-to-End Testing Guide — 10 Client Requirements

This guide walks through every feature added for the 10 client requirements. Test in order — later features build on earlier ones (e.g., Bulk Email needs Contacts to exist).

---

## Prerequisites

### 1. Run pending migrations
From `Project1334/`:
```bash
# In your Supabase SQL editor or local psql, apply in order:
supabase/migrations/20260418000001_document_approval.sql
supabase/migrations/20260418000002_contact_tags.sql
supabase/migrations/20260418000003_contact_consent_and_interest.sql
supabase/migrations/20260418000004_featured_scope.sql
supabase/migrations/20260418000005_featured_pricing_per_category.sql
supabase/migrations/20260418000006_listing_share_invites.sql
supabase/migrations/20260418000007_enquiry_consent.sql
```

### 2. Required env vars
Confirm these exist in `.env.local`:
- `RESEND_API_KEY` (must be a real key — Resend test mode only delivers to your own verified address)
- `STRIPE_SECRET_KEY` (test mode is fine — `sk_test_…`)
- `STRIPE_WEBHOOK_SECRET` (run `stripe listen --forward-to localhost:3000/api/stripe/webhook` to get one for local)
- `NEXTAUTH_URL` and `NEXTAUTH_SECRET`
- `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`

### 3. Test accounts
Create or use existing:
- 1 admin account
- 1 broker account (call this **Broker A**)
- 1 broker account inside an agency, role=owner (call this **Agency Owner**)
- 1 broker inside the same agency, role=member (call this **Agency Member**)
- 1 buyer-style account for receiving emails (use a real inbox you control)
- 1 fresh email address that has *never* registered (for the external-share flow)

### 4. Start dev
```bash
cd Project1334 && npm run dev
# In another terminal for webhook testing:
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

### 5. Seed data
- At least 2 active categories in `categories` (e.g., "Cafe", "Childcare")
- At least 1 published listing per broker, with a category
- At least 1 listing in draft for status-change tests

---

## Feature 1 — Document Approval

**What changed:** Documents now upload as `pending` and are invisible to buyers until the broker approves them per-document.

### Test 1.1 — Upload defaults to pending
1. Sign in as **Broker A**
2. Open one of your listings → **Documents** tab
3. Upload a PDF
4. **Expect:** new row appears with status badge **Pending** (amber)

### Test 1.2 — Pending docs are hidden from public
1. Open the same listing in an incognito window at `/listing/{slug}`
2. Scroll to the documents section
3. **Expect:** the pending doc does **not** appear in the public list

### Test 1.3 — Approve makes it public
1. Back in the broker dashboard, on the doc row, open the actions menu → **Approve**
2. Reload the public listing page
3. **Expect:** doc now visible and downloadable

### Test 1.4 — Reject hides it
1. As broker, **Reject** the doc
2. Reload the public page → doc disappears
3. As broker, click **Reset** → doc returns to Pending

### Test 1.5 — Mobile API respects approval
```bash
curl http://localhost:3000/api/mobile/listings/public/{slug}
```
**Expect:** the JSON `documents[]` array only contains approved entries.

```bash
curl -X POST http://localhost:3000/api/mobile/documents/download \
  -H "Content-Type: application/json" \
  -d '{"document_id":"<pending-doc-id>"}'
```
**Expect:** 403 with an error about approval status.

---

## Feature 2 — External Sharing (NDA + Onboarding)

**What changed:** Brokers can email a listing to someone who isn't on the platform. The recipient lands on a magic-link page that walks them through NDA signing and account creation.

### Test 2.1 — Broker sends invite
1. As **Broker A**, go to Listings → published listing → row menu → **Send to new email**
2. Enter recipient name, fresh email (must NOT be registered), optional note
3. Click **Send invite**
4. **Expect:**
   - Toast success
   - Magic-link copied to clipboard / shown on the success card
   - An email arrives at the recipient address with broker avatar, listing card, NDA notice, and CTA button

### Test 2.2 — Recipient lands as new visitor
1. Open the magic link in an incognito window
2. **Expect:** Landing page shows 4 panels for choosing flow. Default for non-logged-in is **Create Account**

### Test 2.3 — Create account + sign NDA
1. Pick **Create Account** panel
2. Fill in name, password, sign the NDA pad
3. Submit
4. **Expect:**
   - Account created
   - Auto-signed in
   - Redirected to the listing page with full document access (subject to per-doc approval)

### Test 2.4 — Existing account flow
1. Send a new invite to an email that *is* already registered
2. Open the magic link in incognito
3. **Expect:** Landing shows **Existing Account** panel — log in, sign NDA, redirect

### Test 2.5 — Wrong logged-in account
1. Log in as a different user, then open the invite link
2. **Expect:** **Switch Account** panel offers logout + retry

### Test 2.6 — Expired token
1. In Supabase, manually set `expires_at` on the `listing_share_invites` row to a past timestamp
2. Reload the link
3. **Expect:** Expired view renders cleanly with a "request a new invite" message

---

## Feature 3 — Contact CRM

**What changed:** New `/dashboard/contacts` section with full CRUD.

### Test 3.1 — Sidebar entry visible
1. As any broker, look at the left nav
2. **Expect:** "Contacts" item with a person icon

### Test 3.2 — Add a contact manually
1. Go to **Contacts** → **Add contact**
2. Fill name, email, phone, interest, notes
3. Save
4. **Expect:** New row in shadcn data table

### Test 3.3 — Edit & delete
1. Row → menu → **Edit** → change name → save → toast + table updates
2. Row → menu → **Delete** → confirm in AlertDialog → row removed

### Test 3.4 — Search & consent filter
1. Add 2–3 contacts with different consent settings
2. Use the search bar to filter by name/email
3. Use the consent Select to filter "Marketing consent only"
4. **Expect:** table re-renders correctly each time

---

## Feature 4 — Enquiry Consent

**What changed:** Public enquiry form (web + mobile) has a consent checkbox; submitted enquiries record `consent_marketing` + `interest`.

### Test 4.1 — Web enquiry with consent
1. Open a published listing in incognito → fill the enquiry form
2. Add an "Interest" value, tick the consent checkbox
3. Submit
4. As broker, open **Enquiries** → click the new row
5. **Expect:** Sheet shows green "Marketing consent given" badge + Interest value

### Test 4.2 — Web enquiry without consent
1. Submit again, leaving consent unchecked, leaving Interest blank
2. **Expect:** Row badge shows "No consent"; Interest panel reads "Not specified"

### Test 4.3 — Mobile enquiry parity
1. In Expo app, open a listing → enquiry form
2. **Expect:** Custom Pressable + Check checkbox renders, Interest input is present
3. Submit with consent → broker dashboard shows it the same way

---

## Feature 5 — Add to Contact List from Enquiries

### Test 5.1 — Manual add from enquiry
1. As broker, open an enquiry detail
2. Click **Add to contact list**
3. **Expect:** Toast success, contact appears at `/dashboard/contacts` with the enquirer's email + interest pre-filled

### Test 5.2 — Idempotency
1. Click **Add to contact list** again on the same enquiry
2. **Expect:** Either disabled state or graceful "already in your contacts" response — no duplicate row

---

## Feature 6 — Email Listings to Contacts (single + bulk)

**What changed:** New `/dashboard/listings/{id}/share` UI selects contacts and sends a templated email per recipient.

### Test 6.1 — Send to one contact
1. As broker, ensure at least 1 contact has `consent_marketing=true`
2. Listings → published listing → row menu → **Share with contacts**
3. Select 1 contact, optionally add a personal note (≤600 chars)
4. Send
5. **Expect:**
   - Result card shows "1 sent, 0 skipped"
   - Recipient inbox has the listing email (broker company in header, amber custom-message block, listing card, unsubscribe footer)

### Test 6.2 — Send to multiple
1. Select 5+ contacts (mix of consent + no consent)
2. Send
3. **Expect:**
   - Contacts without consent appear in "Skipped" count
   - Resend `batch.send` chunked at 100 (check Resend dashboard for one batch call)

### Test 6.3 — Tag filter helps targeting
1. Tag some contacts as "VIP" (see Feature 8)
2. On the share page, filter by VIP tag
3. **Expect:** picker shows only VIP contacts

### Test 6.4 — Audit trail
1. After sending, query Supabase:
   ```sql
   select * from listing_share_invites
   where send_type='contact' and listing_id='<id>'
   order by created_at desc;
   ```
2. **Expect:** one row per recipient

---

## Feature 7 — Bulk Email

Covered in Feature 6 (the share UI handles 1..N contacts uniformly). Specifically verify:

### Test 7.1 — Batch resilience
1. Send to 100+ contacts in one go (seed test data if needed)
2. Force a transient batch failure (temporarily set `RESEND_API_KEY` to invalid for the chunk, or use mock)
3. **Expect:** falls back to per-email send, partial successes still recorded; result card shows accurate counts

---

## Feature 8 — Contact Tagging

### Test 8.1 — Create tags
1. Contacts page → tag manager → add tags: "VIP", "Investor", "Buyer"
2. **Expect:** colored chips appear in the manager and as filter chips above the table

### Test 8.2 — Assign tags
1. Edit a contact → use the multi-select popover to add VIP + Investor
2. Save
3. **Expect:** chips appear in the contact's row, removable with X

### Test 8.3 — Filter by tag
1. Click VIP filter chip
2. **Expect:** table narrows to VIP contacts only

### Test 8.4 — Rename / delete tag
1. Tag manager → click a tag → rename inline (Enter to save, Escape to cancel)
2. Delete a tag → AlertDialog confirms → tag removed from all contacts

---

## Feature 9 — Featured Listings (scope-aware)

**What changed:** Brokers self-serve featured upgrades scoped to homepage, a category, or both.

### Test 9.1 — Admin creates featured products
1. Sign in as **admin** → `/admin/products` → **Add plan**
2. Create 3 products:
   - Type: Featured, Scope: **Homepage**, Price $99, Duration 7 days
   - Type: Featured, Scope: **Category page**, Category: **Cafe**, Price $49, Duration 7 days
   - Type: Featured, Scope: **Homepage + Category**, leave category empty (applies to all), Price $129, Duration 14 days
3. **Expect:** Products table shows Type/Scope/Category columns correctly populated

### Test 9.2 — Broker sees scope-appropriate options
1. As **Broker A**, go to a published Cafe listing → row menu → **Feature this listing**
2. **Expect:** 3 cards visible: Homepage / Category page / Both
3. Click **Category page** → only the $49 Cafe-priced option shows
4. Click **Homepage** → only the $99 option shows
5. Click **Both** → only the $129 option shows

### Test 9.3 — Broker on a non-Cafe listing
1. Open a Childcare listing's feature page
2. **Expect:** **Category page** card shows reason "No packages priced for Childcare" (disabled), unless you also seeded a Childcare-scoped product
3. Homepage + Both cards still selectable

### Test 9.4 — Stripe checkout flow
1. Select Homepage → $99 → **Continue to payment**
2. Use Stripe test card `4242 4242 4242 4242`, any future expiry, any CVC
3. Complete payment
4. **Expect:**
   - Redirect back to dashboard with success state
   - In `stripe listen` terminal: `checkout.session.completed` fires
   - In Supabase `listings`:
     - `featured_homepage_until` = now + 7 days
     - `featured_category_until` = unchanged (NULL)
     - `featured_until` = max of both = same as homepage
     - `featured_scope = 'homepage'`
     - `is_featured = true`
   - In Supabase `payments`: row with `featured_scope='homepage'`, `featured_category_id=null`

### Test 9.5 — Buy a category-only feature
1. On a Cafe listing, pick **Category page** → $49 → checkout
2. **Expect:**
   - `featured_category_until` set
   - `featured_homepage_until` unchanged
   - `featured_until` = max of both

### Test 9.6 — Extension stacks correctly
1. With both untils set from 9.4 + 9.5, buy **Homepage** again
2. **Expect:** new `featured_homepage_until` = previous homepage until + 7 days (not now + 7)

### Test 9.7 — Featured on the right surface only
1. After Test 9.5 (Cafe-only feature), go to homepage `/`
2. **Expect:** the listing does NOT appear in the featured-promoted slot (it's only category-featured)
3. Go to `/search?category=cafe`
4. **Expect:** the listing ranks first (category-featured)
5. After Test 9.4 (homepage-only), reverse: appears on homepage but not promoted at top of category page

### Test 9.8 — Featured badge still renders
The legacy `featured_until` is kept in sync as max() of both — so the amber Featured badge appears whenever any scope is active. Confirm on listing card.

---

## Feature 10 — Category-Based Pricing

Mostly covered in Feature 9. Specific verification:

### Test 10.1 — Different price per category
1. Admin creates "Featured – Childcare" at $79, scope=Category, category=Childcare
2. Confirm Cafe is still $49 from earlier
3. As broker, open a Childcare listing's feature page → Category card → **Expect** $79 option
4. Open a Cafe listing's feature page → **Expect** $49 option

### Test 10.2 — Category-specific products don't leak
1. As broker on a Childcare listing, **Expect** the $49 Cafe product is NOT shown
2. Vice versa for Cafe listings

### Test 10.3 — "All categories" bundle product
1. Admin creates a "Both" product with category left empty
2. **Expect:** any listing's "Both" picker shows it
3. Admin creates a "Both" product pinned to a category
4. **Expect:** only that category's listings see it

---

## Regression checks

Run these after the above to confirm nothing existing broke:

### R1 — Status transitions still work
1. As broker, draft → publish → under_offer → sold flow on a test listing
2. **Expect:** all transitions work; sold blocks further changes

### R2 — Image uploads
1. Add 3 images to a listing
2. **Expect:** thumbnails render, drag-reorder persists

### R3 — Existing buyer enquiries
1. Submit an enquiry on a public listing without filling Interest or consent
2. **Expect:** enquiry succeeds; broker sees "No consent" / "Not specified"

### R4 — Auth flows still clean
1. Sign out / sign back in as broker
2. **Expect:** no JWT_SESSION_ERROR floods (the silenced logger keeps real errors visible)

### R5 — Admin listings table unchanged
1. Visit `/admin/listings` — verify nothing in the columns broke

---

## Common gotchas

- **Resend can only send to verified domains** in production-like mode. For local dev use a Resend sandbox sender (e.g., `onboarding@resend.dev`) or send only to your own inbox.
- **Stripe webhook needs `stripe listen`** running locally, otherwise feature purchases never apply to the listing.
- **Pending docs are invisible by design** — if a buyer reports "I uploaded a doc and can't see it on the public page," check the broker's approval status first.
- **`getCategories()` filters `active=true`** — if a category is inactive, it won't appear in the admin product form's dropdown either. Activate it first.
- **Tier vs Featured are different** — `listing_tier` (basic/standard/featured) is the visibility tier set at create-time; "Featured" upgrade products are time-boxed boosts on top of that. Don't confuse them.

---

## Quick smoke-test checklist (15 min)

If you're short on time, run just these:

- [ ] Upload doc → pending → approve → public can see it
- [ ] Send external invite → recipient creates account → lands on listing
- [ ] Add contact, tag as VIP, filter by VIP
- [ ] Submit enquiry with consent → broker sees consent badge → adds to contact list
- [ ] Share a listing with 1 consented + 1 unconsented contact → result shows 1 sent, 1 skipped
- [ ] Admin creates Cafe-only $49 featured product → broker on Cafe listing buys it via Stripe test card → only `featured_category_until` populated → homepage doesn't promote it, category page does
