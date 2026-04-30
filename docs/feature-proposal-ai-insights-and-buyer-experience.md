# Salesbiz — AI Insights & Buyer Experience Upgrade

**Prepared for:** Client
**Date:** 29 April 2026
**Status:** Proposal / Implementation Plan

---

## 1. Overview

This document consolidates the three feature areas you've asked for and explains how we'll deliver them using the data and infrastructure already in the platform. Where a feature unlocks an obvious next step (or where AI can do extra heavy lifting), we've added a short "Bonus Ideas" section at the end so you can decide what to include.

The three areas are:

1. **AI Insights for Sellers** — numbers + plain-English explanation, Xero-style.
2. **Buyer Dashboard Polish** — auto-saved listings, auto-fill enquiries, broker-sent listings.
3. **Buyer Listing Alerts** — match buyer preferences against new listings and notify them.

Everything below is built on top of what we already track (`listing_views`, `enquiries`, `call_tracking`, `nda_documents`, `notifications`, `user_role_favorites`, etc.) — we're not adding new tracking, just making the existing data work harder.

---

## 2. AI Insights for Sellers (Xero-style)

### 2.1 What the seller will see

On each listing page in the broker dashboard, an **AI Insights** panel will sit above the existing analytics chart. It has three parts, in this order:

1. **The numbers** (a clean stat grid)
2. **A short performance summary** (1–2 sentences)
3. **2–3 suggested actions** (bulleted)
4. **A copy-ready seller update message** (the broker can copy/paste or send straight to the seller)

### 2.2 The numbers we'll show

All ten metrics you listed are already being tracked. Here's how we'll source each:

| Metric | Source (already in DB) |
|---|---|
| Total Views | `listing_views` (count) |
| Unique Visitors | `listing_views` (distinct `user_id` + `ip_address`) |
| Repeat Visitors | `listing_views` grouped by visitor where count > 1 |
| Enquiries | `enquiries` (count by `listing_id`) |
| Calls | `call_tracking` (count by `listing_id`) |
| NDA Requests | `nda_documents` where status = requested |
| NDA Signed | `nda_documents` where status = signed |
| Documents Viewed | `document_approval` view events |
| Saved Listings | `user_role_favorites` (count) |
| Days Listing Live | `now() - listings.published_at` |

We'll add a **time filter** (7 days / 30 days / All time) so the broker can compare periods — exactly like Xero's date range.

### 2.3 How the AI part works

A single API endpoint (`/api/ai/listings/insights`) takes a `listing_id`, pulls the metric snapshot, and sends it to Claude with a structured prompt. The response is JSON with three fields: `summary`, `actions[]`, `seller_message`.

Example output for a listing with strong returning interest:

> **Summary:** Your listing received 248 views, 17 enquiries, and 6 NDA requests this month, with several returning buyers showing strong interest.
>
> **Suggested actions:**
> - Follow up with the 3 returning visitors who haven't enquired yet.
> - Send the IM to the 6 NDA signers — only 2 have viewed documents.
> - Consider boosting the listing as Featured for the next 14 days while interest is hot.
>
> **Seller update:**
> *"Hi [Seller], quick update on your listing — we've had 248 views and 17 enquiries this month, with 6 buyers signing NDAs. A few are returning visitors, which is a strong buying signal. We'll move on the strongest leads this week."*

### 2.4 Performance & cost

- The AI response is **cached for 6 hours per listing** so we don't re-call Claude on every page load.
- Re-generation is triggered automatically when a meaningful event happens (new enquiry, new NDA signed) or when the broker clicks "Refresh insights".
- We'll use Claude Haiku 4.5 for this — fast and cheap, well-suited to short structured summaries.

### 2.5 What it touches in the codebase

- **New:** `app/api/ai/listings/insights/route.ts`
- **New:** `components/ai/listing-insights-panel.tsx`
- **Updated:** `app/dashboard/analytics/analytics-dashboard.tsx` (mount the panel)
- **No DB migration needed** — all metrics come from existing tables.

---

## 3. Buyer Dashboard Polish

Three quick wins that make the buyer side feel professional. None of these require new tracking — they're stitching together what's already there.

### 3.1 Auto-add to Saved Listings on enquiry

**Behaviour:** When a buyer submits an enquiry, the listing is automatically added to their `user_role_favorites` (Saved Listings) if it's not already there.

**Implementation:** One extra insert inside the existing enquiry handler — done in the same transaction so it never half-saves.

**Where:** `app/api/enquiries/...` (existing route) and the mobile equivalent in `app/api/mobile/`.

### 3.2 Auto-fill buyer details

**Behaviour:** On any enquiry form, name / email / phone come pre-filled from the buyer's profile if logged in. For not-logged-in buyers, we remember the last enquiry's details in a secure cookie (30 days) and pre-fill from that on the next enquiry.

**Implementation:** Server-side prefill from `profiles` for authenticated users; a signed cookie for guests. No new tables.

**Privacy note:** The guest cookie is encrypted and only contains contact fields the buyer has already chosen to submit.

### 3.3 Broker-sent listings → in-app notification + dashboard section

**Behaviour:** When a broker sends a listing to a buyer (the existing `listing_share_invites` flow), the buyer gets:

- An in-app notification ("[Broker name] sent you a listing")
- A dedicated **Sent to me** section in the buyer dashboard, alongside Saved Listings
- The same listing also appears in their Saved Listings automatically

**Implementation:**

- Add a new notification `type` enum value: `listing_shared_by_broker` (small DB migration, additive only).
- Insert a notification row when `listing_share_invites` is created.
- New route: `/dashboard/buyer/received` with the list. Reuses existing listing card components.

### 3.4 Buyer dashboard side panel

A simple left-rail component for buyers. This already exists for brokers — we extend it with a **buyer-only** variant that shows:

- My Enquiries
- Saved Listings
- Sent to Me (new)
- My Alerts (new — see Section 4)
- Profile

No new DB work; this is purely UI assembly.

---

## 4. Buyer Listing Alerts

This is the largest piece of new work. It's still simple matching — no machine learning, no embeddings — but it does need new tables.

### 4.1 What the buyer does

A new page: `/dashboard/buyer/alerts`. The buyer can:

- Add one or more **alert preferences**, each with:
  - Business Type / Category (multi-select from existing `categories` table)
  - Location (state, suburb, or "any in state")
  - Price range (min/max)
  - Industry (optional, multi-select)
- Toggle each alert on/off
- Edit or delete alerts
- Choose channel: **Email**, **In-app**, or **Both** (default: Both)

### 4.2 What happens when a matching listing is posted

When `listings.status` flips to `published`, a Postgres trigger fires a job that:

1. Finds all active `buyer_alerts` whose criteria match the new listing.
2. For each match, inserts a notification row (`type = 'listing_match_alert'`).
3. For each match where channel includes email, queues an email via the existing transactional email pipeline.
4. Adds the listing to a new **Recommended** section in the buyer dashboard (separate from Saved — buyers haven't actively saved it yet).

### 4.3 Matching logic

Plain SQL — no AI needed for the match itself. A listing matches a buyer alert if **all** of the following are true:

- Category overlaps (alert categories ∩ listing categories not empty)
- Location matches at the chosen granularity (alert state = listing state, OR alert suburb = listing suburb if specified)
- Listing price is within `[alert.min_price, alert.max_price]` (NULLs treated as open-ended)
- Industry overlaps if the alert specifies any

We deliberately keep this exact-match. Fuzzy/AI matching is in Bonus Ideas below.

### 4.4 New schema (one migration)

```
buyer_alerts (
  id uuid pk,
  user_id uuid fk -> users,
  name text,                          -- e.g. "Café in Sydney"
  categories uuid[],                  -- references categories
  state text,
  suburb text,
  min_price numeric,
  max_price numeric,
  industries text[],
  channel text check in ('email','in_app','both'),
  is_active boolean default true,
  created_at, updated_at
)

buyer_alert_matches (
  id uuid pk,
  alert_id uuid fk,
  listing_id uuid fk,
  matched_at timestamptz,
  notified_email boolean,
  notified_in_app boolean,
  unique (alert_id, listing_id)        -- never notify twice for the same pair
)
```

Plus one new value in the `notifications.type` CHECK constraint: `listing_match_alert`.

### 4.5 Email format

Subject: **New business match found — Café in Sydney**

Body (single CTA):

> A new café in Sydney matching your preferences has just been listed.
>
> **[View Listing →]**
>
> *You're receiving this because you set up an alert for "Café in Sydney". [Manage alerts]*

### 4.6 Anti-spam guardrails

- A buyer never receives more than **one email per alert per 4-hour window** (digest-style if many listings match in a burst).
- In-app notifications are unbounded but grouped in the bell dropdown ("3 new matches for Café in Sydney").
- Alerts auto-expire after 90 days of inactivity (last login or last alert edit) and the buyer is asked to re-confirm. This keeps the list clean.

---

## 5. Delivery Plan

We suggest shipping in three phases, smallest-risk first.

### Phase 1 — Buyer Dashboard Polish (≈ 3–4 days)
- Auto-add to Saved on enquiry
- Auto-fill buyer details
- Broker-sent listing notifications + Sent-to-me page
- Extended buyer side panel

### Phase 2 — AI Insights for Sellers (≈ 4–5 days)
- Insights API endpoint with caching
- Insights panel UI
- Wired into the existing analytics page
- Time filter (7 / 30 / all)

### Phase 3 — Buyer Listing Alerts (≈ 5–7 days)
- Schema migration
- Alerts CRUD page
- Trigger + matching job
- Email + in-app notification wiring
- Recommended section on buyer dashboard

Total: **roughly 2.5 weeks** of focused work, single dev, with QA built in.

---

## 6. Bonus Ideas (AI & UX)

Here are extras we think are high-value given what's already in the stack. Treat each as opt-in.

### 6.1 AI Insights for **Buyers**
Mirror the seller insights for the buyer side. Show each buyer:
- "You've viewed 12 listings this week — 4 are café/Sydney. Want to set up an alert?"
- "3 of your saved listings have had recent activity — may sell soon."

Reuses the same Claude pipeline; just a different prompt.

### 6.2 Smart Listing Match Score
On any listing page, show a buyer their **match score** (0–100) based on their alert preferences and viewing history. Pure SQL + a simple weighting — no AI needed. It quietly nudges buyers toward listings they're more likely to act on.

### 6.3 AI-powered enquiry drafting (already half-built)
You already have `app/api/ai/text` and `components/ai/ai-text-actions.tsx`. Extend it to suggest a personalised opening line for the buyer based on the listing — "Hi, I noticed your café is in [suburb] — I run a similar venue in [their location]…". Shorter form, higher conversion.

### 6.4 Broker weekly digest email
Once `listing_insights` exists, the same payload powers a **Monday digest** to each broker: "Here's what happened with your 7 listings last week, and the 3 things to action this week." Single cron job, big perceived value.

### 6.5 Stale-listing nudges
Listings with no enquiries in 21+ days get an automatic AI-generated suggestion to the broker: "Try lowering the asking price by 5%, refreshing the lead photo, or re-tagging the industry." Uses the same insights endpoint.

### 6.6 Conversational search for buyers
A search bar that accepts "café in Sydney under $500k with strong cashflow" and translates it into structured filters via Claude. We've already got the categories + filters — this is just the natural-language layer on top. Big quality-of-life win for casual buyers.

### 6.7 Auto-categorisation on listing creation
When a broker uploads a listing, AI suggests the category, industry tags, and a polished short description from the long description. Speeds up listing creation and improves the matching quality for buyer alerts.

### 6.8 NDA + document-view nudges
Buyer signed an NDA but hasn't opened the IM in 3 days → gentle in-app + email nudge with a one-click "Open documents" CTA. Pure rules, no AI, but converts well.

---

## 7. Open Questions for the Client

Quick decisions we'll need from you to finalise scope:

1. **Insights time filter default** — 30 days, or 7 days?
2. **Alerts email channel** — send from your existing transactional address, or a dedicated `alerts@`?
3. **Alert frequency cap** — is the 4-hour digest window sensible, or do you want instant?
4. **Bonus ideas** — which (if any) of section 6 do you want included in the initial scope?
5. **Mobile parity** — should all three phases ship to the mobile app at the same time, or web first then mobile?

---

*Once you sign off on this, we'll convert each phase into a detailed task list and start with Phase 1.*
