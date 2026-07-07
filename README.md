# Salebiz

**Marketplace + broker CRM for buying and selling businesses (Australia).**

Brokers and agencies list businesses for sale and manage the whole deal lifecycle — enquiries, contacts, follow-ups, NDAs, data rooms, buyer identity verification, and subscriptions. Buyers search, save, compare, enquire, and access gated documents. Admins manage brokers, agencies, categories, products/pricing, advertising, and support.

Built with Next.js 16 (App Router), TypeScript, Supabase (Postgres), NextAuth, Stripe, OpenAI, and shadcn-style UI. A separate Expo mobile app consumes the `/api/mobile/*` API.

---

## Tech stack

| Layer         | Stack |
|---------------|--------|
| Framework     | Next.js 16 (App Router), React 19 |
| Language      | TypeScript |
| Auth          | NextAuth v4 — **custom credentials provider** (bcrypt + JWT via `jose`), not Supabase Auth |
| Database      | Supabase (PostgreSQL); server code uses the service-role client and enforces authorization in code |
| Storage       | Supabase Storage — `avatars`, `logos`, `listing-images` (public); `listing-documents` (private/signed URLs) |
| Payments      | Stripe (subscriptions, one-off products, webhooks) |
| Email         | Resend (transactional); optional Gmail OAuth "connected inbox" + inbound BCC pipeline |
| AI            | OpenAI (listing generation/rewrite, buyer insights) |
| Identity      | Sumsub — "Know Your Buyer" ID/KYC verification (optional) |
| Integrations  | REAXML import, Agentbox / Reapit Sales listing connector |
| PDF           | `@react-pdf/renderer` (listing reports) |
| Rich text     | Lexical editor |
| UI            | Tailwind CSS 4, shadcn-style primitives on `@base-ui/react` / Radix, Framer Motion, TanStack Table, Recharts |
| Forms / state | React Hook Form + Zod, Zustand, TanStack Query |

---

## Features

### Public
- Homepage with featured listings and search
- Search and filter by category, subcategory, location (state/region/suburb), and price/revenue/profit
- Listing detail pages with image gallery, highlights, financials, map, and enquiry form
- Public broker profiles (`/broker/[slug]`) and agency profiles (`/agency/[slug]`)
- SEO plumbing: dynamic `sitemap.xml` / `robots.txt`, per-page metadata, and JSON-LD structured data (see `docs/seo-plan.md` for the full roadmap)

### Buyers (`/account`)
- Register, save favourites (`/saved`), and compare listings (`/compare`)
- Buyer vault for NDA-gated data-room documents (`/account/vault`)
- Buyer alerts (saved-search email notifications)
- Messages / enquiry threads

### Brokers & agencies (`/dashboard`)
- Broker dashboard with listings, enquiries, analytics, and activity
- **Listings:** create/edit (multi-step form, images, highlights, rich-text description), feature/tier controls, private (off-market) listings, data rooms, NDAs, enquiry forms, insights, and PDF reports
- **CRM:** contacts, per-listing buyer status, hot-lead scoring, follow-ups, communication-history timeline, and notes
- **Know Your Buyer (KYB):** email buyers a Sumsub verification link; results returned via webhook
- **Connected inbox (optional):** send through the broker's own Gmail so replies thread to their inbox and auto-log to the CRM; optional inbound BCC pipeline
- **Team & agency:** invitations, roles (owner/member), agency-wide listing visibility, custom fields
- **Subscriptions & payments:** Stripe-backed plans, checkout, and payment history
- **Integrations:** import listings from Agentbox / Reapit Sales and via REAXML
- **Support:** submit and track support tickets

### Admins (`/admin`)
- Manage brokers, agencies, listings, categories, and enquiries
- Products & pricing, subscriptions, payments, discount codes, and advertising
- Platform analytics and support-ticket queue
- Approve/reject brokers; control listing visibility (`admin_removed_at`)

### Access control
- Role-based: `broker` → `/dashboard`, `admin` → `/admin`, `user` (buyer) → `/account`
- Unverified brokers cannot access the dashboard (email verification required)
- Agency **owners** see/manage all agency listings; **members/solo** brokers see their own
- **Pre-launch site gate:** when `SITE_GATE_ENABLED=true`, every visitor must enter a shared password before the site renders (see below)

---

## Prerequisites

- Node.js 18+
- npm (or yarn/pnpm/bun)
- **Required services:** Supabase project, Resend account, Stripe account, OpenAI API key
- **Optional services:** Sumsub (KYB), Agentbox/Reapit (listing sync), Geoapify (AU address autocomplete), Google Cloud OAuth (Gmail connected inbox), reCAPTCHA

---

## Getting started

### 1. Clone and install

```bash
git clone <repo-url>
cd Project1334
npm install
```

### 2. Environment variables

Copy `.env.example` to `.env.local` and fill in the values. `.env.example` is the **authoritative, annotated list** — it documents each variable and the setup steps for every optional integration (Stripe, OpenAI, Sumsub, Agentbox, Gmail, reCAPTCHA, Geoapify).

Minimum to boot the app locally:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# NextAuth  (NEXTAUTH_URL also drives canonical/sitemap/OG URLs — set it to the prod domain in production)
NEXTAUTH_SECRET=your-secret           # openssl rand -base64 32
NEXTAUTH_URL=http://localhost:3000

# Email (Resend)
RESEND_API_KEY=re_xxxx
EMAIL_FROM=noreply@salebiz.com.au

# Payments (Stripe)
STRIPE_SECRET_KEY=sk_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_xxx

# AI (OpenAI)
OPENAI_API_KEY=sk-xxx

# Cron auth (protects scheduled job endpoints/scripts)
CRON_SECRET=your-cron-secret

# Pre-launch gate — keep false for public launch
SITE_GATE_ENABLED=false
```

Optional integrations (Sumsub, Agentbox, Gmail OAuth + `EMAIL_TOKEN_ENCRYPTION_KEY`, inbound email, `INTEGRATION_ENCRYPTION_KEY`, Geoapify, reCAPTCHA) are documented inline in `.env.example`.

### 3. Database migrations

Run every SQL file in `supabase/migrations/` **in filename order** (timestamped `YYYYMMDDHHMMSS_name.sql`) via the Supabase CLI or the Dashboard SQL editor.

> **Notes:** migrations are raw, idempotent SQL and are **not guaranteed to auto-apply** to a running database — applying them is a deliberate, manual step. New tables that anonymous users should read need an explicit `anon` `SELECT` policy. `scripts/baseline-migrations-then-push.sh` helps baseline an existing database before pushing.

### 4. Storage buckets

In Supabase Dashboard → Storage:

| Bucket              | Visibility | Purpose |
|---------------------|------------|---------|
| `avatars`           | public     | Broker photos |
| `logos`             | public     | Company logos |
| `listing-images`    | public     | Listing photos (per `..._listing_images_bucket.sql`) |
| `listing-documents` | **private**| Data-room documents (served via signed URLs) |

### 5. First admin user

**Option A — seed script (local/testing):**

```bash
npm run seed:admin
```

Uses `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` from your env, or defaults to `admin@salebiz.com.au` / `admin123`. **Do not use default credentials in production.**

**Option B — manual (after registering a user):**

```sql
UPDATE profiles SET role = 'admin' WHERE id = (SELECT id FROM users WHERE email = 'your@email.com');
```

### 6. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Scripts

| Command                     | Description |
|-----------------------------|-------------|
| `npm run dev`               | Start dev server |
| `npm run build`             | Production build |
| `npm run start`             | Start production server |
| `npm run lint`              | Run ESLint |
| `npm run test`              | Run tests (Vitest) |
| `npm run seed:admin`        | Seed one admin user |
| `npm run seed:site-gate`    | Set/rotate the pre-launch site-gate password |
| `npm run delete:fake-listings` | Remove seeded/fake listings |
| `npm run cron:buyer-alerts` | Send buyer saved-search alerts |
| `npm run cron:follow-ups-due` | Notify brokers of due follow-ups |
| `npm run cron:data-room-expiry` | Expire time-limited data-room access |
| `npm run cron:listing-ranking` | Recompute listing engagement/ranking scores |
| `npm run smoke:sumsub`      | Smoke-test the Sumsub integration |
| `npm run test:sumsub-webhook` | Test the Sumsub webhook handler |

Cron scripts run in production via GitHub Actions (`.github/workflows/*-cron.yml`).

---

## Integrations

- **REAXML import** — import real-estate/business listings from REAXML feeds; maps to the two-level category taxonomy.
- **Agentbox / Reapit Sales connector** — per-agency listing sync (manual "Sync now" on `/dashboard/integrations`); credentials stored AES-256-GCM encrypted (`INTEGRATION_ENCRYPTION_KEY`). Production requires a static-IP egress proxy for Reapit IP whitelisting.
- **Sumsub (Know Your Buyer)** — emailed ID/KYC verification links; results via `/api/sumsub/webhook`.
- **Gmail connected inbox** — optional Google OAuth so brokers send through their own Gmail; optional inbound BCC pipeline auto-logs external emails to the CRM.

See `.env.example` and `docs/` for per-integration setup.

---

## Pre-launch site gate

When `SITE_GATE_ENABLED=true`, `middleware.ts` rewrites every non-API page to a password-locked page until the visitor enters the shared access password (bcrypt-hashed in the `site_access_gate` table; set/rotate with `npm run seed:site-gate`). **This blocks all search-engine crawling** — set it to `false` (or remove it) at public launch.

---

## Project structure (high level)

```text
app/
  page.tsx                 # Homepage
  search/                  # Search + filters
  listing/[slug]/          # Listing detail + enquiry + data room
  broker/[slug]/ agency/[slug]/   # Public profiles
  compare/ saved/          # Buyer compare & favourites
  account/                 # Buyer workspace (vault, messages)
  auth/                    # Login, register, verify, reset, set-password
  dashboard/               # Broker/agency workspace (listings, CRM, integrations, support…)
  admin/                   # Admin workspace (products, pricing, analytics, support…)
  checkout/  invite/[token]/  site-locked/  403/
  api/                     # mobile, stripe, ai, places, sumsub, inbound email, auth
  sitemap.ts  robots.ts  opengraph-image.png
components/                # UI primitives (components/ui) + feature components
lib/
  actions/                 # Server actions ("use server") — the backend
  integrations/            # Adapter framework + Agentbox connector
  ai/ jobs/ pdf/ crypto/ supabase/   # Helpers
  types/  slug.ts  listings-import.ts  site-gate.ts
supabase/migrations/       # Raw SQL migrations (timestamped)
scripts/                   # Seed + cron scripts (run via npx tsx)
docs/                      # Architecture, feature, and SEO docs
middleware.ts              # Site gate + role-based route protection
```

See `CLAUDE.md` for architecture conventions, authorization rules, and backward-compatibility contracts.

---

## Docs & brand

- **Brand:** salebiz.com.au — see `docs/brand.md` for colours, logo usage, and Tailwind tokens.
- **SEO:** `docs/seo-plan.md` — current-state audit and the full SEO roadmap.
- **Architecture:** `CLAUDE.md` and the `docs/` folder (application analysis, upgrade plans, feature proposals, testing guides).

---

## Deployment

- Deploys to **Vercel** via Git integration; scheduled jobs run as **GitHub Actions** crons.
- Set all environment variables in the hosting provider; use a dedicated production Supabase project and run migrations.
- **Set `NEXTAUTH_URL` to your production URL** — canonical, sitemap, and Open Graph URLs derive from it.
- **Set `SITE_GATE_ENABLED=false`** at public launch so the site is crawlable.
- Configure the Stripe webhook endpoint and (if used) the Sumsub webhook and Google OAuth redirect URI against the production domain.

---

## License

Private. All rights reserved.
