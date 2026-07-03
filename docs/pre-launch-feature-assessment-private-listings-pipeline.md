# Pre-Launch Feature Assessment: Private Listings & Pipeline

**Date:** 2 July 2026  
**Project:** Salebiz (Project1334)  
**Purpose:** Effort estimate for two broker features requested before launch

---

## Executive Summary

| Feature | Effort | Pre-launch recommendation |
|---------|--------|---------------------------|
| Private Listings | 3–5 days (MVP) | **Include** — low risk, high value |
| Pipeline (full) | 12–20 days | **Post-launch** — would delay go-live 2–4 weeks |
| Pipeline (MVP) | 5–8 days | Optional if launch can slip ~1 week |

**Recommendation:** Launch on schedule → Private Listings (pre or week 1 post-launch) → Pipeline in v1.1.

---

## 1. Private Listings

### Client requirements

- Create listings as normal
- Choose Private vs Live on Salebiz
- Manage enquiries, documents, and deals in CRM regardless of publication

### Current state

- `listings.status`: `draft` | `published` | `under_offer` | `sold` | `unpublished`
- Draft listings are already off the marketplace (no search/homepage exposure)
- Brokers can manage documents, data room, NDA, and CRM on any listing they own (scoped by `listing_id`, not publication status)
- **Basic tier** is a partial version of “private live” — published but link-only; still appears on broker profile
- No explicit `private` visibility flag or dedicated UX

### Gap

- No clear **“Private vs Live on Salebiz”** choice in the UI
- `draft` is conflated with “not ready yet” vs “intentionally off-market”
- No badge/filter for private listings in the broker dashboard
- Public surfaces (broker profile, direct `/listing/[slug]` URL) may still expose listings the broker considers private
- Tier/payment flow is built around publishing — needs a clear path for fully private listings

### Proposed solution

Add a `marketplace_visibility` field (`private` | `live`) rather than overloading `draft`:

| Area | Work |
|------|------|
| Database | Migration + TypeScript types |
| Server | Update create/update + all public queries (search, homepage, broker profile, listing page) |
| UI | Toggle on create/edit, table badge, filter |
| CRM / docs | Mostly reuse existing flows — verify no published-only guards |
| Enquiries | Private listings won’t receive public enquiries; brokers add contacts manually or share via CRM (expected) |

**Private listings:** hidden from search, homepage, and broker profile; full broker-side management in dashboard.  
**Live listings:** existing publish + tier flow unchanged.

### Effort

| Task | Days |
|------|------|
| Schema + types | 0.5 |
| Server actions + public query filters | 1–1.5 |
| Create/edit UI + table badge/filter | 1–1.5 |
| Listing page access gating | 0.5 |
| Testing + edge cases | 0.5–1 |
| **Total MVP** | **3–5** |
| Polished (+ imports, mobile API, share-link gating, admin views) | **5–7** |

### Key files

- `supabase/migrations/` (new migration)
- `lib/types/listings.ts`
- `lib/actions/listings.ts`
- `app/dashboard/listings/new/page.tsx`
- `app/dashboard/listings/[id]/edit/edit-listing-form.tsx`
- `app/dashboard/listings/listings-table.tsx`
- `app/listing/[slug]/page.tsx`
- `app/broker/[slug]/page.tsx`

### Verdict

Achievable before launch with limited delay (~half a week). High value — brokers can manage all sales in Salebiz, not just advertised ones.

---

## 2. Pipeline (Pipedrive-style)

### Client requirements

- Create custom columns/stages
- Drag and drop deals between stages
- Add business information, notes, contacts, and follow-ups
- Upload documents and build the data room while the deal is still private
- Convert the pipeline deal into a listing with one click, carrying across all information and documents

### Current state

**What exists (different use case):**

- **Buyer CRM pipeline** — fixed stages on contacts (`new_lead` → `contacted` → … → `sold` / `lost`), with per-listing stages via `broker_contact_listing_status`
- CRM table, buyer profile panel, notes, calls, follow-ups, email logging
- Data room and documents — tied to `listing_id` (requires an existing listing)
- `@dnd-kit` installed in `package.json` (only used in a demo data table)
- Broker permissions and agency scoping patterns

**What does not exist:**

- Pre-listing **deal** entities (opportunities before they become listings)
- Kanban board UI
- Custom pipeline stages per agency/broker
- Deal-scoped documents / data room
- Convert-to-listing flow

### Gap (net-new module)

| Component | Complexity |
|-----------|------------|
| New data model (`pipelines`, `pipeline_stages`, `pipeline_deals`, deal contacts/docs) | High |
| Kanban board UI with horizontal drag-and-drop | Medium–high |
| Custom columns/stages (create, rename, reorder, delete) | Medium |
| Deal detail view (business info, notes, contacts, follow-ups) | Medium |
| Deal-level documents / data room (before listing exists) | Medium–high |
| Convert to listing (one-click, carry fields + documents + contacts) | High |
| Sidebar nav, filters, agency scoping, testing | Medium |

### Effort

| Scope | Days |
|-------|------|
| Full spec (custom stages, DnD, docs, convert with full carry-over) | 12–20 |
| MVP (fixed default stages, basic kanban, notes/contacts, simple convert — no deal data room) | 5–8 |
| MVP+ (custom stages OR deal docs, not both) | 8–12 |

### MVP vs full comparison

| Capability | Full | MVP |
|------------|------|-----|
| Custom stages | Yes | Fixed defaults (e.g. Lead In, Contact Made, Needs Defined, Proposal Made) |
| Drag-and-drop | Yes | Yes |
| Notes, contacts, follow-ups | Yes | Yes |
| Deal data room | Yes | No (documents added after convert) |
| Convert + doc carry-over | Full | Basic fields only |

### Key new surfaces

- `app/dashboard/pipeline/` — kanban board page
- `lib/actions/pipeline.ts`
- `lib/types/pipeline.ts`
- New tables: `pipelines`, `pipeline_stages`, `pipeline_deals`, deal-document links, etc.
- Sidebar entry in `components/dashboard/app-sidebar.tsx`

### Verdict

Full Pipeline as specified would meaningfully delay launch (2–4 weeks). Recommend post-launch v1.1 unless the client accepts a stripped MVP and a ~1 week launch slip.

---

## 3. Launch impact

| Scenario | Launch delay |
|----------|--------------|
| Launch as planned | None |
| + Private Listings | ~3–5 days |
| + Pipeline MVP | ~1–1.5 weeks |
| + Pipeline full | ~2–4 weeks |

---

## 4. Recommended roadmap

1. **Launch** — marketplace, CRM, listings, payments (current priority)
2. **v1.0.1** — Private Listings (3–5 days)
3. **v1.1** — Pipeline MVP (5–8 days)
4. **v1.2** — Pipeline full (custom stages, deal data room, full convert)

---

## 5. Client message

> Hi [Client name],
>
> Thanks for flagging Private Listings and Pipeline — both make sense for brokers managing off-market sales.
>
> After reviewing the codebase:
>
> **Private Listings** — We can include this before launch. A lot of the foundation is already there (draft listings, CRM, documents). We’d add a clear “Private vs Live on Salebiz” option so brokers can manage off-market deals in their dashboard without marketplace exposure. Estimate: **~3–5 days**.
>
> **Pipeline** — This is a bigger build. We have buyer CRM stages for existing listings, but not a pre-listing deal board like Pipedrive (custom columns, drag-and-drop, deal data room, convert to listing). Full version: **~2–4 weeks**. A simpler MVP with fixed stages and basic convert could be **~1–1.5 weeks**, but would not include everything you described.
>
> **Recommendation:** Prioritise launch, add Private Listings in the final sprint (or immediately after), and ship Pipeline as the first major update. That gets brokers using Salebiz for all their sales quickly without holding up go-live.
>
> Happy to discuss if you’d prefer a Pipeline MVP before launch instead.
>
> [Your name]

---

## 6. Reference: existing vs requested pipeline

| | Buyer CRM pipeline (exists) | Pipeline feature (requested) |
|--|----------------------------|------------------------------|
| **Purpose** | Track buyers on existing listings | Manage potential listings before they exist |
| **Entity** | `broker_contacts` + per-listing status | New `pipeline_deals` entity |
| **Stages** | Fixed enum in code | Custom columns per broker/agency |
| **UI** | Table + dropdown | Kanban board with drag-and-drop |
| **Documents** | Listing data room | Deal data room (pre-listing) |
| **Convert** | N/A | Deal → listing with carry-over |
