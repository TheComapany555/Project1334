# SEO & Performance — Implementation Notes (internal / dev)

**Audience:** developers. This is the technical companion to the client-facing [seo-plan.md](./seo-plan.md) (which is a benefits-only pitch with no code detail). Everything below maps the pitched outcomes to concrete files, env, and constraints in this codebase (Next.js 16 App Router, Vercel, Supabase, NextAuth).

> Grounded in the codebase as of July 2026 — verify file references before relying on them (see `CLAUDE.md`).

---

## Environment / configuration

| Setting | Purpose |
|---|---|
| `NEXT_PUBLIC_SITE_URL=https://salebiz.com.au` | **New.** Dedicated canonical base URL. Today `SITE_URL` is re-derived as `process.env.NEXTAUTH_URL ?? "https://salebiz.com.au"` in `app/layout.tsx`, `app/sitemap.ts`, `app/robots.ts`, and each dynamic page — decouple the SEO base URL from `NEXTAUTH_URL` and set it in the Vercel production env. |
| `SITE_GATE_ENABLED=false` | Flip at launch. When `true`, `middleware.ts` + `lib/site-gate.ts` rewrite every non-API page to the `noindex` `/site-locked` page — the whole site is uncrawlable. |
| `NEXT_PUBLIC_GA_ID` | **New** — GA4 measurement ID. |
| `NEXT_PUBLIC_CLARITY_ID` | **New** — Microsoft Clarity project ID. |
| GSC verification | Via DNS TXT (preferred) or `metadata.verification.google` in `app/layout.tsx`. |

## Key files

| Concern | File(s) & notes |
|---|---|
| Root metadata, `metadataBase`, analytics, consent | `app/layout.tsx` — add GA4/Clarity via `next/script` inside a consent wrapper. No `next/script` usage exists today. Add site-wide `Organization` + `WebSite` (`SearchAction`) JSON-LD here or on the homepage. |
| Sitemap | `app/sitemap.ts` — add `/agency/{slug}` (currently omitted), new taxonomy/location landing routes, and static marketing pages; split into a sitemap index if large. Categories are currently emitted as `/search?category=…` query params, which won't rank as distinct pages. `revalidate = 3600`. |
| Robots | `app/robots.ts` — currently disallows `/dashboard/`, `/admin/`, `/api/`, `/auth/`, `/checkout/`. Add `/account/`, `/saved`, `/compare`, `/invite/`. |
| Site gate | `middleware.ts`, `lib/site-gate.ts`, `app/site-locked/page.tsx`. |
| Listing SEO | `app/listing/[slug]/page.tsx` — already has `generateMetadata` + `Product`/`Offer`/`BreadcrumbList` JSON-LD; add dynamic OG image via `opengraph-image.tsx`. `revalidate = 600`. |
| Broker / agency SEO | `app/broker/[slug]/page.tsx`, `app/agency/[slug]/page.tsx` — have `generateMetadata` + `RealEstateAgent` JSON-LD; add `BreadcrumbList` JSON-LD (currently visual-only). Agency is missing from the sitemap. |
| New landing routes | New segments under `app/` (e.g. `app/businesses-for-sale/[category]/…`, location variants). Data via `lib/actions/*`, the `categories`/`subcategories` tables, and `SUGGESTED_REGIONS` in `lib/types/listings.ts`. Guardrail: only index category×location combos with enough live listings (avoid thin pages). |
| Faceted search | `app/search/page.tsx` — has a single static canonical to `/search`. Add per-variant canonical strategy + `noindex` on thin/parameter-heavy filter combos; handle `sort`/`page`/price params and pagination signals. |
| Rendering / ISR | Public `page.tsx` files declare `revalidate` but call `getSession()` (`lib/auth-client.ts` → `getServerSession`), which reads cookies → forces per-request dynamic SSR and defeats the ISR cache. Isolate session-dependent UI so listing/landing pages can serve from cache. No `generateStaticParams` used anywhere. |
| Headers / redirects | `next.config.ts` — no `redirects()`/`rewrites()` today. Add `redirects()` for host + HTTPS canonicalisation and for sold/expired/renamed listings; consider HSTS/CSP. Static-asset caching + security headers already present. |
| 404 / not-found | Add a custom `not-found`; fix the broken `/contact` footer link in `app/search/page.tsx` (route doesn't exist). |
| Manifest / icons | New `app/manifest.ts`, `app/icon.tsx`, apple-touch icon. Root `app/opengraph-image.png` already exists as the default OG image. |

## Current state (already implemented — don't rebuild)

- Root + per-page metadata (`app/layout.tsx`; `generateMetadata` on listing/broker/agency; static on `/search`, `/privacy`, `/terms`) — titles, descriptions, canonicals, Open Graph, Twitter cards.
- JSON-LD: `Product`+`Offer`+`BreadcrumbList` (listings), `RealEstateAgent` (broker/agency).
- Dynamic `app/sitemap.ts` + `app/robots.ts`.
- `next/image` with AVIF/WebP, `sharp`, 30-day min cache TTL, self-hosted `next/font` (Inter + Geist Mono).
- Vercel Speed Insights (`@vercel/speed-insights`) mounted in `app/layout.tsx`.
- Security + long-cache static-asset headers in `next.config.ts`.
- Slug-based listing URLs via `generateListingSlug()` in `lib/slug.ts`.

## Analytics — what's absent today

No GA4, no GTM, no Microsoft Clarity, no Google Search Console verification, no `@vercel/analytics`. Only Vercel **Speed Insights** (RUM Core Web Vitals) is present. There is internal first-party event tracking (`app/api/track/*`, `ListingViewTracker`) into Supabase — that's product analytics, not marketing/SEO analytics.

## Constraints & gotchas (from CLAUDE.md)

- **Category changes ripple widely** — categories feed search, filters, admin analytics, the mobile API, AI prompts, PDF reports, *and* the sitemap. New landing pages must keep `category_id` meaning the top-level category and not break these consumers.
- **Do not change `/api/mobile/*` response shapes** — the Expo app depends on them.
- **Migrations are raw, idempotent SQL** and must enable RLS; any new anon-readable taxonomy/landing tables need an explicit anon `SELECT` policy. Migrations are not guaranteed auto-applied.
- **Public `searchListings` does `select('*')`** — never add PII columns to `listings`; keep vendor/PII in the existing separate tables.
- **Verify the prod base URL** — canonicals, OG, and the sitemap all depend on `NEXTAUTH_URL` / the new `NEXT_PUBLIC_SITE_URL` being correct in the Vercel production environment before launch.
- **hreflang:** not applicable — single AU-English locale.
