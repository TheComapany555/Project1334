# Salebiz — Complete Application Analysis

**Platform:** Marketplace for buying and selling businesses in Australia
**URL:** salebiz.com.au
**Stack:** Next.js 16 (App Router), TypeScript, Supabase (PostgreSQL), NextAuth.js, Stripe, Resend

---

## 1. Roles & Permissions

### Role Definitions

| Role | Description | How Created |
|------|-------------|-------------|
| **Public (Unauthenticated)** | Anyone browsing the site | N/A |
| **Broker (member)** | A broker who belongs to an agency, invited by agency owner | Accepts invitation via `/auth/join` |
| **Broker (agency owner)** | The broker who registered and owns the agency | Self-registers via `/auth/register` |
| **Admin** | Platform administrator | Manually set via DB (`role = 'admin'`) or seed script |

### Permissions Matrix

| Action | Public | Broker (Member) | Broker (Owner) | Admin |
|--------|--------|-----------------|-----------------|-------|
| **Browse/search listings** | ✅ | ✅ | ✅ | ✅ |
| **View listing detail** | ✅ | ✅ | ✅ | ✅ |
| **View broker profile** | ✅ | ✅ | ✅ | ✅ |
| **View agency profile** | ✅ | ✅ | ✅ | ✅ |
| **Submit enquiry** | ✅ | ✅ | ✅ | ✅ |
| **Register new account** | ✅ | — | — | — |
| **Accept invitation** | ✅ | — | — | — |
| **Create listing** | ❌ | ✅ | ✅ | ❌ |
| **Edit own listings** | ❌ | ✅ | ✅ | ❌ |
| **View own enquiries** | ❌ | ✅ (own listings) | ✅ (all agency listings) | ❌ |
| **Publish/unpublish own listing** | ❌ | ✅ | ✅ | ❌ |
| **Delete own listing** | ❌ | ✅ | ✅ | ❌ |
| **Upload listing images** | ❌ | ✅ | ✅ | ❌ |
| **Edit own profile** | ❌ | ✅ | ✅ | ❌ |
| **Upload avatar/logo** | ❌ | ✅ | ✅ | ❌ |
| **View payment history** | ❌ | ✅ (own) | ✅ (agency-wide) | ❌ |
| **Invite brokers to agency** | ❌ | ❌ | ✅ | ❌ |
| **Remove brokers from agency** | ❌ | ❌ | ✅ | ❌ |
| **Edit agency settings** | ❌ | ❌ | ✅ | ❌ |
| **Manage subscription** | ❌ | ❌ | ✅ | ❌ |
| **Edit member broker profiles** | ❌ | ❌ | ✅ | ❌ |
| **Approve/disable agencies** | ❌ | ❌ | ❌ | ✅ |
| **Moderate listings (remove/restore)** | ❌ | ❌ | ❌ | ✅ |
| **Manage categories** | ❌ | ❌ | ❌ | ✅ |
| **Manage products & pricing** | ❌ | ❌ | ❌ | ✅ |
| **Override agency pricing** | ❌ | ❌ | ❌ | ✅ |
| **View all enquiries** | ❌ | ❌ | ❌ | ✅ |
| **Manage subscriptions** | ❌ | ❌ | ❌ | ✅ |
| **View all payments/revenue** | ❌ | ❌ | ❌ | ✅ |
| **Manage advertisements** | ❌ | ❌ | ❌ | ✅ |
| **Feature/unfeature listings** | ❌ | ❌ | ❌ | ✅ |

### Key Role Restrictions

- **Admin CANNOT:** Create listings, edit listings, manage an agency, act as a broker
- **Broker (member) CANNOT:** Invite team members, manage agency settings, manage subscription, remove other brokers
- **Broker (owner) CANNOT:** Moderate other agencies' listings, manage platform categories/products, approve agencies
- **Public CANNOT:** Access any dashboard, create listings, view enquiries

---

## 2. Feature Breakdown

### 2.1 Authentication & Registration

| Feature | Access | Description |
|---------|--------|-------------|
| **Agency Registration** | Public | New broker registers with email/password + reCAPTCHA. Creates: User → Agency (status: pending) → Profile (as owner) → sends verification email. Admin notified. |
| **Email Verification** | Public | 24-hour token sent via email. Must verify before accessing dashboard. |
| **Login** | Public | Email/password with reCAPTCHA. Checks: email verified, agency active, subscription status. |
| **Password Reset** | Public | 1-hour token. Request → email → new password form. |
| **Join via Invitation** | Public | Accept 7-day invitation token. Creates user + profile linked to existing agency. |
| **Mobile JWT Auth** | Public | Separate JWT endpoint (`/api/mobile/auth`) issues 30-day HS256 tokens for mobile apps. |

### 2.2 Public Marketplace

| Feature | Access | Description |
|---------|--------|-------------|
| **Homepage** | Public | Featured listings showcase, stats, marketing content, ad slots. |
| **Search & Filter** | Public | Keyword search (title/summary/description), filters: category, highlights, state, suburb, price range, revenue range, profit range. Sort: newest, price asc/desc. Pagination (12/page). Ad slots. |
| **Listing Detail** | Public | Images gallery, business details (price, location, revenue, profit), description (rich text), lease details, highlights/tags, broker contact, related listings, enquiry form, ad slots. |
| **Broker Profile** | Public | Photo, name, agency, bio, contact info, social links, published listings grid. SEO structured data. |
| **Agency Profile** | Public | Logo, name, bio, all brokers with their listings, contact info. |
| **Enquiry Submission** | Public | Name, email, phone, reason (general/request_viewing/make_offer/request_callback/other), message (min 10 chars). Sends email to broker + creates notification. |

### 2.3 Broker Dashboard

| Feature | Access | Description |
|---------|--------|-------------|
| **Dashboard Overview** | Broker | Stats cards (total listings, published, drafts, enquiries this week), 6-month trend chart, recent 5 listings. |
| **Listings Management** | Broker | Table of all listings with status/category/price filters. Quick stats. Owner sees all agency listings; member sees own only. |
| **Create Listing** | Broker | 3-step wizard: (1) Basic info — title, category, location, price, revenue, profit, lease (2) Content — summary, rich text description, images (max 10, ≤5MB JPEG/PNG) (3) Publish — highlight tags, tier selection (Basic/Standard/Featured). Basic publishes immediately; Standard/Featured → draft until payment. |
| **Edit Listing** | Broker | Same form pre-populated. Can change status, reorder/delete images, change tier (only on unpaid drafts). |
| **Listing Status Management** | Broker | State machine: draft → published/unpublished; published → under_offer/unpublished; under_offer → published/sold; sold → terminal. Requires active subscription to publish. |
| **Enquiries** | Broker | Bar chart (6-month trend), donut chart (by reason), filterable table with contact info, reason, listing ref, date. Owner sees all agency enquiries. |
| **Payments** | Broker | Stats cards + payment logs table (transaction ID, type, amount, status, date). Owner sees agency-wide; member sees own. |
| **Subscription** | Owner only | View current plan, billing cycle, period progress. Subscribe via Stripe card payment or invoice request. Billing history. |
| **Workspace — Team** | Owner only | Invite brokers by email (7-day token), view pending invitations (resend/revoke), manage active brokers (remove). |
| **Workspace — Agency Settings** | Owner only | Agency name, logo, bio, contact info, social links, URL slug. |
| **Workspace — Profile** | Broker | Personal photo, logo, name, phone, email, website, bio, URL slug, social links. |
| **Notifications** | Broker | Bell icon with unread count (polls every 30s), notification list with mark-as-read, click-to-navigate. Types: enquiry, payment, listing, subscription, team events. |

### 2.4 Admin Panel

| Feature | Access | Description |
|---------|--------|-------------|
| **Admin Overview** | Admin | Stats: agencies (active/pending), listings (published/draft/removed), enquiries (total/7d), active categories. 6-month trend chart, recent activity, quick links. |
| **Agencies Management** | Admin | Table of all agencies with status/owner/date. Approve pending agencies, disable/enable. View details. |
| **Agency Pricing Override** | Admin | Set custom product prices per agency. Override global prices for subscriptions/tiers. |
| **Listings Moderation** | Admin | All listings table. Soft-remove listings (admin_removed_at). Restore removed listings. Filter by status, search by title/broker. Can view any listing regardless of status. |
| **Enquiries** | Admin | All platform enquiries with charts (timeline, by reason). Filter by reason, broker, date range. |
| **Products & Pricing** | Admin | CRUD for products: featured packages, listing tiers, subscription plans. Set name, description, type, price (cents AUD), duration, status. |
| **Categories** | Admin | Add/edit/delete categories. Toggle active/inactive. Set sort order. Auto-slug generation. |
| **Subscriptions** | Admin | All subscriptions with stats (active/past_due/cancelled/expired). Actions: activate pending, cancel (immediate or at period end), extend by N days, reject, reactivate expired. |
| **Payments & Revenue** | Admin | Revenue analytics: summary cards, 12-month timeline chart, status distribution pie, product revenue breakdown bar. Payment logs table. Update payment status (pending→invoiced→approved→paid). Admin notes. On approval: activates listing tier or subscription, sends notification. |
| **Advertising** | Admin | CRUD for ads. Placements: homepage, search, listing. Layouts: banner, grid. Image/HTML content. Start/end dates, sort order. Click/impression tracking. |
| **Featured Listings** | Admin | Manually feature listing for N days, remove featured, extend featured period. |
| **Notifications** | Admin | Platform activity notifications, system alerts. |

---

## 3. End-to-End User Flows

### 3.1 Broker Registration → First Listing

```
1. Public visits /auth/register
2. Fills: name, email, password, agency name + reCAPTCHA
3. System creates: User (password hashed) → Agency (status: pending) → Profile (role: broker, agency_role: owner, status: active)
4. Verification email sent (24h token). Admin notified via email.
5. Broker clicks verification link → /auth/verify?token=xxx → email_verified_at set
6. Broker logs in → /auth/login → JWT session created
7. Middleware checks: role=broker, email verified → allowed to /dashboard
8. SubscriptionGate blocks most features → redirects to /dashboard/subscribe
9. Agency owner subscribes:
   a. Selects plan → Stripe card payment or invoice request
   b. Card: Stripe checkout → webhook confirms → subscription active
   c. Invoice: pending → admin reviews → approves → subscription active
10. Admin approves agency: /admin/brokers → sets agency status=active
11. Broker creates listing: /dashboard/listings/new
    a. Step 1: Title, category, location, price, revenue, profit
    b. Step 2: Summary, description (rich text), images (up to 10)
    c. Step 3: Highlight tags, tier selection
12. If Basic tier → publishes immediately (if subscription active)
13. If Standard/Featured → saved as draft → redirected to /checkout
14. Payment completed → listing published (featured_until set if featured)
15. Listing appears in search results and/or homepage
```

### 3.2 Buyer Enquiry Flow

```
1. Buyer searches via /search with filters
2. Clicks listing → /listing/[slug]
3. Views gallery, details, description
4. Fills enquiry form: name, email, phone, reason, message (≥10 chars)
5. System: creates enquiry record, sends email to broker, creates in-app notification
6. Broker sees notification bell update (polls every 30s)
7. Broker views enquiry in /dashboard/enquiries
8. Broker contacts buyer directly via provided email/phone
```

### 3.3 Agency Team Management

```
1. Agency owner goes to /dashboard/workspace → Team tab
2. Enters email → sends invitation (7-day token)
3. Invitee receives email with link to /auth/join?token=xxx
4. Invitee creates account (name, password) → linked to agency as member
5. New broker can now log in → sees agency's dashboard
6. Member creates/manages own listings
7. Owner can: view all agency listings/enquiries, edit member profiles, remove members
```

### 3.4 Admin Moderation Flow

```
1. New agency registers → appears in /admin/brokers as "Pending"
2. Admin reviews → approves (status: active) → all agency brokers notified
3. Ongoing: Admin monitors /admin/listings
4. If inappropriate listing → admin removes (soft-delete via admin_removed_at)
5. Listing disappears from public search/detail
6. Admin can restore if resolved
```

### 3.5 Payment & Subscription Flow

```
SUBSCRIPTION (Agency-level):
1. Owner navigates to /dashboard/subscribe
2. Selects plan → sees price (may have agency-specific override)
3. Option A — Card: Stripe checkout session → payment → webhook → subscription active
4. Option B — Invoice: Request submitted → admin sees pending invoice
   → Admin approves (/admin/payments) → subscription activated → brokers notified

LISTING TIER UPGRADE:
1. Broker creates listing with Standard or Featured tier
2. Listing saved as draft → redirected to /checkout?listing=X&product=Y
3. Card payment or invoice request
4. On payment approval:
   - Listing status → published
   - tier_paid_at set
   - If featured: featured_from, featured_until, featured_package_days set
5. Featured listings appear on homepage + search with priority badge
```

---

## 4. Database Schema (Key Tables & Relationships)

```
users (1) ←──── (1) profiles
                      ├── role: broker | admin
                      ├── status: pending | active | disabled
                      ├── agency_id → agencies
                      └── agency_role: owner | member

agencies (1) ←── (N) profiles (team)
    ├── status: pending | active | disabled
    ├── (1) agency_subscriptions
    ├── (N) agency_pricing_overrides
    ├── (N) agency_invitations
    └── (N) listings

listings (1) ←── (N) listing_images
    ├── broker_id → profiles
    ├── agency_id → agencies
    ├── category_id → categories
    ├── tier_product_id → products
    ├── status: draft | published | under_offer | sold | unpublished
    ├── listing_tier: basic | standard | featured
    ├── (N) listing_highlight_map → listing_highlights
    └── (N) enquiries

enquiries → listings + profiles (broker_id)

products → (N) payments, agency_pricing_overrides, agency_subscriptions
    ├── product_type: featured | listing_tier | subscription
    └── price in cents (AUD)

payments → profiles, agencies, listings, products, agency_subscriptions
    ├── payment_type: featured | listing_tier | subscription
    └── status: pending | invoiced | approved | paid

agency_subscriptions → agencies, products
    └── status: pending | active | past_due | cancelled | expired | trialing

notifications → users
    └── 15 notification types

advertisements
    ├── placement: homepage | search | listing
    └── status: active | inactive
```

---

## 5. Key Business Rules

### Authentication & Access
1. Email must be verified before dashboard access
2. Agency must be approved (status: active) by admin before brokers can fully operate
3. Active subscription required for most dashboard features (except profile, workspace, subscribe page)
4. JWT session refreshes subscription status every 5 min (active) or 10s (waiting for payment)
5. Admin role set manually via DB — no self-registration for admins

### Listings
6. **Listing tiers control visibility:**
   - Basic: accessible only via direct URL
   - Standard: appears in search results
   - Featured: appears on homepage + search with priority + featured badge
7. Basic tier listings publish immediately; Standard/Featured require payment first (saved as draft until paid)
8. **Status state machine:** draft → published/unpublished; published → under_offer/unpublished; under_offer → published/sold; sold is terminal
9. Max 10 images per listing (≤5MB each, JPEG/PNG only)
10. Featured listings have time-limited visibility (featured_from → featured_until based on package days)
11. Admin can soft-remove any listing (admin_removed_at) — hidden from public but not deleted
12. Slug auto-generated from title, must be unique

### Agencies & Teams
13. One agency owner per agency — set at registration time
14. Owner has full control: invite/remove members, edit all profiles, manage subscription
15. Members can only manage their own listings and profile
16. Owner sees all agency listings and enquiries; members see only their own
17. Brokers cannot belong to multiple agencies simultaneously
18. Invitation tokens valid for 7 days; can be resent (refreshes token & expiry)
19. Removing a broker unlinks them from agency (sets agency_id to NULL)

### Payments & Subscriptions
20. **Two payment flows:** Card (Stripe checkout → instant) or Invoice (request → admin approval → manual activation)
21. **Payment status progression:** pending → invoiced → approved → paid (invoice) OR pending → paid (card)
22. On payment approval: listing tier activated OR subscription activated, email + notification sent
23. Only one active subscription per agency (enforced by unique partial index)
24. Subscription statuses: pending → active; can become past_due (grace period) → expired; or cancelled
25. **Agency pricing overrides:** Admin can set custom prices per product per agency

### Enquiries
26. Anyone (including unauthenticated users) can submit enquiries
27. Message minimum 10 characters
28. Enquiry triggers: DB record + email to broker + in-app notification
29. Enquiry reasons: general, request_viewing, make_offer, request_callback, other

### Advertising
30. Admin manages ads with placements (homepage/search/listing) and layouts (banner/grid)
31. Ads have start/end dates, click/impression tracking
32. Active ads filtered by status + date range at render time

---

## 6. Mobile API Summary

A full REST API exists at `/api/mobile/*` for mobile app consumption:

| Area | Endpoints | Auth |
|------|-----------|------|
| Auth | POST `/api/mobile/auth` (JWT login) | Public |
| Profile | GET/PUT `/api/mobile/profile`, POST `/api/mobile/profile/photo` | JWT |
| Listings | GET (browse, mine, detail, public), POST (create), POST (publish/unpublish), POST/DELETE (images) | Mixed |
| Enquiries | GET (all, mine), POST (create) | Mixed |
| Agency | GET (mine, by slug, brokers), POST (invite) | Mixed |
| Broker | GET (by slug, listings) | Public |
| Dashboard | GET `/api/mobile/dashboard/stats` | JWT |
| Payments | GET `/api/mobile/payments` | JWT |
| Notifications | GET, POST (mark read) | JWT |
| Reference | GET categories, highlights, states | Public |

**Total: ~30 mobile endpoints already built.**

---

## 7. Technical Architecture Notes

- **Auth:** NextAuth.js credentials provider + JWT sessions (web) + custom mobile JWT (30-day HS256)
- **Database:** All server actions use Supabase service role client (bypasses RLS). RLS policies exist for public reads only.
- **Storage:** 3 Supabase buckets — avatars, logos, listing-images (+ ad-images for ads)
- **Payments:** Stripe integration for card payments + manual invoice flow for enterprise clients
- **Email:** Resend for transactional emails (verification, reset, invitations, notifications)
- **Rich Text:** Lexical editor for listing descriptions and ad content
- **Charts:** Recharts for analytics (bar, area, donut charts)
- **UI:** shadcn/ui + Tailwind CSS 4 + Framer Motion
- **Forms:** React Hook Form + Zod validation

---

*This analysis was generated from a complete code review of the Salebiz web application. Ready for mobile app implementation planning.*
