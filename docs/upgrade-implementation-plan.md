# Salebiz Platform Upgrade — Implementation Plan

This plan turns the client's two specs (the requirements doc + the feature/scope breakdown) into concrete deliverables against the current codebase. Anything already built is called out so we only change what we have to.

Stack baseline: Next.js 16 (App Router) + Supabase + NextAuth (Credentials) + TypeScript + shadcn/ui + Tailwind 4 + React Query + Resend + OpenAI + Stripe.

Schema baseline (latest migration): [`20260505000002_backfill_document_access_requests.sql`](../supabase/migrations/20260505000002_backfill_document_access_requests.sql). All new migrations get timestamps strictly after this one. Migration prefix used below: `20260601…` for Milestone 1, `20260615…` for Milestone 2 (placeholders — bump to "today" when actually running).

Convention: server actions live in [`lib/actions/`](../lib/actions/), shared types in [`lib/types/`](../lib/types/), broker pages in [`app/dashboard/`](../app/dashboard/), buyer pages in [`app/account/`](../app/account/), public pages in [`app/listing/`](../app/listing/) / [`app/search/`](../app/search/). Auth gating: [`middleware.ts`](../middleware.ts) for `/dashboard/*` and `/admin/*`; per-action `requireBroker()` helpers (see [`lib/actions/contacts.ts:22-32`](../lib/actions/contacts.ts#L22-L32)).

Important rule (from spec): a broker MUST only see their own relationship with a buyer — never another broker's listings, enquiries, NDAs or document activity. Every new server action must enforce this with `broker_id` / `agency_id` scoping, just like [`getBuyerProfile`](../lib/actions/buyer-profile.ts) does today via `getBrokerListingIds`.

---

## Milestone 1 — CRM, Communication & Quick Wins

### M1.1 — CRM & Buyer Profiles (slide-out panel + extended profile)

**What's already there**

- Broker contacts table + tags + consent: [`broker_contacts`](../supabase/migrations/20260410000004_broker_contacts.sql), [`contact_tags`](../supabase/migrations/20260418000002_contact_tags.sql), [`broker_contact_tag_map`](../supabase/migrations/20260418000002_contact_tags.sql).
- CRM page rendering at [`app/dashboard/contacts/page.tsx`](../app/dashboard/contacts/page.tsx) (already titled "CRM" via [`PageHeader`](../components/admin/page-header.tsx); sidebar nav still says "Contacts" at [`components/dashboard/app-sidebar.tsx:57`](../components/dashboard/app-sidebar.tsx#L57)).
- Buyer profile screen + activity aggregator: [`app/dashboard/buyers/[id]/page.tsx`](../app/dashboard/buyers/%5Bid%5D/page.tsx), action [`lib/actions/buyer-profile.ts`](../lib/actions/buyer-profile.ts) — already returns metrics, listings, enquiries, NDA flags, document_approved events, calls.
- Enquiries already capture: name, email, phone, reason, message, interest, consent. See [`enquiries`](../supabase/migrations/20250226000001_enquiries.sql).
- Contacts list pagination + tag/consent/text search: [`listBrokerContacts`](../lib/actions/contacts.ts).

**What to add**

1. **Schema — extend buyer profile fields.** New migration `20260601000001_buyer_profile_fields.sql`:
   - Add to `profiles` (only meaningful for `role='user'`):
     - `budget_min bigint`, `budget_max bigint`,
     - `preferred_industries text[]` (FK-by-name to `categories.slug` or just freeform tags),
     - `preferred_locations text[]`,
     - `funding_status text` (`'self_funded'|'pre_approved'|'seeking_finance'|'unspecified'`),
     - `timeframe text` (`'<3m'|'3-6m'|'6-12m'|'>12m'|'unspecified'`),
     - `last_active_at timestamptz` (auto-bumped on auth, enquiry, NDA sign, doc view).
   - Add to `broker_contacts`:
     - `buyer_user_id uuid REFERENCES users(id) ON DELETE SET NULL` — links a CRM row to the actual buyer account when known, so the same person never shows up twice. Backfill from enquiries: `UPDATE broker_contacts c SET buyer_user_id = e.user_id FROM enquiries e WHERE e.id = c.enquiry_id AND e.user_id IS NOT NULL;`.
     - `status text NOT NULL DEFAULT 'new_lead'` — pipeline status, see M1.2.
     - `last_emailed_at`, `last_called_at`, `last_contacted_at`, `first_interaction_at`, `next_follow_up_at` — all `timestamptz` nullable.
     - Partial index on `(broker_id, next_follow_up_at) WHERE next_follow_up_at IS NOT NULL` for the "follow-ups due" panel.
   - Migrate the `source` CHECK constraint to add `'auto'` (created automatically when buyer enquires/signs NDA on a broker's listing). The current CHECK is `('enquiry','manual','share','import')` — leave for now and use `'enquiry'` for auto-creation.

2. **Schema — buyer_dedup helper.** Already covered: enquiry has `user_id`, contact will now have `buyer_user_id`. Lookup function: `getOrCreateBrokerContactForBuyer(brokerId, buyerUserId, fallbackEmail)` in [`lib/actions/contacts.ts`](../lib/actions/contacts.ts) — used by M1.2 auto-create on enquiry/NDA/share.

3. **Action — extend buyer profile payload.** Update [`lib/actions/buyer-profile.ts`](../lib/actions/buyer-profile.ts):
   - Pull the new profile fields (budget, industries, locations, funding_status, timeframe, last_active_at).
   - Pull `broker_contacts` row matched on `(broker_id, buyer_user_id)` so panel knows status, follow-up, notes, tags.
   - Add to `BuyerProfile`: `crm_status`, `next_follow_up_at`, `last_emailed_at`, `last_called_at`, `tags`, `notes`, `crm_contact_id`.
   - Build `activity` already merges across listings the broker owns — keep that. Add new `email_sent` / `email_received` / `call_logged` / `note_added` / `follow_up_added` event kinds (sourced in M1.2).

4. **Component — slide-out panel.** New [`components/dashboard/buyer-profile-panel.tsx`](../components/dashboard/buyer-profile-panel.tsx):
   - Built on [`components/ui/sheet.tsx`](../components/ui/sheet.tsx) (right-edge `<Sheet side="right">`, ~480px wide on desktop, full-screen on mobile).
   - Sections (top to bottom):
     - **Header**: avatar, name, email, phone, role badge, "View full profile" link (→ `/dashboard/buyers/[id]`), close.
     - **Quick actions row**: Email (→ M1.2 composer), Call (→ M1.2 call-log popup), Add Note, Add Follow-up, Send Listing.
     - **Snapshot**: status pill + status dropdown, last contacted, next follow-up, first interaction, time since last active.
     - **Buyer details**: budget range, preferred industries, preferred locations, funding status, timeframe, location, account created.
     - **Activity timeline** (paginated 20-at-a-time, keyset by `at`): merged stream from M1.1 + M1.2.
     - **Listings**: per-listing cards (views, enquiries, calls, NDA state, docs viewed, last activity).
     - **Tags + Notes**: existing components.
   - State: opened via Zustand store `lib/stores/buyer-panel-store.ts` (`{ open, buyerId, listingId }`) so any row/CTA across the app can `useBuyerPanel().open(buyerId, { listingId })`.
   - Fetch: React Query `['buyer-profile', buyerId, listingId]` calling `getBuyerProfile`. The same panel renders identically from any opener.

5. **Wire panel openers** (replace `Link` to `/dashboard/buyers/[id]` with `onClick={() => buyerPanel.open(id)}`):
   - CRM rows: [`app/dashboard/contacts/contacts-client-view.tsx`](../app/dashboard/contacts/contacts-client-view.tsx).
   - Enquiries: [`app/dashboard/enquiries/`](../app/dashboard/enquiries/).
   - NDAs: [`app/dashboard/ndas/`](../app/dashboard/ndas/).
   - Document access: [`app/dashboard/document-access/`](../app/dashboard/document-access/).
   - Listing enquiry sub-list (later, in the data room "Buyers" tab in M2).
   - Messages thread row (M1.3).
   - Keep `/dashboard/buyers/[id]` working as the full-page view (re-uses the same `BuyerProfileView` plus the new fields).

6. **Buyer self-profile fields.** Buyer onboarding/profile editor at [`app/dashboard/profile/`](../app/dashboard/profile/) (broker side) is broker-only today. Buyer fields live on `profiles` so the same [`/account`](../app/account/page.tsx) page gets a new "Investment preferences" section (budget/industries/locations/funding/timeframe). Mobile mirror in M2.

**Acceptance**

- A broker clicks any buyer reference (CRM, enquiry, NDA, doc-access) and the slide-out opens with full info without leaving the page.
- The panel shows zero data from another broker's listings (verified by adding a test listing/enquiry under a second broker).
- Same buyer that enquired twice (once anonymously by email, once logged in) appears as a single CRM row after backfill.
- "View full profile" still works.

---

### M1.2 — CRM Communication, Follow-Ups, Status Tracking, Email Logging, Call Logs

**What's already there**

- Call clicks tracked (no notes yet): [`call_clicks`](../supabase/migrations/20260410000003_call_tracking.sql), exposed in [`getBuyerProfile`](../lib/actions/buyer-profile.ts) as activity kind `call`.
- Resend email infra + templates: [`lib/email-templates.ts`](../lib/email-templates.ts), used by `bulkSendListingsToContacts` in [`lib/actions/contacts.ts`](../lib/actions/contacts.ts).
- Free-text `interest` field on contact (will keep but not central).
- Notification system + bell: [`lib/actions/notifications.ts`](../lib/actions/notifications.ts), [`components/dashboard/notification-bell.tsx`](../components/dashboard/notification-bell.tsx).

**What to add**

1. **Schema — activity log + follow-ups + custom fields.** Migration `20260601000002_crm_activity.sql`:

   ```sql
   -- Unified CRM activity log (manual entries by broker + system events)
   CREATE TABLE crm_activities (
     id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     broker_id       uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
     contact_id      uuid REFERENCES broker_contacts(id) ON DELETE CASCADE,
     buyer_user_id   uuid REFERENCES users(id) ON DELETE SET NULL,
     listing_id      uuid REFERENCES listings(id) ON DELETE SET NULL,
     kind            text NOT NULL CHECK (kind IN (
       'email_sent','email_received','call_logged','note_added',
       'follow_up_set','follow_up_completed','status_changed',
       'message_sent','message_received','listing_shared','feedback_logged'
     )),
     subject         text,           -- email subject / call outcome / note title
     body            text,           -- email body / call notes / note content
     metadata        jsonb DEFAULT '{}'::jsonb, -- timestamps, message_id, status from→to, etc.
     occurred_at     timestamptz NOT NULL DEFAULT now(),
     created_at      timestamptz NOT NULL DEFAULT now()
   );
   CREATE INDEX idx_crm_activities_broker_contact ON crm_activities(broker_id, contact_id, occurred_at DESC);
   CREATE INDEX idx_crm_activities_broker_buyer   ON crm_activities(broker_id, buyer_user_id, occurred_at DESC);
   ALTER TABLE crm_activities ENABLE ROW LEVEL SECURITY;
   -- (Server-side service-role only; no public policies.)

   -- Follow-up tasks (separate from activity log so we can index by due date)
   CREATE TABLE crm_follow_ups (
     id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     broker_id       uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
     contact_id      uuid REFERENCES broker_contacts(id) ON DELETE CASCADE,
     buyer_user_id   uuid REFERENCES users(id) ON DELETE SET NULL,
     listing_id      uuid REFERENCES listings(id) ON DELETE SET NULL,
     due_at          timestamptz NOT NULL,
     title           text NOT NULL,
     notes           text,
     completed_at    timestamptz,
     created_at      timestamptz NOT NULL DEFAULT now(),
     updated_at      timestamptz NOT NULL DEFAULT now()
   );
   CREATE INDEX idx_follow_ups_due ON crm_follow_ups(broker_id, due_at) WHERE completed_at IS NULL;

   -- Company-level custom CRM columns
   CREATE TABLE crm_custom_fields (
     id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     agency_id       uuid REFERENCES agencies(id) ON DELETE CASCADE,
     broker_id       uuid REFERENCES profiles(id) ON DELETE CASCADE, -- for solo brokers without an agency
     key             text NOT NULL,         -- machine key
     label           text NOT NULL,         -- display name
     field_type      text NOT NULL CHECK (field_type IN ('text','number','boolean','select','date')),
     options         jsonb,                  -- for 'select': array of { value, label, color? }
     sort_order      int NOT NULL DEFAULT 0,
     created_at      timestamptz NOT NULL DEFAULT now(),
     UNIQUE NULLS NOT DISTINCT (agency_id, broker_id, key)
   );
   -- Either agency_id OR broker_id is set, not both.
   ALTER TABLE crm_custom_fields ADD CONSTRAINT chk_field_owner
     CHECK ((agency_id IS NULL) <> (broker_id IS NULL));

   -- Per-contact custom values
   CREATE TABLE crm_custom_field_values (
     contact_id      uuid NOT NULL REFERENCES broker_contacts(id) ON DELETE CASCADE,
     field_id        uuid NOT NULL REFERENCES crm_custom_fields(id) ON DELETE CASCADE,
     value           jsonb,
     updated_at      timestamptz NOT NULL DEFAULT now(),
     PRIMARY KEY (contact_id, field_id)
   );

   -- Inbound BCC pipeline tokens (per-broker private address)
   CREATE TABLE broker_bcc_addresses (
     broker_id       uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
     token           text NOT NULL UNIQUE,         -- e.g. 'k9x2-abc12'
     created_at      timestamptz NOT NULL DEFAULT now()
   );
   ```

   Notification CHECK constraint update — add `follow_up_due`, `message_received`, `email_received`, `data_room_request`, `data_room_view`, `data_room_download`, `access_expired`, `access_expiring`, `feedback_logged` (some used in M2 too — adding all in one migration is fine).

2. **Server actions** — new file [`lib/actions/crm.ts`](../lib/actions/crm.ts):

   - `logActivity(input)` — writes to `crm_activities`, optionally bumps `last_emailed_at` / `last_called_at` / `last_contacted_at` on `broker_contacts`, and applies status auto-advance rules:
     - `email_sent` → if status `'new_lead'`, advance to `'contacted'`.
     - `nda_signed` → status `'nda_signed'`. (Triggered from existing `signNda` action.)
     - `documents_shared` (any `document_access_request` approved) → `'documents_shared'`.
   - `logCall({ contactId|buyerUserId, listingId?, outcome, notes, followUpAt? })` — inserts `call_logged` activity, optional follow-up.
   - `addNote({ contactId|buyerUserId, body, listingId? })`.
   - `setFollowUp({ contactId|buyerUserId, dueAt, title, notes, listingId? })` — creates `crm_follow_ups` row + `follow_up_set` activity.
   - `completeFollowUp(id)`.
   - `setContactStatus(contactId, status, { silent? })` — manual override; logs `status_changed`.
   - `getFollowUpsDueToday(brokerId)`.
   - `listActivitiesForContact(contactId, { cursor, limit })` and `listActivitiesForBuyer(buyerUserId)`.
   - All scoped by `requireBroker()` + `broker_id` filter.

3. **Pipeline statuses.** Constant in [`lib/types/contacts.ts`](../lib/types/contacts.ts):
   ```ts
   export const CRM_STATUSES = ['new_lead','contacted','interested','meeting_scheduled','nda_signed','documents_shared','negotiating','closed'] as const;
   ```
   Render as colored pill with dropdown to change. Auto-advance helpers above only push forward; never demote without manual change.

4. **Email logging — both methods** (spec is explicit):

   **a. In-platform composer** (component + action):
   - New [`components/dashboard/email-composer.tsx`](../components/dashboard/email-composer.tsx) — modal with To (locked to buyer email), Subject, Body (textarea + simple variable insertion {{first_name}}, {{listing_title}}), Attachments (optional, Supabase Storage `crm-attachments` bucket), "Save as template" toggle.
   - Action `sendCrmEmail({ contactId, subject, body, attachments[] })`:
     1. Sends via Resend with `from = ${broker.name} <noreply@salebiz.com.au>` and `reply_to = broker.email_public`.
     2. Logs `email_sent` activity with `metadata.message_id`.
     3. Updates `last_emailed_at`, `last_contacted_at`.
     4. Auto-advance status to `contacted` if currently `new_lead`.
   - Templates table optional this milestone — for now persist as JSON on profile (`profiles.email_templates jsonb DEFAULT '[]'::jsonb`) added in the same migration.

   **b. BCC passive pipeline**:
   - On first visit to CRM page, ensure broker has `broker_bcc_addresses` row; expose address as `bcc-${token}@salebiz-mail.app` (whatever inbound domain we configure with Resend Inbound).
   - New API route [`app/api/inbound/email/route.ts`](../app/api/inbound/email/route.ts):
     - Accepts Resend Inbound webhook (signed via `RESEND_INBOUND_SECRET`).
     - Parses `to` header to extract token → broker_id; if no match, drop silently (return 200 to avoid retries).
     - For each recipient/cc/bcc that isn't a salebiz-mail.app address, attempt to match a `broker_contacts` row for that broker_id by email. If no match: create one with `source='manual'` and a flag `metadata.auto_created_from_bcc = true` so the broker can confirm.
     - Insert `crm_activities` row of kind `email_sent` with the email subject/body/headers, `metadata.message_id` to dedupe with the in-platform composer.
     - Bump `last_emailed_at` / `last_contacted_at`.
   - Inbound replies (broker is the recipient, contact is the sender): same matching but kind `email_received`. Reply-To detection: if `From:` matches a contact email AND `To:` matches a salebiz-mail.app token, log inbound.
   - UX: a small "Your private CRM address" card on the CRM page with copy button + 1-line explainer.
   - Edge cases:
     - Multiple buyers in one BCC → log against each (this matches what the spec describes: "files it under the right buyer").
     - Email body sanitization: strip quoted history before saving body (use simple "On … wrote:" regex; full sanitizer is overkill for v1).
     - Attachments: store in `crm-attachments` bucket and reference URLs in `metadata.attachments`.

5. **Call log popup.** New [`components/dashboard/call-log-dialog.tsx`](../components/dashboard/call-log-dialog.tsx) — opens from "Call" quick action on CRM row / buyer panel:
   - Trigger order: 1) `tel:` link opens dialer (we already track call clicks via [`lib/actions/analytics.ts`](../lib/actions/analytics.ts) presumably), 2) immediately popup with: outcome (`'connected'|'no_answer'|'voicemail'|'wrong_number'|'callback_requested'`), notes, optional follow-up date.
   - Submit → `logCall` action → inserts `call_clicks` (already exists) + `crm_activities` (new). Existing call tracking remains intact.

6. **Follow-ups due panel.** New component `<FollowUpsTodayBanner />` at the top of [`app/dashboard/contacts/page.tsx`](../app/dashboard/contacts/page.tsx) and [`app/dashboard/page.tsx`](../app/dashboard/page.tsx):
   - Fetches `getFollowUpsDueToday(brokerId)` (today + overdue).
   - Sortable: "Sort by overdue" pushes overdue rows to top; CRM "Follow-ups due" filter (M1.4) reuses this query.
   - Notifications: cron `scripts/follow-ups-due-cron.ts` runs daily at 8am AEST, creates `notifications` rows with type `follow_up_due` for items where `due_at::date = current_date AND completed_at IS NULL`.

7. **Custom CRM fields UI.** New [`app/dashboard/agency/custom-fields/page.tsx`](../app/dashboard/agency/custom-fields/page.tsx) (agency owners only — solo brokers see it under `app/dashboard/profile/custom-fields/`):
   - List of fields with rename/delete/sort; "Add field" wizard (label, type, options if select).
   - For each contact in CRM table: optional columns rendered for each defined field; `crm_custom_field_values` keyed by `(contact_id, field_id)`. Values editable inline.

**Acceptance**

- Sending an email through the composer instantly shows in the activity timeline AND advances status `new_lead → contacted`.
- BCC-ing the broker's private address from Gmail logs the email under the right contact within 30s and updates `last_emailed_at`.
- Setting a follow-up for tomorrow shows in the panel; a notification fires at 8am tomorrow.
- An agency owner adds "Hot lead" boolean field; both their brokers see the column in CRM.

---

### M1.3 — Internal Messaging / Chat (Broker ↔ Buyer)

**What's already there**

- Nothing. No messaging tables, no UI on either side. Confirmed in the codebase scan.

**What to add**

1. **Schema** — Migration `20260601000003_messaging.sql`:

   ```sql
   CREATE TABLE message_threads (
     id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     listing_id      uuid REFERENCES listings(id) ON DELETE SET NULL,
     broker_id       uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
     buyer_user_id   uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     last_message_at timestamptz,
     last_message_preview text,
     created_at      timestamptz NOT NULL DEFAULT now(),
     updated_at      timestamptz NOT NULL DEFAULT now(),
     UNIQUE (broker_id, buyer_user_id, listing_id)  -- one thread per (broker, buyer, listing); listing_id NULL = generic
   );
   CREATE INDEX idx_threads_broker_last  ON message_threads(broker_id, last_message_at DESC);
   CREATE INDEX idx_threads_buyer_last   ON message_threads(buyer_user_id, last_message_at DESC);

   CREATE TABLE messages (
     id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     thread_id       uuid NOT NULL REFERENCES message_threads(id) ON DELETE CASCADE,
     sender_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     sender_role     text NOT NULL CHECK (sender_role IN ('broker','buyer')),
     body            text NOT NULL,
     attachments     jsonb DEFAULT '[]'::jsonb, -- array of {url, name, size, mime}
     read_at         timestamptz,               -- when the *recipient* read it
     created_at      timestamptz NOT NULL DEFAULT now()
   );
   CREATE INDEX idx_messages_thread ON messages(thread_id, created_at DESC);

   ALTER TABLE message_threads ENABLE ROW LEVEL SECURITY;
   ALTER TABLE messages         ENABLE ROW LEVEL SECURITY;
   -- Server-only via service role; no public policies (matches enquiries table pattern).

   -- Storage: 'message-attachments' bucket, private, signed URL access via service role.
   INSERT INTO storage.buckets (id, name, public) VALUES ('message-attachments','message-attachments',false) ON CONFLICT DO NOTHING;
   ```

2. **Server actions** — new file [`lib/actions/messages.ts`](../lib/actions/messages.ts):
   - `startThreadFromEnquiry(enquiryId)` — used when broker hits "Reply via chat" on an enquiry; ensures a thread exists, returns id.
   - `getOrCreateThread({ brokerId, buyerUserId, listingId? })`.
   - `listBrokerThreads({ q?, unreadOnly?, page, pageSize })` — joins to buyer profile + last message preview.
   - `listBuyerThreads()` — buyer's own thread list.
   - `getThreadMessages(threadId, { cursor, limit })` — keyset pagination.
   - `sendMessage({ threadId, body, attachments[] })` — both broker and buyer use it; sets `sender_role` from the session role; updates `last_message_at`/`last_message_preview` on thread; mirrors into `crm_activities` (broker side) as `message_sent` / `message_received`; bumps `last_contacted_at` for broker; creates a `notifications` row of type `message_received` for the recipient; sends a Resend email IF recipient hasn't been online in last 5 min (we don't have presence — fall back to: always send for buyers, debounce 15min for brokers).
   - `markThreadRead(threadId)` — sets `read_at = now()` on all messages where recipient = current user.

3. **Realtime** — first use of Supabase Realtime in this app:
   - Subscribe to `messages` inserts filtered by `thread_id=eq.${threadId}` for the open thread.
   - Subscribe to `message_threads` updates filtered by `broker_id=eq.${brokerId}` (or `buyer_user_id=eq.${userId}`) for the thread list.
   - Bridge Supabase Realtime through service role: per existing pattern, all writes go through service-role server actions, but reads can use the anon key + RLS. To enable Realtime with RLS:
     - Add SELECT policies: `messages_select_participants`: `EXISTS (SELECT 1 FROM message_threads t WHERE t.id = thread_id AND (t.broker_id = auth.uid() OR t.buyer_user_id = auth.uid()))`.
     - `message_threads_select_participants` similarly.
   - However, this app's auth is NextAuth (JWT) not Supabase Auth — `auth.uid()` would be NULL. **Decision**: don't push Realtime through RLS; instead, run a thin WebSocket layer or use polling fallback. **Simplest path: poll messages every 3s while a thread is open + use SSE from a server route for the bell badge.** Add [`app/api/messages/stream/route.ts`](../app/api/messages/stream/route.ts) — long-lived SSE stream that tails per-user thread updates by polling the DB every 2s server-side (acceptable for low volume; can swap for proper websockets later). This avoids fighting NextAuth↔Supabase auth integration in M1.

4. **Broker UI**:
   - New left-nav item "Messages" → [`app/dashboard/messages/page.tsx`](../app/dashboard/messages/page.tsx).
   - Two-pane layout: threads list (search by buyer name/email + filter unread) on left; conversation pane on right.
   - Conversation pane: messages bubbles, attachments preview, "Send listing" attachment picker, "Request NDA" (links to existing `/dashboard/listings/[id]/nda` template + sends a system message linking the buyer to the listing's NDA), file upload to `message-attachments`.
   - Top of conversation: buyer info chip with "Open profile" → opens M1.1 panel.
   - Inline "Quick action" buttons that match the buyer panel (Email, Call, Note, Follow-up, Status).

5. **Buyer UI**:
   - New tab on [`/account`](../app/account/page.tsx): "Messages" — same two-pane shape, but threads list shows broker name + listing chip.
   - Composer can attach files (size limit 10MB, types: pdf/jpg/png/docx).

6. **Notifications**:
   - In-app: `notifications.type = 'message_received'`, link `/dashboard/messages?thread=XXX` (broker) or `/account?tab=messages&thread=XXX` (buyer).
   - Email: Resend template "New message from {{senderName}}" with deep link.

7. **CRM timeline integration**: every send/receive writes a mirror `crm_activities` row keyed by `(broker_id, buyer_user_id)` so the buyer panel timeline shows the message preview alongside emails/calls/notes.

**Acceptance**

- Broker opens any buyer panel → "Message" → conversation appears, sending shows up on buyer's `/account` Messages tab live (≤3s).
- Sending a message updates `last_contacted_at` and shows on the timeline.
- Sending a message while the recipient is offline triggers an email with a working deep link.
- Broker A can never see a thread between Broker B and any buyer.

---

### M1.4 — CRM UI Polish (rename, hotlinks, filters, quick actions)

**What's already there**

- CRM page already titled "CRM" via [`PageHeader`](../components/admin/page-header.tsx). Sidebar nav still says "Contacts" at [`components/dashboard/app-sidebar.tsx:57`](../components/dashboard/app-sidebar.tsx#L57). Old sidebar variant at [`components/app-sidebar.tsx:51`](../components/app-sidebar.tsx#L51) already says "CRM".
- Existing client view: [`app/dashboard/contacts/contacts-client-view.tsx`](../app/dashboard/contacts/contacts-client-view.tsx) — has search, tag filter, consent filter.

**What to add**

1. **Rename**: change `{ label: "Contacts" … }` to `{ label: "CRM" … }` in [`components/dashboard/app-sidebar.tsx`](../components/dashboard/app-sidebar.tsx). Breadcrumbs in [`app/dashboard/contacts/page.tsx`](../app/dashboard/contacts/page.tsx) already show "CRM". Keep the URL path `/dashboard/contacts` to avoid breakage; optionally add a redirect from `/dashboard/crm` → `/dashboard/contacts` so links shared in docs work.

2. **Hotlinks** — modify [`contacts-client-view.tsx`](../app/dashboard/contacts/contacts-client-view.tsx):
   - Email column: `<a href="mailto:{email}" onClick={() => logActivity('email_started')}>` — non-blocking activity ping (best-effort POST).
   - Phone column: `<a href="tel:{phone}" onClick={openCallLog}>` — opens M1.2 call-log popup right after the dialer opens.

3. **Filters bar** (extend existing filter set):
   - Budget range slider (uses new `profiles.budget_min/max` joined via `buyer_user_id`).
   - NDA status (`'any'|'signed'|'requested'|'none'`) — joined via [`nda_signatures`](../supabase/migrations/20260401000001_milestone3_nda_documents_comparison.sql) and `document_access_requests`.
   - Last activity (`'today'|'7d'|'30d'|'90d'|'older'`) — uses `last_contacted_at`.
   - Listing category — joined via the contact's enquiry/listing.
   - Enquiry stage / pipeline status — uses new `broker_contacts.status`.
   - Follow-up due — `next_follow_up_at <= now()` & `completed_at IS NULL`.
   - All filters URL-synced via `useSearchParams` so filtered views are shareable.

4. **Tab strip** above table: All • Hot leads • Follow-ups due • NDA signed • Documents shared • Negotiating. Each tab is a saved filter preset. "Hot leads" reads from a default custom field if it exists, else from a tag named "Hot lead".

5. **Row-level quick actions** (icon button row on hover or sticky right column):
   - Email → opens composer (M1.2).
   - Call → opens `tel:` + call-log popup.
   - Note → opens add-note popup (just textarea + save).
   - Follow-up → opens follow-up popup.
   - Send listing → opens the existing listing picker from `bulk-send-tab.tsx` but pre-targeted to this single contact.
   - Open profile → opens M1.1 panel.

6. **Density/loading**: keep table virtualised once row count exceeds 100 (use `@tanstack/react-table` already installed). Skeleton loader matching [`app/dashboard/loading.tsx`](../app/dashboard/loading.tsx) pattern.

**Acceptance**

- Sidebar shows "CRM"; clicking still lands on the existing route.
- Clicking an email opens default mail client and adds an `email_started` activity.
- Clicking a phone number triggers `tel:` and the call-log dialog appears.
- The "Follow-ups due" tab matches the banner from M1.2.
- Filter combinations stay in URL after refresh.

---

## Milestone 2 — Data Room, AI Insights & Buyer-Side

### M2.1 — Unified NDA + Data Room screen

**What's already there**

- Two separate broker pages: [`/dashboard/listings/[id]/nda`](../app/dashboard/listings/%5Bid%5D/nda/page.tsx) (template + signatures), [`/dashboard/listings/[id]/documents`](../app/dashboard/listings/%5Bid%5D/documents/page.tsx) (vault + per-doc approval).
- Per-document approval table: [`document_access_requests`](../supabase/migrations/20260418000001_document_approval.sql).
- Public listing page handles NDA signing + per-doc access via [`components/listings/document-vault.tsx`](../components/listings/document-vault.tsx).

**What to add**

1. **New unified route** [`app/dashboard/listings/[id]/data-room/page.tsx`](../app/dashboard/listings/%5Bid%5D/data-room/page.tsx) with three tabs (using [`components/ui/tabs.tsx`](../components/ui/tabs.tsx)):
   - **Buyers** — table of every buyer who has touched this listing (enquired, signed NDA, requested docs). Columns: name, NDA status, access state, last activity, docs viewed. Row click → opens M1.1 panel scoped to this listing. Bulk actions: approve all pending, revoke all.
   - **Files & Folders** — see M2.2.
   - **Settings** — NDA template editor (existing UI from `nda-manager.tsx`), `is_required` toggle, new `auto_approve` toggle (default off — broker must approve), `default_access_scope` (`'no_access'|'all_approved'|'selected'`).

2. **Redirects**: keep `/dashboard/listings/[id]/nda` and `/dashboard/listings/[id]/documents` working but mark deprecated. In their `page.tsx` add `redirect(\`/dashboard/listings/${id}/data-room?tab=settings\`)` and `?tab=files` respectively.

3. **Pre-approval metadata lockdown**. Today public buyers can read non-confidential approved doc rows. With folders, we must hide:
   - Folder names, file names, file sizes, and previews until approved.
   - Implementation: split the existing public RPC into two:
     - `getPublicListingDocumentsCount(listingId)` → just `int` total + `int approved_count`.
     - `getDocumentAccessForBuyer(listingId, buyerUserId)` → returns the actual tree only if `approved_count > 0`.
   - Update [`document-vault.tsx`](../components/listings/document-vault.tsx): pre-NDA = "🔒 Sign NDA to view N documents"; post-NDA pre-approval = "🔒 Awaiting broker approval — N documents available"; post-approval = scoped tree (M2.2).
   - Update RLS on `listing_documents`: drop the existing public select policy; replace with one keyed on the buyer having an approved `document_access_requests` row OR a row in new `data_room_buyer_access` table with `access_level <> 'none'`.

4. **Auto-approval setting**. New column on `listing_ndas`:
   ```sql
   ALTER TABLE listing_ndas ADD COLUMN auto_approve boolean NOT NULL DEFAULT false;
   ALTER TABLE listing_ndas ADD COLUMN default_access_scope text NOT NULL DEFAULT 'selected'
     CHECK (default_access_scope IN ('no_access','selected','all_approved'));
   ```
   When `auto_approve=true`, on NDA sign create the buyer's `data_room_buyer_access` row with the listing's default scope, no broker action required.

**Acceptance**

- Navigating to `/dashboard/listings/[id]/data-room` shows three tabs that replicate everything the two old pages did.
- A buyer who hasn't signed the NDA sees zero file/folder names anywhere on the listing detail page.
- Toggling "auto-approve" gives buyers instant access on NDA sign.

---

### M2.2 — Vault / Data Room (folders, permissions, tracking, uploads)

**What's already there**

- Flat document list per listing: [`listing_documents`](../supabase/migrations/20260401000001_milestone3_nda_documents_comparison.sql).
- Per-document approval flow: [`document_access_requests`](../supabase/migrations/20260418000001_document_approval.sql).
- Single-file upload via [`uploadListingDocument`](../lib/actions/documents.ts). Bucket `listing-documents` private, served via signed URLs.
- Document approval notifications for brokers + auto-create-on-NDA: [`20260505000001_document_access_notifications.sql`](../supabase/migrations/20260505000001_document_access_notifications.sql).

**What to add**

1. **Schema** — Migration `20260615000001_data_room.sql`:
   ```sql
   CREATE TABLE data_room_folders (
     id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     listing_id      uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
     parent_id       uuid REFERENCES data_room_folders(id) ON DELETE CASCADE,
     name            text NOT NULL,
     description     text,
     sort_order      int NOT NULL DEFAULT 0,
     created_by      uuid REFERENCES profiles(id) ON DELETE SET NULL,
     created_at      timestamptz NOT NULL DEFAULT now(),
     updated_at      timestamptz NOT NULL DEFAULT now()
   );
   CREATE INDEX idx_drf_listing_parent ON data_room_folders(listing_id, parent_id);

   ALTER TABLE listing_documents ADD COLUMN folder_id uuid REFERENCES data_room_folders(id) ON DELETE SET NULL;
   ALTER TABLE listing_documents ADD COLUMN description text;
   CREATE INDEX idx_listing_documents_folder ON listing_documents(folder_id);

   -- Per-buyer access scope for an entire listing (the "access dropdown")
   CREATE TABLE data_room_buyer_access (
     id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     listing_id      uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
     buyer_user_id   uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     access_level    text NOT NULL CHECK (access_level IN
                       ('none','selected_files','selected_folders','all_approved','temporary')),
     expires_at      timestamptz,
     can_download    boolean NOT NULL DEFAULT true,
     granted_by      uuid REFERENCES profiles(id) ON DELETE SET NULL,
     granted_at      timestamptz NOT NULL DEFAULT now(),
     revoked_at      timestamptz,
     UNIQUE (listing_id, buyer_user_id)
   );
   CREATE INDEX idx_drba_expiry ON data_room_buyer_access(expires_at) WHERE revoked_at IS NULL;

   -- Per-buyer file/folder allowlist when access_level = 'selected_files'/'selected_folders'
   CREATE TABLE data_room_buyer_grants (
     id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     access_id       uuid NOT NULL REFERENCES data_room_buyer_access(id) ON DELETE CASCADE,
     folder_id       uuid REFERENCES data_room_folders(id) ON DELETE CASCADE,
     document_id     uuid REFERENCES listing_documents(id) ON DELETE CASCADE,
     CHECK ((folder_id IS NULL) <> (document_id IS NULL))
   );
   CREATE INDEX idx_drbg_access ON data_room_buyer_grants(access_id);

   -- View / download tracking
   CREATE TABLE data_room_document_events (
     id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     listing_id      uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
     document_id     uuid NOT NULL REFERENCES listing_documents(id) ON DELETE CASCADE,
     buyer_user_id   uuid REFERENCES users(id) ON DELETE SET NULL,
     event_kind      text NOT NULL CHECK (event_kind IN ('view','preview','download')),
     ip_address      text,
     occurred_at     timestamptz NOT NULL DEFAULT now()
   );
   CREATE INDEX idx_drde_listing_doc ON data_room_document_events(listing_id, document_id, occurred_at DESC);
   CREATE INDEX idx_drde_buyer       ON data_room_document_events(buyer_user_id, occurred_at DESC);
   ```

2. **Server actions** — new file [`lib/actions/data-room.ts`](../lib/actions/data-room.ts):
   - Folder CRUD: `createFolder`, `renameFolder`, `moveFolder`, `deleteFolder` (cascades documents into parent or root, with confirm prompt that lists files).
   - File CRUD: `moveDocument(docId, folderId)`, `renameDocument`, `deleteDocument`, `setDocumentDescription`. Build on existing [`lib/actions/documents.ts`](../lib/actions/documents.ts).
   - Default-folder seeder: when broker first opens the new Files tab on a listing without folders, offer "Create default folders" (Financials, Lease, Staff, Equipment, Legal, Operations) — single insert.
   - Access controls: `setBuyerAccess({ listingId, buyerUserId, accessLevel, expiresAt?, canDownload, grants? })`. On change, log to `crm_activities` (`status_changed` or new `access_granted`).
   - View/download tracking: `recordDocumentEvent({ documentId, eventKind })` — called from buyer-side viewer and download endpoint; also bumps `last_active_at` on profile.
   - Stats: `getDataRoomActivity(listingId)` — counts of unique viewers, top-viewed docs, top-engaged buyers.

3. **Background job — auto-revoke on expiry**:
   - Cron `scripts/data-room-expiry-cron.ts` runs every 5 min:
     - For each `data_room_buyer_access` with `expires_at <= now() AND revoked_at IS NULL` → set `revoked_at = now()`, create a `notifications` row of type `access_expired` for the buyer, log `crm_activities` of kind `status_changed` for the broker.
     - 24h before expiry: send `access_expiring` notification.
   - Add to `package.json` scripts and to whatever cron runner is already set up alongside [`buyer-alerts-cron.ts`](../scripts/buyer-alerts-cron.ts).
   - **Real-time hide**: the buyer-side data room read query MUST also filter `revoked_at IS NULL AND (expires_at IS NULL OR expires_at > now())` so even between cron runs the buyer is locked out. The cron is for notifications + cleanup, not the security boundary.

4. **Broker upload UI** — rebuild at [`app/dashboard/listings/[id]/data-room/files/`](../app/dashboard/listings/%5Bid%5D/data-room/files/):
   - Component [`components/dashboard/data-room-tree.tsx`](../components/dashboard/data-room-tree.tsx): folder tree on left, file list on right, breadcrumb top.
   - Drag-and-drop multi-file upload using existing `@dnd-kit/*` packages already in `package.json`. Files dropped on a folder = upload there.
   - **Direct-to-storage uploads**: signed-upload URLs minted by a server action so the browser PUTs directly to Supabase Storage — avoids Next.js body-size limits and shows real progress per file. New action `getSignedUploadUrl({ listingId, folderId, fileName, fileSize, fileType })` returns `{ url, token, path }`. After successful PUT, client calls `finalizeDocumentUpload({ token, name, description, isConfidential, category })`.
   - Per-file progress bar; pause/retry; concurrent uploads (max 3).
   - File actions: rename, move (drag), delete, set description, mark confidential, preview.
   - Folder actions: create subfolder, rename, move, delete, sort.
   - Search across folders + files.

5. **Per-buyer access UI** (data-room "Buyers" tab):
   - Each buyer row gets an "Access" dropdown:
     - No access (default for new approvals)
     - View all approved files
     - View selected files (opens picker — checkboxes against tree)
     - View selected folders (folder-only picker)
     - Temporary access (sets default scope + required expiry date picker)
   - Toggle: Allow downloads (vs view-only).
   - Audit summary: views, downloads, last activity per buyer.

6. **Buyer-side data room viewer**:
   - On [`/listing/[slug]`](../app/listing/%5Bslug%5D/page.tsx): replace [`document-vault.tsx`](../components/listings/document-vault.tsx) with new [`buyer-data-room.tsx`](../components/listings/buyer-data-room.tsx) — folder tree, search, recently-added badges (files added in last 7 days), expiry warning banner if `expires_at` within 72h.
   - Approved-only branch: render full tree filtered by `getDataRoomTreeForBuyer(listingId, buyerUserId)` on the server to avoid leaking metadata.
   - Expired branch: single card "Access expired — request renewal" with a button that creates a `data_room_request_renewal` notification for the broker.
   - Buyer's [`/account`](../app/account/page.tsx) gets a **Vault** tab listing every listing they have access to, deep-linking back to the listing's data room.

7. **In-platform document preview** — new [`components/listings/secure-document-viewer.tsx`](../components/listings/secure-document-viewer.tsx):
   - PDF: use `<iframe src={signedUrl}>` (Chrome/Safari/Firefox built-in viewer); add `?download=0&toolbar=0` hints; mostly visual, doesn't truly prevent download.
   - Images: `<img>` with right-click disabled and watermark overlay (broker name + buyer email + date).
   - DOCX/XLSX: use Microsoft Office online viewer iframe (`https://view.officeapps.live.com/op/embed.aspx?src=ENCODED_URL`) — requires the signed URL to be temporarily public; we use short-TTL signed URLs (60s) and refresh on each view event.
   - Every preview hit calls `recordDocumentEvent('preview')`; downloads call `recordDocumentEvent('download')`.

8. **Vault tracking dashboard** — new section on data-room "Buyers" tab and a summary on listing's `/insights` page:
   - Per-buyer: total views, total downloads, last viewed doc.
   - Per-document: unique viewers, most-viewed.
   - Sparkline of activity over last 30 days.

9. **Notifications** — created in M1.2 migration; here we add the trigger calls:
   - Broker: `data_room_request` (buyer requests access) — already partially in place via `document_access_notifications` migration; extend.
   - Broker: `data_room_view` (debounced 1/hr/buyer/listing).
   - Broker: `data_room_download`.
   - Buyer: `access_approved`, `new_files_added` (debounced 1/24h/listing), `access_expiring`, `access_expired`.

**Acceptance**

- Broker can drag 20 files at once into a folder; all upload concurrently with progress; failed uploads retry without re-picking.
- Buyer A sees "Financials" only; Buyer B sees "Lease" only; Buyer C sees everything; Broker A's buyer never sees Broker B's listing files.
- A temporary-access buyer loses access at `expires_at` (folders/files vanish from UI) within seconds, sees only the "Access expired" card.
- Brokers see a count of who viewed which docs and when.

---

### M2.3 — AI Insights Expansion + Buyer Feedback

**What's already there**

- OpenAI integration: [`lib/ai/openai.ts`](../lib/ai/openai.ts), [`lib/ai/listings.ts`](../lib/ai/listings.ts), [`lib/ai/listing-insights.ts`](../lib/ai/listing-insights.ts), [`lib/ai/broker-insights.ts`](../lib/ai/broker-insights.ts).
- Per-listing insights endpoint: [`/api/ai/listings/[id]/insights`](../app/api/ai/listings/%5Bid%5D/insights/).
- Listing analytics table + charts: [`listing_analytics`](../supabase/migrations/20260401000002_listing_analytics.sql), [`/dashboard/analytics`](../app/dashboard/analytics/).

**What to add**

1. **Schema** — Migration `20260615000002_buyer_feedback.sql`:
   ```sql
   CREATE TABLE buyer_feedback_tags (
     id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     broker_id       uuid REFERENCES profiles(id) ON DELETE CASCADE,
     agency_id       uuid REFERENCES agencies(id) ON DELETE CASCADE,
     label           text NOT NULL,
     category        text CHECK (category IN ('pricing','financials','lease','operations','staff','legal','timing','other')),
     created_at      timestamptz NOT NULL DEFAULT now()
   );

   -- Seed common tags (price too high, wants more financials, lease worry, …)
   -- agency_id NULL + broker_id NULL = global default tag.

   CREATE TABLE buyer_feedback (
     id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     broker_id       uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
     listing_id      uuid REFERENCES listings(id) ON DELETE SET NULL,
     buyer_user_id   uuid REFERENCES users(id) ON DELETE SET NULL,
     contact_id      uuid REFERENCES broker_contacts(id) ON DELETE SET NULL,
     source          text NOT NULL CHECK (source IN ('call','message','email','meeting','note','manual')),
     body            text,
     created_at      timestamptz NOT NULL DEFAULT now()
   );
   CREATE INDEX idx_buyer_feedback_listing ON buyer_feedback(listing_id, created_at DESC);
   CREATE INDEX idx_buyer_feedback_broker  ON buyer_feedback(broker_id, created_at DESC);

   CREATE TABLE buyer_feedback_tag_map (
     feedback_id uuid REFERENCES buyer_feedback(id) ON DELETE CASCADE,
     tag_id      uuid REFERENCES buyer_feedback_tags(id) ON DELETE CASCADE,
     PRIMARY KEY (feedback_id, tag_id)
   );

   CREATE TABLE listing_ai_insights_cache (
     listing_id      uuid PRIMARY KEY REFERENCES listings(id) ON DELETE CASCADE,
     payload         jsonb NOT NULL,
     generated_at    timestamptz NOT NULL DEFAULT now()
   );
   ```

2. **Quick feedback capture component** [`components/dashboard/feedback-quick-add.tsx`](../components/dashboard/feedback-quick-add.tsx):
   - Always 1–2 clicks: (a) tag chip(s) from a recents+common list; (b) optional one-line note.
   - Triggers exposed from:
     - CRM row "Note" quick action gets a "Tag as feedback" toggle.
     - Buyer panel quick-add button.
     - Call-log popup (post-call). Reuse common tags inline.
     - Message thread "(...)" menu on a buyer message.
   - Action `addBuyerFeedback({ listingId, buyerUserId, source, tagIds, body })` — stores to `buyer_feedback`, mirrors `crm_activities` of kind `feedback_logged`, fires notification only if `body` is non-empty (debounced).

3. **Per-listing feedback panel** on [`/dashboard/listings/[id]/insights`](../app/dashboard/listings/%5Bid%5D/insights/page.tsx):
   - Top section: tag aggregate bar chart (which tags are most common for this listing).
   - List below: every feedback item (timestamp, buyer name → opens panel, tags as pills, body excerpt). Filters: by tag, by source, by date.
   - "Generate seller update" button → see step 5.

4. **AI input expansion** — modify [`lib/ai/listing-insights.ts`](../lib/ai/listing-insights.ts):
   - Existing input (analytics, listing data) PLUS:
     - Aggregated buyer feedback (top tags + recent comments, max 50).
     - CRM notes (from `crm_activities` kind `note_added` for buyers tied to this listing, last 30 days).
     - NDA flow stats: signed/pending/rejected counts, time-to-sign median.
     - Document engagement: views, downloads, drop-off after preview.
     - Message volume + sentiment (lightweight: word-list-based; OK to skip in v1).
   - Output JSON shape:
     ```json
     {
       "patterns": ["string"],          // 2–5 short observations
       "drop_offs": ["string"],         // funnel friction points
       "suggestions": [                 // each is structured for "Apply"
         { "kind": "price_adjustment"|"add_documents"|"update_description"|"follow_up_buyers", "title": "string", "detail": "string", "buyer_ids": ["uuid"] }
       ],
       "summary": "string"
     }
     ```
   - Cache to `listing_ai_insights_cache` for 6h; recompute on demand or when new feedback/CRM activity arrives.

5. **Seller update generator** — new action `generateSellerUpdate(listingId, periodDays = 30)`:
   - Composes a multi-paragraph email summarizing: listing performance, buyer feedback themes, broker recommendations.
   - Returns `{ subject, html, text, pdf_url? }`. PDF generation: server-side via Puppeteer/Playwright is heavy; for v1 use a server route that renders a styled HTML response with `Content-Type: application/pdf` is not viable — instead render to HTML, let the browser print-to-PDF via `window.print()` styled with `@media print`. Add a "Copy email", "Send via in-platform composer", and "Open print preview" button trio.
   - Stores generated payload to `crm_activities` kind `note_added` with `metadata.seller_update = true` so brokers can find past versions.

6. **Broker dashboard insights** — extend [`lib/ai/broker-insights.ts`](../lib/ai/broker-insights.ts) to include the new feedback aggregate across all the broker's listings ("This week your buyers most often mentioned: pricing (12×), lease terms (5×) …").

**Acceptance**

- Broker logs feedback in two clicks while viewing the buyer panel; feedback shows on listing's insights page within 1s.
- "Generate seller update" produces an email that references actual feedback tags (not generic copy).
- AI patterns list reflects newly-logged feedback within the cache TTL or after an explicit refresh.

---

### M2.4 — Enquiry Form Customisation per Listing

**What's already there**

- Single hardcoded enquiry form on listing detail; submission via [`lib/actions/enquiries.ts`](../lib/actions/enquiries.ts) writes to [`enquiries`](../supabase/migrations/20250226000001_enquiries.sql).

**What to add**

1. **Schema** — Migration `20260615000003_enquiry_form_config.sql`:
   ```sql
   CREATE TABLE listing_enquiry_form_configs (
     listing_id      uuid PRIMARY KEY REFERENCES listings(id) ON DELETE CASCADE,
     require_phone   boolean NOT NULL DEFAULT false,
     ask_budget      boolean NOT NULL DEFAULT false,
     ask_funding     boolean NOT NULL DEFAULT false,
     ask_industry    boolean NOT NULL DEFAULT false,
     ask_timeframe   boolean NOT NULL DEFAULT false,
     custom_questions jsonb NOT NULL DEFAULT '[]'::jsonb,
     -- shape: [{ id, label, type:'text'|'select'|'number'|'boolean', required, options? }]
     created_at      timestamptz NOT NULL DEFAULT now(),
     updated_at      timestamptz NOT NULL DEFAULT now()
   );

   ALTER TABLE enquiries ADD COLUMN form_responses jsonb DEFAULT '{}'::jsonb;
   -- { budget_min, budget_max, funding, industry, timeframe, custom: { [questionId]: value } }
   ```

2. **Listing wizard** — currently single-page form at [`app/dashboard/listings/new/page.tsx`](../app/dashboard/listings/new/page.tsx) and edit at [`app/dashboard/listings/[id]/edit/edit-listing-form.tsx`](../app/dashboard/listings/%5Bid%5D/edit/edit-listing-form.tsx). Add a 4th step (or 4th tab on edit) "Enquiry Form" with:
   - Toggle group for the 5 standard extras.
   - "Add question" repeater for custom questions (label, type, required, options for select).
   - Live preview of the form on the right.

3. **Public form** — update enquiry form in [`app/listing/[slug]`](../app/listing/%5Bslug%5D/) to fetch the listing's config and render the right fields. Validation via Zod from a config-driven schema.

4. **CRM ingestion** — when an enquiry has `form_responses.budget_*`, write through to the buyer's `profiles` budget fields (only if the buyer doesn't already have them set, to avoid clobbering). Same for funding_status, timeframe, preferred_industries.

5. **Filter integration** — M1.4 budget/funding filters are now actually populated for new enquiries.

**Acceptance**

- A broker can add a "What's your timeline?" select question; buyers see it on the listing; the answer appears in CRM and on the buyer panel.
- Setting `ask_budget=true` populates the budget filter for that broker's contacts as buyers submit.

---

### M2.5 — Region Improvements (Australia-wide)

**What's already there**

- Listings have `state`, `suburb`, `postcode`, `location_text`. Wizard uses Google Places autocomplete via [`/api/places/`](../app/api/places/).
- Buyer alerts use `state` + `suburb` (file:[`buyer_alert_preferences`](../supabase/migrations/20260502000001_buyer_profile_panel.sql)).

**What to add**

1. **Schema** — Migration `20260615000004_regions.sql`:
   ```sql
   CREATE TABLE regions (
     id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     state           text NOT NULL,                -- 'NSW','VIC','QLD','WA','SA','TAS','ACT','NT'
     name            text NOT NULL,                -- 'Sydney','North Shore','Western Sydney','Regional NSW'
     slug            text NOT NULL UNIQUE,
     sort_order      int NOT NULL DEFAULT 0,
     active          boolean NOT NULL DEFAULT true,
     UNIQUE (state, name)
   );

   ALTER TABLE listings  ADD COLUMN region_id uuid REFERENCES regions(id) ON DELETE SET NULL;
   ALTER TABLE listings  ADD COLUMN hide_exact_suburb boolean NOT NULL DEFAULT false;
   ALTER TABLE buyer_alert_preferences ADD COLUMN region_id uuid REFERENCES regions(id) ON DELETE SET NULL;
   CREATE INDEX idx_listings_region ON listings(region_id);
   ```

2. **Seed data** — full Australia-wide coverage in `supabase/seed-regions.sql` (run after migration). Coverage:
   - NSW: Sydney, North Shore, Eastern Suburbs, Inner West, Northern Beaches, Western Sydney, South West Sydney, Sutherland Shire, Central Coast, Newcastle/Hunter, Illawarra, Regional NSW.
   - VIC: Melbourne Metro, Inner Melbourne, Eastern Suburbs, Western Suburbs, Northern Suburbs, Southern Suburbs, Mornington Peninsula, Geelong, Regional VIC.
   - QLD: Brisbane Region, Gold Coast Region, Sunshine Coast, Toowoomba, Cairns, Townsville, Regional QLD.
   - WA: Perth Metro, Fremantle, Regional WA.
   - SA: Adelaide Metro, Adelaide Hills, Regional SA.
   - TAS: Hobart, Launceston, Regional TAS.
   - ACT: Canberra.
   - NT: Darwin, Regional NT.

3. **Listing wizard** — add region picker (filtered by state) + a "Hide exact suburb publicly" toggle. Store both. Suburb stays in DB so alerts can still match precisely.

4. **Search & alerts** — update [`/search`](../app/search/page.tsx) and the buyer alerts cron [`scripts/buyer-alerts-cron.ts`](../scripts/buyer-alerts-cron.ts):
   - Search filters: region (parent of suburb) + state.
   - Match logic: a listing matches an alert if any of these are true: `alert.region_id == listing.region_id`, `alert.suburb == listing.suburb`, `alert.state == listing.state` and other filters pass.

5. **Public listing detail** — when `hide_exact_suburb=true`, render `region.name + state` instead of suburb on the listing page, search results, share invites, comparison cards. Map: drop precision to region centroid (or omit map entirely for that listing).

6. **Admin UI** — new [`app/admin/regions/page.tsx`](../app/admin/regions/page.tsx) — table with add/rename/sort/disable. Anyone in admin role can manage.

**Acceptance**

- Wizard offers "Sydney" or "North Shore" without forcing a suburb.
- Toggling hide_exact_suburb hides "Crows Nest" from public pages but a buyer alert keyed to Crows Nest still matches.
- Admin renames "Regional NSW" → "NSW Country" and the change appears everywhere immediately.

---

## Cross-cutting: Mobile Parity (deferred from spec but kept in view)

Out of scope for these two milestones per the message, but tracked here so the API surface is built mobile-friendly:

- All new server actions also need REST equivalents under `app/api/mobile/*` for the mobile app. Build the action first, then add a thin route wrapper. Don't gate the milestones on shipping mobile — that's a separate pass.

---

## Dependency graph (build order)

```
M1.1 schema (buyer profile fields)
  └── M1.1 buyer panel + actions
        └── M1.2 schema (CRM activity, follow-ups, custom fields)
              └── M1.2 actions + email composer + BCC pipeline + call log + status auto-rules
                    └── M1.4 (CRM polish: filters, hotlinks, quick actions, tab strip)
                    └── M1.3 schema (messaging)
                          └── M1.3 actions + UI on broker + buyer + SSE bell
                                └── M2.1 (Data Room screen)
                                      └── M2.2 (folders, permissions, uploads, viewer, expiry cron)
                                            └── M2.3 (feedback + AI expansion)
                                                  └── M2.4 (enquiry form customisation)
                                                        └── M2.5 (regions)
```

In practice we can parallelize once the M1.2 schema lands: M1.4 polish is a fast sweep, M1.3 messaging is independent, and M2.5 regions is independent of everything in M2 and could ship with M1 if convenient.

## Risks / open questions

1. **Realtime auth** — NextAuth + Supabase RLS doesn't share `auth.uid()`. Plan picks SSE-via-server polling for messaging in M1.3 to dodge this. If the team wants true Supabase Realtime later, we'd need to mint a Supabase JWT for each NextAuth session (one-line server helper, but introduces a second auth source).
2. **Inbound email infra** — needs a provider (Resend Inbound, Mailgun Routes, AWS SES + SNS). Not yet in env. Step before starting M1.2: confirm the inbound provider + domain. We'll need DNS access to add MX for `salebiz-mail.app` (or subdomain like `mail.salebiz.com.au`).
3. **Office viewer for DOCX/XLSX** — using Microsoft's hosted viewer requires temporarily-public signed URLs. Acceptable for v1; if higher security is required, server-side conversion to PDF (LibreOffice headless) is the next step.
4. **Auto-revoke timing** — we rely on the read query (always filter `expires_at > now()`) for the security boundary; cron is for notifications + cleanup. This is the right pattern, calling it out explicitly so reviewers don't ask to "speed up the cron".
5. **Custom fields scope** — spec says company-level. We allow a per-broker fallback when there's no agency (solo brokers). If the team disagrees, drop the broker_id branch and require all custom fields to be agency-only.
6. **Feedback tag library** — keep it small initially (8–12 tags seeded globally, brokers/agencies can add their own). Avoids a useless free-for-all in v1.
7. **Uploads exceeding Vercel/Edge body limits** — direct-to-storage signed PUT URLs side-step this. Document the size cap (50MB single file, configurable) in the broker UI.

## Definition of Done per feature

Every feature must satisfy:

- A new migration file with both `up` and `down` reversal commented inline (we don't have a strict down migration tool, but reviewers should see how to revert).
- All server actions enforce `requireBroker()` / `requireAuth()` and explicit `broker_id` filters — no joins that could leak across brokers.
- Buyer-isolation tests: a manual test script that creates two brokers, two buyers, cross-listings, and verifies broker A sees zero of broker B's data through every new screen.
- React Query keys are stable + include broker/listing/buyer scope so cache poisoning across accounts is impossible.
- New UI components have a loading skeleton, an empty state, and an error state.
- Mobile-relevant actions also expose a `/api/mobile/*` JSON route (lightweight wrapper — avoids forcing mobile rebuild later).
- All new tables have RLS enabled; if writes are service-role-only (most are), document that no SELECT policy is needed for the buyer side and describe the read path.
