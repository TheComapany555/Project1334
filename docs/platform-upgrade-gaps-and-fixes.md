# Salebiz — Platform Upgrade: Gaps & Fixes Implementation Specification

**Prepared for:** Client
**Date:** 2026-05-06
**Status:** Implementation Plan
**Companion docs:** [application-analysis.md](application-analysis.md), [feature-proposal-ai-insights-and-buyer-experience.md](feature-proposal-ai-insights-and-buyer-experience.md)

---

## 0. Purpose & Approach

This document translates the client's "Salesbiz Full Platform Upgrade Specification" into a concrete, gap-by-gap implementation plan against the current codebase. For each requested capability we record:

1. **Current state** — what already exists in the database and code today.
2. **Gap** — what is missing or only partially implemented.
3. **Fix** — the concrete change (DB migration, server action, UI surface) we will deliver.
4. **Files touched** — primary entry points that will be added or edited.

A hard, cross-cutting rule applies to every piece of work below:

> **Broker isolation rule.** A broker may only ever see buyer information and activity that relates to the broker's own listings, enquiries, NDAs, documents, and conversations. No other broker's listings, enquiries, NDAs, document interactions, or platform-wide buyer behaviour may leak into a broker's CRM, timeline, AI insights, or analytics. This rule must be enforced both in server-side data access (Postgres RLS + every server action) and in the UI (no fallback to platform-wide data when a broker's own dataset is empty).

---

## 1. CRM & Buyer Profiles

### 1.1 Unified, click-through buyer profile

**Current state.**
- `broker_contacts` table (added 2026-04-10) stores name, email, phone, company, notes, interest, source.
- `contact_tags` and `contact_tag_map` (2026-04-18) provide tags.
- `app/dashboard/buyers/[id]/page.tsx` and `getBuyerProfile()` already aggregate enquiries, NDA activity, document views, calls and views into a `BuyerProfile` shape — but it is built from the *user* `id`, not from `broker_contacts.id`, and not all entry points link to it.
- Surfaces that *should* deep-link to the buyer profile (Enquiries table, NDA list, Document Access requests, Messages, Listing enquiry rows) currently do not link to a single canonical buyer view.

**Gap.**
- No single canonical URL for "this broker's view of this buyer". `broker_contacts` and `profiles` are not linked, so the same person can appear as two records.
- Several CRM dimensions on the spec are not stored anywhere: budget range, preferred industries, preferred locations, funding status, timeframe to purchase, last active date, location.
- Click-through to a buyer profile is missing from CRM, Enquiries, Messages, NDA Requests and Listing Enquiries.

**Fix.**

1. **Schema — extend `broker_contacts`** *(migration `20260507000001_broker_contacts_buyer_fields.sql`)*
   ```sql
   alter table broker_contacts
     add column buyer_user_id uuid references profiles(id) on delete set null,
     add column location text,
     add column budget_min numeric,
     add column budget_max numeric,
     add column preferred_industries text[],
     add column preferred_locations text[],
     add column funding_status text check (funding_status in
       ('cash','pre_approved','financing','undisclosed')) default 'undisclosed',
     add column timeframe_to_purchase text check (timeframe_to_purchase in
       ('immediate','1_3_months','3_6_months','6_12_months','exploratory')),
     add column last_active_at timestamptz,
     add column first_interaction_at timestamptz;
   create index broker_contacts_broker_user_idx
     on broker_contacts(broker_id, buyer_user_id);
   ```

2. **Auto-link buyer accounts.** When a logged-in buyer enquires on a broker's listing, the existing enquiry handler already creates / upserts a `broker_contacts` row. Extend that upsert to also stamp `buyer_user_id`, `first_interaction_at` (on insert) and `last_active_at` (on every touch).
   *Files:* `lib/actions/enquiries.ts`, `lib/actions/contacts.ts`.

3. **Canonical URL.** All buyer links route to `/dashboard/buyers/[id]` where `[id]` is the `broker_contacts.id`. Wire deep-links from:
   - CRM table rows (`app/dashboard/contacts/contacts-client-view.tsx`)
   - Enquiries table (`app/dashboard/enquiries/enquiries-table.tsx`) — clicking the buyer name opens `/dashboard/buyers/[contact_id]?listingId=...`
   - NDA list (`app/dashboard/ndas/broker-nda-list.tsx`)
   - Document Access requests (`app/dashboard/document-access/document-access-client.tsx`)
   - Messages list (new — see Section 3)
   - Public listing enquiry email links (CTA "Open buyer in Salebiz")

4. **Profile UI.** Refactor `components/dashboard/buyer-profile-view.tsx` into three sections:
   - **Header card:** name, email, phone, location, account age, last active, "Open in CRM" / "Add follow-up" / "Email" / "Call".
   - **Buyer details card:** budget range, preferred industries, preferred locations, funding status, timeframe to purchase. All inline-editable by the broker.
   - **Activity tabs:** *Listings*, *Enquiries*, *Documents*, *Calls/Emails*, *Notes*, *Files shared*.

   *Files:* `components/dashboard/buyer-profile-view.tsx`, new `components/dashboard/buyer-details-card.tsx`.

### 1.2 Broker-scoped activity only

**Current state.** `lib/actions/buyer-profile.ts` already filters listings/enquiries/NDA/calls by `broker_id = session.user.id` (or agency owner extension). Document approvals are filtered through `listing_id IN (broker's listings)`.

**Gap.**
- Some queries fall back to *all* listings the buyer touched if the broker scope returns nothing — this leaks platform-wide data.
- AI insights (Section 4) currently feed from listing-wide data without explicit broker filtering.

**Fix.**
- Audit every query in `lib/actions/buyer-profile.ts`, `lib/ai/broker-insights.ts`, and any new code in this spec for an explicit `broker_id =` (or `listing.broker_id =`) clause; never fall back to global data.
- Add a Postgres RLS policy `broker_contacts_broker_isolation` enforcing `broker_id = auth.uid()` (or `agency_id = (select agency_id from profiles where id = auth.uid())` when the broker is an agency owner).
- Add automated test in `scripts/` that asserts a second broker cannot read another broker's contacts, timeline events, or follow-ups.

### 1.3 Unified CRM timeline / interaction feed

**Current state.** Activity events are scattered: `listing_views`, `enquiries`, `nda_documents`, `document_approval`, `call_tracking`, `listing_share_invites`, `notifications`. There is no single chronological feed.

**Gap.** A "what happened with this buyer" timeline does not exist. Brokers must hop between four screens to reconstruct a relationship.

**Fix.**

1. **New view — `broker_buyer_timeline`** *(migration `20260507000002_broker_buyer_timeline.sql`)*. A Postgres `view` (not a table) that `UNION ALL`s normalised rows from the source tables, each shaped as:
   ```
   broker_id, contact_id, buyer_user_id, listing_id, event_kind,
   event_at, actor ('buyer'|'broker'|'system'), summary, metadata jsonb
   ```
   `event_kind` covers: `viewed_listing`, `enquired`, `nda_requested`, `nda_signed`, `documents_viewed`, `documents_downloaded`, `broker_emailed`, `broker_called`, `broker_shared_files`, `broker_sent_listing`, `followup_added`, `note_added`, `status_changed`, `message_sent`, `message_received`.

2. **Server action.** `getBuyerTimeline(contactId, { limit, before })` in `lib/actions/buyer-profile.ts` returning paginated, broker-scoped rows.

3. **UI.** New `components/dashboard/buyer-timeline.tsx` — vertical timeline with icon per event kind, listing reference where relevant, and inline note/call detail. Replaces the per-tab activity stub on the buyer profile.

4. **Manual events.** Notes, follow-ups and call logs (Sections 1.4–1.6) write into a new `broker_buyer_events` table that the timeline view also unions in.
   ```sql
   create table broker_buyer_events (
     id uuid primary key default gen_random_uuid(),
     broker_id uuid not null references profiles(id) on delete cascade,
     contact_id uuid not null references broker_contacts(id) on delete cascade,
     listing_id uuid references listings(id) on delete set null,
     event_kind text not null,
     summary text,
     metadata jsonb default '{}'::jsonb,
     created_at timestamptz not null default now()
   );
   create index broker_buyer_events_broker_contact_idx
     on broker_buyer_events(broker_id, contact_id, created_at desc);
   ```

### 1.4 Communication tracking & follow-ups

**Current state.** `call_tracking` records a click-to-call event. There is no email tracking, no follow-up system, no "last contacted" computed field.

**Gap.** Brokers cannot answer "when did I last touch this buyer?" or "who is overdue for a follow-up?".

**Fix.**

1. **Schema additions** *(same migration as 1.3 or `20260507000003_crm_followups.sql`)*
   ```sql
   create table broker_email_log (
     id uuid primary key default gen_random_uuid(),
     broker_id uuid not null references profiles(id) on delete cascade,
     contact_id uuid not null references broker_contacts(id) on delete cascade,
     listing_id uuid references listings(id) on delete set null,
     direction text check (direction in ('outbound','inbound')) not null,
     subject text,
     snippet text,
     external_message_id text,
     sent_at timestamptz not null default now()
   );

   create table broker_followups (
     id uuid primary key default gen_random_uuid(),
     broker_id uuid not null references profiles(id) on delete cascade,
     contact_id uuid not null references broker_contacts(id) on delete cascade,
     listing_id uuid references listings(id) on delete set null,
     due_at timestamptz not null,
     notes text,
     completed_at timestamptz,
     completed_outcome text,
     created_at timestamptz not null default now()
   );
   create index broker_followups_due_idx
     on broker_followups(broker_id, completed_at, due_at);

   alter table broker_contacts
     add column last_emailed_at timestamptz,
     add column last_called_at timestamptz,
     add column last_contacted_at timestamptz;
   ```

2. **Triggers / hooks.**
   - On insert into `broker_email_log` (outbound) → bump `broker_contacts.last_emailed_at` and `last_contacted_at`.
   - On insert into `call_tracking` with an outcome → bump `last_called_at` and `last_contacted_at`.
   - On `broker_followups.due_at <= now() and completed_at is null` → CRM marks as overdue (no DB trigger needed; computed in queries).

3. **Outbound email tracking.** Two paths:
   - **In-platform:** new "Email buyer" composer (Section 3) writes directly to `broker_email_log` and dispatches via Resend.
   - **External email (passive):** generate a per-broker BCC alias `bcc-<broker_id_hash>@inbound.salebiz.com.au` (Postmark / Resend Inbound). When a broker BCC's that alias on any external email, an inbound webhook (`app/api/inbound/email/route.ts`) parses the message and inserts into `broker_email_log` for the matching `contact_id` (matched on the recipient email + this broker's contacts). Brokers configure the alias once; from then on every BCC'd thread auto-logs without manual entry.

4. **UI.**
   - CRM table columns: `Last contacted`, `Follow-up due` (overdue rows tinted).
   - Per-buyer header: small chips for `Last emailed`, `Last called`, `First interaction`.
   - New `components/dashboard/followup-dialog.tsx` (set due date, notes, listing context). Lives on every buyer profile and as a row action in the CRM table.
   - Top-of-CRM "Follow-ups due today / overdue" section — pulls `broker_followups` where `due_at <= now() and completed_at is null`, ordered ascending.
   - Bell notification at follow-up due (`notifications.type = 'followup_due'` — additive enum value).

### 1.5 CRM statuses (semi-automated)

**Current state.** `broker_contacts.interest` exists as free text. `contact_tags` provide a tagging system. There is no enumerated pipeline status.

**Gap.** No deal-stage pipeline; cannot filter by stage; no automation from broker actions.

**Fix.**

1. **Schema** *(migration `20260507000004_broker_contacts_status.sql`)*
   ```sql
   alter table broker_contacts
     add column crm_status text not null default 'new_lead'
       check (crm_status in (
         'new_lead','contacted','interested','meeting_scheduled',
         'nda_signed','documents_shared','negotiating','closed_won','closed_lost'
       )),
     add column crm_status_changed_at timestamptz default now();
   ```

2. **Automation rules** (server-side, in `lib/actions/contacts.ts` `bumpContactStatus()`):
   - Outbound email or call logged → `new_lead` → `contacted`.
   - NDA signed → `contacted`/`interested` → `nda_signed` (never downgrades).
   - Broker shares any document with the buyer → `documents_shared`.
   - Listing marked `under_offer` while this contact is the offering buyer → `negotiating`.
   - Listing `sold` with this contact → `closed_won`.
   - Status only ever advances automatically; brokers may manually set any status (including downgrades) via the buyer profile header dropdown.

3. **UI.** Status pill on every CRM row + inline editable on the buyer profile. Filter dropdown on the CRM table.

### 1.6 Custom CRM columns / fields

**Gap.** Brokers cannot add their own CRM fields (priority, hot-lead flag, finance approved, deal stage, custom notes).

**Fix.**

1. **Schema** *(migration `20260507000005_crm_custom_fields.sql`)*
   ```sql
   create table broker_crm_fields (
     id uuid primary key default gen_random_uuid(),
     broker_id uuid not null references profiles(id) on delete cascade,
     label text not null,
     field_type text not null check (field_type in
       ('text','number','boolean','select','date')),
     options jsonb default '[]'::jsonb,
     sort_order int not null default 0,
     created_at timestamptz not null default now()
   );

   create table broker_contact_field_values (
     contact_id uuid not null references broker_contacts(id) on delete cascade,
     field_id  uuid not null references broker_crm_fields(id) on delete cascade,
     value jsonb,
     primary key (contact_id, field_id)
   );
   ```

2. **UI.** A "Customise columns" drawer on the CRM table letting the broker create/edit/reorder/delete custom fields. Fields appear as additional CRM table columns and on the buyer profile under "Custom".

### 1.7 Call logs

**Current state.** `call_tracking` records calls but exposes no quick capture of outcome / notes.

**Fix.**

1. **Schema** *(small additive migration `20260507000006_call_tracking_outcome.sql`)*
   ```sql
   alter table call_tracking
     add column outcome text check (outcome in
       ('connected','voicemail','no_answer','wrong_number','callback_requested')),
     add column notes text,
     add column followup_id uuid references broker_followups(id) on delete set null;
   ```
2. **UX.** When the broker clicks the "Call" button (existing `components/listings/call-tracking-button.tsx`), a small popover prompts: outcome (radio), notes (textarea), "schedule follow-up?" (date picker — creates a `broker_followups` row if set). Submitting writes `call_tracking` + optional `broker_followups`.

---

## 2. CRM UI Improvements

**Current state.** `app/dashboard/contacts/` contains a tabular contact list with bulk-send, tags and basic filtering. Sidebar label is "Contacts".

**Fix.**

- Rename sidebar nav item and breadcrumbs from **Contacts** → **CRM**. *Files:* `components/dashboard/app-sidebar.tsx`, breadcrumb usages.
- Make email and phone cells `mailto:` / `tel:` links that also fire `logCommunication()` server action so the click counts as an outbound touch.
- Filter bar additions: budget range, NDA status, last activity (relative: today / 7d / 30d / 90d / >90d), listing category, enquiry stage, follow-up due (today / overdue / this-week).
- Row-level quick actions: **Email**, **Call**, **Note**, **Follow-up**, **Send listing**, **Open profile**.
- New tabs at the CRM page top: *All*, *Hot leads*, *Follow-ups due*, *NDA signed*, *Documents shared*, *Negotiating* (driven by the new `crm_status` column).

*Files:* `app/dashboard/contacts/contacts-client-view.tsx`, new `components/dashboard/crm-filters.tsx`, new `components/dashboard/crm-quick-actions.tsx`.

---

## 3. Internal Messaging / Chat

**Current state.** No in-platform messaging exists. Brokers and buyers only communicate via the enquiry email and out-of-band channels.

**Fix.**

1. **Schema** *(migration `20260508000001_broker_buyer_threads.sql`)*
   ```sql
   create table broker_buyer_threads (
     id uuid primary key default gen_random_uuid(),
     broker_id  uuid not null references profiles(id) on delete cascade,
     buyer_user_id uuid not null references profiles(id) on delete cascade,
     contact_id uuid references broker_contacts(id) on delete set null,
     listing_id uuid references listings(id) on delete set null,
     last_message_at timestamptz,
     created_at timestamptz not null default now(),
     unique (broker_id, buyer_user_id, listing_id)
   );

   create table broker_buyer_messages (
     id uuid primary key default gen_random_uuid(),
     thread_id uuid not null references broker_buyer_threads(id) on delete cascade,
     sender_role text not null check (sender_role in ('broker','buyer')),
     sender_id uuid not null references profiles(id) on delete cascade,
     body text not null,
     attachments jsonb default '[]'::jsonb,
     read_at timestamptz,
     created_at timestamptz not null default now()
   );
   create index broker_buyer_messages_thread_idx
     on broker_buyer_messages(thread_id, created_at desc);
   ```
   RLS policy: `sender_id = auth.uid() OR (broker_id = auth.uid()) OR (buyer_user_id = auth.uid())`, scoped through the parent thread.

2. **API & realtime.** `app/api/messages/[threadId]/route.ts` for send + paginated history; Supabase Realtime channel keyed on `thread_id` for live updates. Mobile app reuses the same endpoints.

3. **Surfaces.**
   - **Broker side:** new `/dashboard/messages` (thread list + chat pane). Each buyer profile gets a "Messages" tab. Unread counter feeds the existing `notification-bell.tsx`.
   - **Buyer side:** `/account/messages` (buyer dashboard area — see Section 5). Unread counter in the buyer header.
   - **Triggers from CRM:** a "Message" quick action on every CRM row opens / creates the thread for that buyer + last interacted listing.
   - **Attachments:** uses the same Supabase Storage bucket as documents but stored under `messages/<thread_id>/`. Only files attached here are shown in chat — vault documents remain governed by the access rules in Section 6/7, regardless of any link a broker pastes into a message.

4. **Notifications.**
   - In-app: bell + thread badge.
   - Email: digest if recipient has been offline > 5 min (single email per thread per 30-min window). Reuses the existing Resend pipeline.

5. **CRM linkage.** Every message inserts a `broker_buyer_events` row (`message_sent` / `message_received`) so it shows up on the timeline (Section 1.3) and bumps `last_contacted_at`.

---

## 4. AI Insights — Expansion

**Current state.** `lib/ai/listing-insights.ts` and `lib/ai/broker-insights.ts` plus `components/listings/ai-insights-panel.tsx` and `components/analytics/broker-account-ai-insights.tsx` produce listing-level numbers + a 3-bullet summary using Claude Haiku. The pipeline today only consumes quantitative listing analytics.

**Gap.** AI does not consume CRM notes, buyer feedback, objections, NDA workflow drop-off, or message content. It cannot suggest concrete actions like "buyers think pricing is too high".

**Fix.**

### 4.1 Broker-input feedback surfaces

1. **Schema** *(migration `20260508000002_broker_feedback.sql`)*
   ```sql
   create table broker_buyer_feedback (
     id uuid primary key default gen_random_uuid(),
     broker_id uuid not null references profiles(id) on delete cascade,
     contact_id uuid references broker_contacts(id) on delete set null,
     listing_id uuid references listings(id) on delete cascade,
     kind text check (kind in
       ('objection','concern','question','positive','lost_interest','other'))
       not null,
     body text not null,
     captured_at timestamptz not null default now()
   );
   create index broker_buyer_feedback_listing_idx
     on broker_buyer_feedback(listing_id, captured_at desc);
   ```

2. **Capture surfaces.**
   - One-click "Capture feedback" buttons on every CRM row, the buyer profile, the call-log dialog, and the messages thread. Each button opens a 2-field modal (kind + body) — never more than 5 seconds of broker time.
   - "Why did this buyer lose interest?" prompt fires automatically when a broker moves a contact to `closed_lost`.

3. **AI ingest.** `lib/ai/broker-insights.ts` is extended to bundle the following per listing into the Claude prompt (broker-scoped only):
   - Numeric metrics from `listing_views`, `enquiries`, `nda_documents`, `document_approval`, `call_tracking`, `broker_email_log`, `broker_buyer_messages`.
   - Recent CRM notes (`broker_contacts.notes` for buyers who touched this listing).
   - All `broker_buyer_feedback` rows for this listing in the selected time window.
   - Aggregate of buyer messages: text snippets where a buyer asked a question or raised a concern (regex'd or auto-tagged at insert time via a cheap classifier prompt).

### 4.2 New insight outputs

The insights API (`app/api/ai/listings/insights/route.ts`) returns three new fields on top of the existing `summary`, `actions[]`, `seller_message`:

- `patterns[]` — short bullets like *"Multiple buyers concerned about pricing (4 mentions)."*
- `dropoff_signals[]` — *"Interest is high but conversion is low after NDA stage — 9 NDAs signed, 2 documents viewed."*
- `seller_update_long` — a longer paragraph version of `seller_message` for monthly reports.

### 4.3 Suggested AI actions

The existing `actions[]` schema already supports free-form bullets. We extend the Claude system prompt with a small action taxonomy so suggestions cluster around: *adjust price*, *add documents*, *improve description*, *follow up with specific buyers*, *update lease detail*, *add financial transparency*. The output JSON additionally tags each action with one of these `kind` values so we can render an icon and (where relevant) a deep-link CTA (e.g. *Add documents → /dashboard/listings/[id]/documents*).

### 4.4 Seller-update generator

A new "Generate seller update" button on the listing analytics page calls the same endpoint with `mode = 'seller_update'`. The output is a copy-ready email body and a printable PDF (via existing `pdf Documents` pipeline) brokers can attach to a client email in one click.

*Files touched:* `lib/ai/broker-insights.ts`, `app/api/ai/listings/insights/route.ts`, `components/listings/ai-insights-panel.tsx`, new `components/analytics/seller-update-card.tsx`.

---

## 5. Buyer Dashboard / Profile Area

**Current state.** `app/account/page.tsx` plus `components/account/buyer-account-view.tsx` and `components/account/buyer-side-panel.tsx` render saved listings, enquiries, sent-to-me, alerts. Buyer cannot see approved vault documents or messages.

**Gap.** No vault tab; no messages tab; no broker-shared file list; no "approved data rooms" overview.

**Fix.**

Extend the buyer side panel and `BuyerPanelSnapshot` (`lib/types/buyer-panel.ts`) with:

- `approvedVault` — list of `{ listingId, title, broker_name, approved_at, expires_at, file_count }` (one row per listing the buyer has approved access to).
- `messages` — unread thread counts per broker.

Buyer routes:

- `/account` — overview (existing).
- `/account/saved` — saved listings.
- `/account/enquiries` — enquiries.
- `/account/sent` — sent-to-me.
- `/account/messages` — chat (Section 3).
- `/account/vault` — list of approved data rooms; clicking opens that listing's data-room view (Section 7), but constrained to buyer-side controls (no admin actions).
- `/account/alerts` — alert preferences (existing).

Auto-save on enquiry, auto-fill enquiry forms, and broker-sent listings remain as already specified in [feature-proposal-ai-insights-and-buyer-experience.md](feature-proposal-ai-insights-and-buyer-experience.md) §3.

The buyer experience must remain deliberately simple — no broker-style sidebar, no analytics, no CRM affordances.

---

## 6. NDA & Virtual Data Room Workflow

**Current state.**
- `nda_documents` (and signature) tables track NDA requests and signatures.
- `document_approval` tracks per-document approval requests.
- `app/dashboard/listings/[id]/nda` and `app/dashboard/listings/[id]/documents` are separate screens.
- A buyer who has not signed an NDA can already see the *list of documents* (titles + categories) on the public listing detail.

**Gaps.**
- NDA management and document/vault management live on two separate pages — there is no single "data room control" surface per listing.
- Document titles, file names and folder names leak before NDA approval.
- No per-buyer access matrix, no folder-level permissions, no time-bound access, no view/download tracking dashboard tied to NDA status.

**Fix.**

### 6.1 Single data-room control screen per listing

Replace the split `nda` + `documents` pages with one route: `/dashboard/listings/[id]/data-room`, with three tabs:

1. **Buyers** — table of every buyer who has interacted with this listing (enquired, requested access, signed NDA). Columns: name, email, NDA status, access state, files visible, last viewed, expiry, actions. *Source query unions* `enquiries`, `nda_documents`, `document_approval` filtered to this listing, deduped by `buyer_user_id`/`broker_contacts.id`.
2. **Files & folders** — the vault (Section 7).
3. **Settings** — NDA template, default access policy ("auto-grant access on signature" vs "manual approval"), default expiry days.

Routes `/dashboard/listings/[id]/nda` and `/dashboard/listings/[id]/documents` redirect to the new screen for backwards compatibility.

### 6.2 Buyer workflow

1. Buyer requests access from the listing page → `nda_documents` row inserted (status `requested`).
2. Buyer signs NDA on `components/listings/nda-sign-dialog.tsx`.
3. Broker is notified (`notifications.type = 'nda_signed'` — already exists).
4. Broker approves on the data-room **Buyers** tab. If "auto-grant" is on, this step is skipped and approval is automatic on signature.
5. Buyer receives in-app + email notification and gains immediate vault access subject to the per-buyer permission matrix (Section 7).

### 6.3 Pre-approval information hiding

Public listing detail and buyer dashboard must, before approval, hide:
- Document titles
- File names
- Folder names
- File previews / thumbnails

**Implementation.** A single shared helper `getVisibleVaultForBuyer(listingId, viewerUserId)` in `lib/actions/documents.ts` returns one of:
- `{ state: 'locked', counts: { documents: number, folders: number } }` — pre-approval; UI shows a single "Sign NDA to view *N* documents in *M* folders" card.
- `{ state: 'open', folders: [...], documents: [...] }` — only emitted once `document_approval.status = 'approved'` for this buyer for at least one file, AND the file's per-buyer permission allows it (Section 7).

All public/buyer-facing rendering paths (listing detail page, buyer vault page, mobile equivalents) call this helper. There is no fallback path that returns titles before approval.

---

## 7. Vault / Data Room Improvements

**Current state.** `components/listings/document-vault.tsx` plus `lib/actions/documents.ts` support a flat list of documents per listing with per-file approval. There is no folder structure, no per-buyer access control, no expiry, no tracking dashboard.

### 7.1 Folder structure

**Schema** *(migration `20260509000001_listing_document_folders.sql`)*
```sql
create table listing_document_folders (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references listings(id) on delete cascade,
  parent_folder_id uuid references listing_document_folders(id) on delete cascade,
  name text not null,
  description text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index listing_document_folders_listing_idx
  on listing_document_folders(listing_id, parent_folder_id, sort_order);

alter table listing_documents
  add column folder_id uuid references listing_document_folders(id) on delete set null,
  add column description text;
```

Default folder seeds when a listing is created: *Financials*, *Lease*, *Staff*, *Equipment*, *Legal*, *Operations* — broker may delete, rename or reorder. Subfolders supported one level deep (matches client examples; deeper nesting is opt-in by removing the depth cap in the UI).

### 7.2 Broker file management UX

Upgrade `components/listings/document-vault.tsx` to:
- Drag-and-drop multi-file upload using `react-dropzone` with chunked uploads via Supabase Storage's resumable endpoint.
- Bulk upload with per-file progress bars, parallelism = 4, retry on failure, background tab support (uploads continue if user switches tabs within the same session via a small Web Worker).
- Rename / move / delete (single + multi-select) with optimistic UI.
- Preview pane: PDFs via `react-pdf`, images via native `<img>`, simple Office docs via Google Docs viewer iframe, fallback to download.
- Per-file & per-folder description / notes.
- Search box (file name, description, category) using a Postgres GIN trigram index on `listing_documents(name, description)`.
- Sort by name, date, size, category.

### 7.3 Per-buyer access controls

**Schema** *(migration `20260509000002_document_access_grants.sql`)*
```sql
create table document_access_grants (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references listings(id) on delete cascade,
  buyer_user_id uuid not null references profiles(id) on delete cascade,
  contact_id uuid references broker_contacts(id) on delete set null,
  scope text not null check (scope in ('all','folders','files','none')),
  folder_ids uuid[],     -- when scope = 'folders'
  document_ids uuid[],   -- when scope = 'files'
  expires_at timestamptz,
  granted_by uuid not null references profiles(id) on delete restrict,
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  unique (listing_id, buyer_user_id)
);
```

Permission resolution (server-side, in `getVisibleVaultForBuyer`):
1. Find the buyer's grant for this listing. If `revoked_at` set or `expires_at < now()` → `none`.
2. `scope = 'all'` → return every approved document.
3. `scope = 'folders'` → return all approved documents inside any folder in `folder_ids` (recursive into subfolders).
4. `scope = 'files'` → return only approved documents in `document_ids`.
5. Else → `none`.

The per-buyer dropdown on the data-room **Buyers** tab presents these scopes (No access / View selected files only / View selected folders only / View all approved files / Temporary access only / Access expiry date).

### 7.4 Buyer vault experience

- New `app/account/vault/[listingId]/page.tsx` and `components/account/buyer-vault-view.tsx`.
- Folder tree on the left, file list on the right, breadcrumbs at the top.
- In-platform preview (Section 7.2) — buyers should rarely need to download.
- "Recently added" badge on files added in the last 7 days.
- Banner if access expires within 7 days; auto-removal of cards on expiry.
- Search and download (when permission allows) match the broker UX.
- Buyer can access this view from `/account/vault` *or* the original listing page — the listing page reuses `getVisibleVaultForBuyer` so the experience is identical.

### 7.5 Tracking & notifications

**Schema additive** *(migration `20260509000003_document_view_log.sql`)*
```sql
create table document_view_log (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references listing_documents(id) on delete cascade,
  buyer_user_id uuid not null references profiles(id) on delete cascade,
  listing_id uuid not null references listings(id) on delete cascade,
  action text not null check (action in ('preview','download','open')),
  occurred_at timestamptz not null default now()
);
create index document_view_log_listing_idx
  on document_view_log(listing_id, occurred_at desc);
```

Broker-facing: a "Document activity" panel on the data-room **Buyers** tab shows per-buyer view/download history and sortable "most viewed files".

Notifications (additive `notifications.type` enum values):
- Broker — `document_access_requested`, `nda_signed`, `document_viewed`, `document_downloaded`, `access_expired`.
- Buyer — `vault_access_approved`, `vault_files_added`, `vault_access_expiring`, `vault_folders_shared`.

Notifications are batched (one email per buyer per listing per 30 min for view/download events) to avoid noise.

### 7.6 Upload performance

- Switch from single-shot uploads to Supabase Storage's resumable / TUS endpoint.
- Use signed URL upload directly from the browser to storage (skips the Next.js API hop).
- Concurrent uploads (4 parallel) with per-file progress.
- Retry with exponential backoff on transient errors; warn once on hard failures, then move on.
- Show aggregate progress bar at the top of the vault while any upload is active.

---

## 8. Enquiry Form Customisation per Listing

**Current state.** `lib/validations/` defines a single enquiry schema (name, email, phone, reason, message). Brokers cannot toggle which fields are required nor add qualification questions per listing.

**Fix.**

1. **Schema** *(migration `20260510000001_listing_enquiry_form.sql`)*
   ```sql
   create table listing_enquiry_forms (
     listing_id uuid primary key references listings(id) on delete cascade,
     require_phone boolean not null default false,
     ask_budget boolean not null default false,
     ask_funding_status boolean not null default false,
     ask_industry_experience boolean not null default false,
     ask_timeframe boolean not null default false,
     custom_questions jsonb not null default '[]'::jsonb,
     -- [{ id, label, type: 'short_text'|'long_text'|'select', options: [], required }]
     updated_at timestamptz not null default now()
   );
   ```
2. **Listing wizard.** Add a 4th step *"Enquiry form"* to the create/edit listing wizard (current 3-step form documented in [application-analysis.md §2.3](application-analysis.md)). Defaults match today's hard-coded schema so existing brokers see no behaviour change.
3. **Enquiry handler.** `lib/actions/enquiries.ts` reads the per-listing config and validates incoming enquiries against it. Custom answers are stored as `enquiries.answers jsonb` (additive column). The CRM and buyer profile surfaces render the answers under "Enquiry detail".
4. **Auto-fill into CRM.** Answers to budget / funding / timeframe / industry questions are mirrored into `broker_contacts` (Section 1.1) so the CRM column / filter set stays consistent.

---

## 9. Location Improvements

**Current state.** Listing creation requires `state` + `suburb`. There is no broader "region" concept; brokers must pick an exact suburb even when they want to obscure the precise location.

**Fix.**

1. **Schema** *(migration `20260510000002_listing_regions.sql`)*
   ```sql
   create table regions (
     id uuid primary key default gen_random_uuid(),
     state text not null,
     name text not null,
     slug text not null unique,
     bbox jsonb,         -- optional bounding box for map filtering
     suburbs text[]      -- canonical suburbs that fall inside this region
   );
   alter table listings
     add column region_id uuid references regions(id) on delete set null,
     add column hide_exact_location boolean not null default false;
   ```
   Seed regions to match the client's examples: *Sydney*, *North Shore*, *Western Sydney*, *Regional NSW*, *Brisbane Region*, *Gold Coast Region* — extensible via the admin panel.

2. **Listing wizard.** "Location" step gains a region picker and a **Hide exact suburb** toggle. When toggled on, public surfaces show only the region; the suburb stays in the database for matching against buyer alerts.

3. **Search & alerts.** `/search` filters and `buyer_alerts` matching (Section 4 of [feature-proposal-ai-insights-and-buyer-experience.md](feature-proposal-ai-insights-and-buyer-experience.md)) accept `region_id` in addition to `state` + `suburb`. A listing with `hide_exact_location = true` matches alerts at the region level only.

---

## 10. Notifications, Permissions & RLS

Cross-cutting work that supports Sections 1–9.

- **Notification enum extension** *(single migration `20260510000003_notifications_types.sql`)* — additive only:
  `followup_due`, `nda_request_received`, `nda_signed`, `vault_access_requested`, `vault_access_approved`, `vault_files_added`, `vault_access_expiring`, `vault_access_expired`, `document_viewed`, `document_downloaded`, `message_received`, `feedback_captured`, `crm_status_changed`.
- **RLS audit.** Every new table above ships with an RLS policy enforcing the broker isolation rule. The audit script in `scripts/` runs as part of CI to assert no policy is missing on a new table.
- **Mobile parity.** Every new endpoint must have a `/api/mobile/*` mirror so the existing Salebiz mobile app (Expo) keeps feature parity. Track the parity matrix in [web-vs-mobile-parity.md](web-vs-mobile-parity.md).

---

## 11. Delivery Plan

We propose seven phases. Phases 1–2 unlock CRM value quickly; phases 3–5 deliver the data-room overhaul; phase 6 layers AI on top of the new data; phase 7 polishes the buyer side.

| Phase | Scope | Sections | Estimate |
|---|---|---|---|
| **Phase 1 — CRM foundation** | Buyer profile schema + click-through, timeline view, status pipeline, Contacts→CRM rename, hotlinks, filters | 1.1, 1.2, 1.3, 1.5, 2 | ~1.5 weeks |
| **Phase 2 — Comms & follow-ups** | Email/call logging, follow-up system, custom CRM fields, call-log popover, external email BCC ingest | 1.4, 1.6, 1.7 | ~1.5 weeks |
| **Phase 3 — Messaging** | Threads/messages schema, realtime, broker + buyer UI, notifications | 3 | ~1.5 weeks |
| **Phase 4 — Data-room control** | Unified data-room screen, NDA→approval workflow, pre-approval information hiding | 6 | ~1 week |
| **Phase 5 — Vault overhaul** | Folders, drag-drop bulk uploads, per-buyer access matrix, expiry, view/download tracking, secure preview | 7 | ~2 weeks |
| **Phase 6 — AI insights expansion** | Feedback capture, AI ingest of CRM/feedback/messages, new outputs, seller-update generator | 4 | ~1 week |
| **Phase 7 — Buyer side & misc.** | Buyer vault tab, buyer messages, enquiry-form customisation, regions, location hide-exact toggle | 5, 8, 9 | ~1 week |

**Total:** ~9–10 weeks of focused work, single full-stack dev with QA built in. Phases 1, 2, 3 and 6 can run in parallel with phases 4–5 if a second dev is available, since they touch largely independent surfaces.

---

## 12. Open Questions for the Client

These need decisions before we start cutting code so we don't have to retrofit later:

1. **External email logging** — are you happy with the BCC-alias approach (Section 1.4), or would you prefer a Gmail/Outlook OAuth integration that scrapes the broker's "Sent" folder for known buyer emails?
2. **Auto-grant vault access on NDA signature** — default *on* (frictionless) or default *off* (broker reviews every buyer)?
3. **Custom CRM fields scope** — broker-level (each broker designs their own fields) or agency-level (owner sets the schema for the whole team)?
4. **Region taxonomy** — do you want admin-managed regions (we seed the six you listed; admin can add more) or a fixed enum?
5. **Messaging attachments** — capped at 10 MB per file? Should they auto-expire after the deal closes?
6. **AI insights data window** — should AI ingest CRM notes / messages older than, say, 12 months, or just the recent window? (Affects token cost and recency relevance.)
7. **Mobile parity** — every phase shipped to web *and* mobile in lockstep, or web-first then mobile in a follow-up sprint?

---

*Once you sign off on this, each phase becomes a detailed task list under `/docs/sprints/` and we begin with Phase 1.*
