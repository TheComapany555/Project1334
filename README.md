# Salebiz

Marketplace platform for buying and selling businesses (Australia). Built with Next.js, TypeScript, Supabase, NextAuth.js, and shadcn/ui.

## Milestone 1 — Foundation & Authentication

- Broker registration and login (email/password)
- Email verification and password reset (Resend)
- Role-based access: broker dashboard (`/dashboard`), admin panel (`/admin`)
- Unverified brokers cannot access dashboard

### Setup

1. **Environment**  
   Copy `.env.example` to `.env.local` and set:
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXTAUTH_SECRET` (e.g. `openssl rand -base64 32`)
   - `NEXTAUTH_URL` (e.g. `http://localhost:3000`)
   - `RESEND_API_KEY`, `EMAIL_FROM` (for verification and reset emails)

2. **Database**  
   Run Supabase migrations in order:
   - `supabase/migrations/20250224000001_profiles.sql` (users + profiles)
   - `supabase/migrations/20250224000002_auth_tokens.sql` (verification/reset tokens)

3. **First admin**  
   After registering a user, set their profile role in Supabase:
   ```sql
   UPDATE profiles SET role = 'admin' WHERE id = (SELECT id FROM users WHERE email = 'your@email.com');
   ```

## Milestone 2 — Broker Profiles

- Public broker profile at `/broker/[slug]` with photo, logo, contact info, bio, social links
- Dashboard profile editing at `/dashboard/profile` (photo/logo upload, slug, social links)
- Contact broker: Call (tel:) and Email (mailto:) buttons

### Setup (Milestone 2)

1. **Storage buckets**  
   In Supabase Dashboard → Storage, create two **public** buckets:
   - `avatars` — for profile photos (optional: set file size limit 5MB, allowed MIME types: image/jpeg, image/png, image/webp, image/gif)
   - `logos` — for company logos (optional: allow image/svg+xml as well)

2. **Database**  
   Run migration: `supabase/migrations/20250224000003_profiles_slug_index.sql` (index for broker lookup by slug).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
