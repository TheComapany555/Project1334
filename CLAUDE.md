# CLAUDE.md — SaleBiz (Project1334)

Codebase guide for the SaleBiz web app. Written during the REAXML-import / category-taxonomy work; kept general so it stays useful. Verify file:line references against current code before relying on them.

---

## 1. Architecture overview

- **Framework:** Next.js 16 (App Router) + React + TypeScript. Tailwind CSS. UI primitives in `components/ui/*` are shadcn-style, built on `@base-ui/react` / Radix.
- **Auth:** NextAuth v4 with a **custom credentials provider** (bcrypt password hashing via `bcryptjs`, JWT sessions via `jose`). **Not Supabase Auth.** OTP / set-password flows use a custom `auth_tokens` table. The session carries `user.id`, `user.role` (`admin | broker | user`), `user.agencyId`, `user.agencyRole` (`owner | member`).
- **Data layer:** Supabase Postgres. Server code uses `createServiceRoleClient()` ([lib/supabase/admin.ts](lib/supabase/admin.ts)) which **bypasses RLS** — so authorization is enforced **in code** (see `requireBroker()` / `requireAdmin()`), not by RLS. RLS policies still exist and matter for the **public/anon** path (e.g. anon can read `status='published'` listings).
- **Backend = server actions.** Almost all business logic lives in `lib/actions/*.ts` files marked `"use server"`. `app/api/*` routes exist only for: mobile app (`/api/mobile/*`), Stripe (`/api/stripe/*`), AI (`/api/ai/*`), Geoapify places (`/api/places/*`), and inbound email/webhooks.
- **Integrations:** Stripe (payments/subscriptions), Resend (email), OpenAI (listing generate/rewrite/insights), Geoapify (location autocomplete). Supabase Storage buckets: **`listing-images` (public)**, **`listing-documents` (private/signed URLs)**.
- **Mobile:** a separate Expo app (`../salebiz-mobile`) consumes the `/api/mobile/*` routes. Changing those response shapes can break mobile.

## 2. Folder structure

```
app/                     App Router routes
  page.tsx               Public homepage
  search/                Public search + filters
  listing/[slug]/        Public listing detail
  broker/[slug]/ agency/[slug]/ compare/ saved/   Public
  dashboard/             BROKER workspace (listings, contacts, enquiries, data-room, support…)
  admin/                 ADMIN workspace (categories, products, analytics, support…)
  account/               BUYER workspace (vault, alerts, favourites…)
  api/                   mobile / stripe / ai / places / inbound
components/
  ui/                    Primitives (button, dialog, select, combobox, …)
  dashboard/ admin/ listings/ account/ analytics/   Feature components
lib/
  actions/               Server actions ("use server") — the backend
  types/                 Shared TypeScript types
  ai/ jobs/ pdf/ supabase/   Helpers
  slug.ts listings-import.ts …   Pure/shared helpers
supabase/migrations/     Raw SQL migrations (timestamped: YYYYMMDDHHMMSS_name.sql)
scripts/                 Seed + cron scripts (run via `npx tsx`)
hooks/  middleware.ts  public/
```

## 3. Coding patterns & conventions

- **Server action shape:** `"use server"`; guard with `requireBroker()` / `requireAdmin()` (throws `Unauthorized`); use `createServiceRoleClient()`; return a **discriminated result** `{ ok: true, … } | { ok: false, error }`. See [lib/actions/listings.ts](lib/actions/listings.ts).
- **Authorization in code:** agency **owners** see/edit all agency listings (`.eq('agency_id', …)`); **members/solo** see their own (`.eq('broker_id', userId)`). Mirror this for any new listing-scoped action.
- **Listings ownership:** `broker_id` = current owner/assignee (moves on reassignment); `created_by` = original creator (fixed); `agency_id` = owning agency.
- **Partial updates:** `updateListing` builds its payload with the `if (form.x !== undefined) payload.x = …` pattern — extend by adding new optional fields the same way; never make existing callers pass new fields.
- **Forms:** `react-hook-form` + `zod`. The create form ([app/dashboard/listings/new/page.tsx](app/dashboard/listings/new/page.tsx)) is multi-step (step1/step2/step3 schemas merged). Searchable selects use the `Combobox` primitive ([components/ui/combobox.tsx](components/ui/combobox.tsx), supports `ComboboxGroup`/`ComboboxLabel`). User feedback via `sonner` `toast`.
- **Slugs:** `generateListingSlug(title)` (title + nanoid) and `generateSlugFromName()` in [lib/slug.ts](lib/slug.ts).
- **Migrations:** raw SQL; always `ENABLE ROW LEVEL SECURITY` + add policies; seeds are **idempotent** (`ON CONFLICT … DO NOTHING`). New tables that anon should read need an explicit `anon` SELECT policy.
- **Numbers/price:** `toNumeric()` for numeric coercion; `price_type ∈ {fixed, poa}`.
- **No test framework is configured** (no jest/vitest, no `*.test.ts`). New testable logic should be written as pure functions; adding a runner (vitest) for new modules is a deliberate, scoped decision.

## 4. Data flow (listings)

- **Create (manual):** form → `createListing()` ([listings.ts:590](lib/actions/listings.ts#L590)) inserts a `listings` row + `listing_highlight_map`; images uploaded separately via `uploadListingImage()` ([listings.ts:889](lib/actions/listings.ts#L889), optimises to JPEG, public bucket).
- **Bulk import (CSV/XLSX):** client parses & maps columns ([components/dashboard/import-listings-dialog.tsx](components/dashboard/import-listings-dialog.tsx)) → chunks of 100 → `importListings()` ([lib/actions/listings-import.ts](lib/actions/listings-import.ts)) inserts **drafts**; resolves category by name/slug; **skips images**.
- **Public browse:** `searchListings()` ([listings.ts:395](lib/actions/listings.ts#L395)) selects `*` + joins, filters `status='published'`, applies featured ordering. Category filter resolves a slug → `category_id`.
- **Categories:** flat table ([supabase/migrations/20250224000004_categories.sql](supabase/migrations/20250224000004_categories.sql)), read via `getCategories()` ([listings.ts:138](lib/actions/listings.ts#L138)). ~40 files consume categories but are **category-agnostic** (they render whatever rows exist).

## 5. ⚠️ Risks & edge cases

- **Public `select('*')` leaks every listing column to anon.** `searchListings` returns all columns of published rows. **Never store private/PII data as columns on `listings`** — put it in a separate table with **no anon RLS policy**.
- **Migrations are not guaranteed auto-applied** to the running DB (history of unapplied migrations causing "nothing happens" bugs). Keep migrations idempotent; treat applying them as a manual, flagged step. Don't assume direct DB push access.
- **Category reach:** changing categories touches search, filters, admin analytics, mobile API, AI prompts, PDF reports, sitemap. Safe **only if `category_id` keeps meaning the top-level category**.
- **Destructive ops** (deleting listings, re-seeding categories) are irreversible — gate behind reviewable migrations / non-auto-run scripts.
- **External resources** (e.g. fetching image URLs server-side) → SSRF risk; restrict to http(s), cap size/count, time-limit, make failures non-fatal.

## 6. Backward-compatibility contracts (do not break)

- `categories` columns (`id, name, slug, active, sort_order`) and `getCategories()` return type.
- `listings.category_id` semantics = **top-level category**.
- Signatures of `createListing`, `updateListing`, `importListings`, `searchListings` — **extend with optional fields only**.
- `/api/mobile/*` response shapes (consumed by the Expo app).
- The existing CSV/XLSX import flow and the manual listing form must keep working unchanged (aside from the category field becoming two-level).

## 7. Useful entry points

| Concern | File |
|---|---|
| Listing CRUD / search / images | [lib/actions/listings.ts](lib/actions/listings.ts) |
| Listing types | [lib/types/listings.ts](lib/types/listings.ts) |
| CSV import (blueprint for REAXML) | [lib/actions/listings-import.ts](lib/actions/listings-import.ts), [lib/listings-import.ts](lib/listings-import.ts), [components/dashboard/import-listings-dialog.tsx](components/dashboard/import-listings-dialog.tsx) |
| Listing integrations framework (adapters, shared upsert/taxonomy) | [lib/integrations/](lib/integrations/) (`types.ts`, `taxonomy.ts`, `upsert.ts`, `registry.ts`) — used by both REAXML import and the Agentbox connector |
| Agentbox (Reapit Sales) connector | [lib/integrations/agentbox/](lib/integrations/agentbox/) (client/map/fixtures), [lib/actions/agentbox.ts](lib/actions/agentbox.ts), [app/dashboard/integrations/page.tsx](app/dashboard/integrations/page.tsx), migration `20260625000001_agency_integrations.sql`. Credentials AES-256-GCM via [lib/crypto/secrets.ts](lib/crypto/secrets.ts). |
| Categories (admin) | [lib/actions/admin-categories.ts](lib/actions/admin-categories.ts), [app/admin/categories/](app/admin/categories/) |
| Create / edit form | [app/dashboard/listings/new/page.tsx](app/dashboard/listings/new/page.tsx), [app/dashboard/listings/[id]/edit/edit-listing-form.tsx](app/dashboard/listings/[id]/edit/edit-listing-form.tsx) |
| Public detail | [app/listing/[slug]/page.tsx](app/listing/[slug]/page.tsx) |
| Supabase service client | [lib/supabase/admin.ts](lib/supabase/admin.ts) |
| Migrations | [supabase/migrations/](supabase/migrations/) |
