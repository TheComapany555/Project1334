# Salebiz

**Marketplace platform for buying and selling businesses (Australia).**

Brokers list businesses for sale; buyers search and enquire. Admins manage brokers, categories, and listings. Built with Next.js, TypeScript, Supabase, NextAuth.js, and shadcn/ui.

---

## Tech stack

| Layer        | Stack |
|-------------|--------|
| Framework   | Next.js 16 (App Router) |
| Language    | TypeScript |
| Auth        | NextAuth.js (credentials + JWT) |
| Database    | Supabase (PostgreSQL) |
| Storage     | Supabase Storage (avatars, logos, listing images) |
| Email       | Resend (verification, password reset, notifications) |
| UI          | React 19, Tailwind CSS 4, shadcn/ui, Framer Motion |
| Forms       | React Hook Form, Zod |

---

## Features

- **Public**
  - Homepage with featured listings and search
  - Search and filter listings by category, location, price
  - Listing detail pages with enquiry form
  - Public broker profiles at `/broker/[slug]` (photo, logo, bio, contact)

- **Brokers**
  - Registration and login (email/password)
  - Email verification and password reset
  - Broker dashboard: listings, enquiries, profile, agency, team
  - Create/edit listings (details, images, highlights)
  - Profile editing (photo, logo, slug, social links)
  - Team/agency management and invitations

- **Admins**
  - Admin panel: brokers, listings, enquiries, categories
  - Approve/reject brokers, manage listing visibility

- **Access control**
  - Role-based: `broker` → `/dashboard`, `admin` → `/admin`
  - Unverified brokers cannot access dashboard (email verification required)

---

## Prerequisites

- Node.js 18+
- npm, yarn, pnpm, or bun
- Supabase project
- Resend account (for transactional email)

---

## Getting started

### 1. Clone and install

```bash
git clone <repo-url>
cd Project1334
npm install
```

### 2. Environment variables

Create `.env.local` in the project root (or copy from `.env.example` and extend). Required:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# NextAuth
NEXTAUTH_SECRET=your-secret   # e.g. openssl rand -base64 32
NEXTAUTH_URL=http://localhost:3000

# Resend (verification, password reset, notifications)
RESEND_API_KEY=re_xxxx
EMAIL_FROM=noreply@yourdomain.com

# Optional: first admin notified on new broker signup
ADMIN_EMAIL=admin@yourdomain.com

# Optional: Google Maps (listing location map)
NEXT_PUBLIC_GOOGLE_MAPS_KEY=your-google-maps-key
```

### 3. Database migrations

Run Supabase migrations **in order** (by filename):

```text
supabase/migrations/
  20250224000001_profiles.sql
  20250224000002_auth_tokens.sql
  20250224000003_profiles_slug_index.sql
  20250224000004_categories.sql
  20250224000005_listing_highlights.sql
  20250224000006_listings.sql
  20250224000007_listing_images_bucket.sql
  20250225000001_listings_published_at_index.sql
  20250226000001_enquiries.sql
  20250226000002_profiles_broker_status.sql
  20250226000003_listings_admin_removed.sql
  20250226100000_profiles_status_pending.sql
  20250305000001_agencies.sql
  20250305000002_invitations.sql
```

Use the Supabase CLI or run the SQL in the Dashboard SQL editor.

### 4. Storage buckets

In Supabase Dashboard → Storage, create these **public** buckets:

| Bucket     | Purpose          | Notes |
|------------|------------------|--------|
| `avatars`  | Broker photos    | e.g. 5MB limit; image/jpeg, image/png, image/webp, image/gif |
| `logos`    | Company logos    | e.g. allow image/svg+xml |
| `listing-images` | Listing photos | per migration `20250224000007_listing_images_bucket.sql` |

### 5. First admin user

**Option A – Seed script (local/testing):**

```bash
npm run seed:admin
```

Uses `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` from `.env.local`, or defaults to `admin@salebiz.com.au` / `admin123`. **Do not use default credentials in production.**

**Option B – Manual (after registering a user):**

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

| Command           | Description |
|-------------------|-------------|
| `npm run dev`     | Start dev server |
| `npm run build`   | Production build |
| `npm run start`   | Start production server |
| `npm run lint`    | Run ESLint |
| `npm run seed:admin` | Seed one admin user (see above) |

---

## Project structure (high level)

```text
app/
  page.tsx              # Homepage
  search/               # Search and results
  listing/[slug]/      # Listing detail + enquiry
  broker/[slug]/       # Public broker profile
  auth/                 # Login, register, verify, reset
  dashboard/            # Broker: listings, enquiries, profile, agency, team
  admin/                # Admin: brokers, listings, enquiries, categories
components/             # UI and feature components
lib/
  actions/              # Server actions (auth, listings, enquiries, admin, agencies)
  types/                # Shared types
  supabase/             # Supabase client (browser, server, admin)
  auth.ts, auth-client.ts
supabase/migrations/    # SQL migrations
```

---

## Brand and docs

- **Brand:** Salebiz.com.au — see `docs/brand.md` for colours, logo usage, and Tailwind tokens.

---

## Deployment

- Set all environment variables in your hosting provider.
- Use the same Supabase project (or a dedicated production project) and run migrations.
- Ensure `NEXTAUTH_URL` is your production URL.
- For Next.js, [Vercel](https://vercel.com) is a straightforward option; see [Next.js deployment docs](https://nextjs.org/docs/app/building-your-application/deploying).

---

## License

Private. All rights reserved.
