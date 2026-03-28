# Web vs Mobile Feature Parity — Complete Analysis

Generated: 27 Mar 2026

---

## ROLE: ADMIN

### Web Admin Features vs Mobile Status

| # | Feature (Web) | Mobile Status | Notes |
|---|--------------|---------------|-------|
| **Overview** | | | |
| 1 | Dashboard stats (agencies, listings, enquiries, categories) | ✅ Done | Stats shown on overview screen |
| 2 | Overview chart (listings & enquiries trends) | ❌ Missing | No charts in mobile |
| 3 | Recent activity (latest 10 enquiries) | ❌ Missing | Not shown |
| 4 | Quick links to sections | ❌ Missing | Removed per user request |
| **Agencies** | | | |
| 5 | View all agencies table (name, owner, brokers, listings, status) | ❌ Missing | No agencies screen in mobile |
| 6 | Search/filter agencies | ❌ Missing | |
| 7 | Approve pending agency | ❌ Missing | |
| 8 | Disable/Enable agency | ❌ Missing | |
| 9 | Custom pricing per agency | ❌ Missing | |
| **Listings** | | | |
| 10 | View all listings table | ✅ Done | Shows all listings |
| 11 | Search/filter listings (title, status, visibility) | ❌ Missing | No search/filter on mobile |
| 12 | View listing (public page) | ✅ Done | View button |
| 13 | Edit any listing | ✅ Done | Edit button opens edit form |
| 14 | Remove from marketplace | ✅ Done | Remove action with confirm |
| 15 | Restore to marketplace | ✅ Done | Restore action |
| 16 | Feature 7/14/30 days | ✅ Done | Feature action with day picker |
| 17 | Extend featured +7/+14 days | ❌ Missing | Only set (not extend) |
| 18 | Remove featured status | ❌ Missing | Only set featured |
| **Categories** | | | |
| 19 | View all categories | ❌ Missing | No categories screen |
| 20 | Add category | ❌ Missing | |
| 21 | Edit category (name, slug, sort, active) | ❌ Missing | |
| 22 | Activate/Deactivate category | ❌ Missing | |
| **Enquiries** | | | |
| 23 | View all enquiries with charts | ✅ Partial | List only, no charts |
| 24 | Filter by reason/broker | ❌ Missing | No filters |
| 25 | View enquiry detail sheet | ❌ Missing | Basic card only |
| 26 | Email/Call contact from enquiry | ✅ Done | Mailto/tel links |
| **Pricing & Plans** | | | |
| 27 | View all products/plans | ❌ Missing | No products screen |
| 28 | Add/Edit/Toggle products | ❌ Missing | |
| **Payments & Revenue** | | | |
| 29 | Revenue summary cards | ❌ Missing | No admin payments screen |
| 30 | Revenue charts (timeline, distribution, product breakdown) | ❌ Missing | |
| 31 | Payment logs table | ❌ Missing | |
| 32 | Pending invoice alert | ❌ Missing | |
| **Subscriptions** | | | |
| 33 | View all subscriptions table | ❌ Missing | No admin subscriptions screen |
| 34 | Activate pending (approve invoice) | ❌ Missing | |
| 35 | Reject pending | ❌ Missing | |
| 36 | Extend subscription | ❌ Missing | |
| 37 | Cancel at period end / immediately | ❌ Missing | |
| 38 | Reactivate expired/cancelled | ❌ Missing | |
| **Advertising** | | | |
| 39 | View all ads | ❌ Missing | No advertising screen |
| 40 | Create/Edit/Delete ads | ❌ Missing | |
| 41 | Activate/Deactivate ads | ❌ Missing | |
| **Notifications** | | | |
| 42 | View notifications | ✅ Done | In More screen (10 latest) |
| 43 | Mark as read | ✅ Done | Tap to mark read |

**Admin Summary: 8 of 43 features done (19%)**

---

## ROLE: BROKER-OWNER

### Web Broker-Owner Features vs Mobile Status

| # | Feature (Web) | Mobile Status | Notes |
|---|--------------|---------------|-------|
| **Overview** | | | |
| 1 | Stats cards (listings, enquiries, drafts) | ✅ Done | 6 stat cards |
| 2 | Agency name + subscription badge | ❌ Missing | No subscription badge on overview |
| 3 | Overview chart (listings & enquiries trend) | ❌ Missing | No charts |
| 4 | Recent 5 listings | ❌ Missing | Removed with quick actions |
| **Listings** | | | |
| 5 | View all agency listings | ✅ Done | Shows agency listings for owner |
| 6 | "Broker" column showing who owns each listing | ❌ Missing | No broker column |
| 7 | Search/filter (status, category, highlights) | ❌ Missing | No filters on listings screen |
| 8 | Create new listing (3-step wizard) | ✅ Done | Single scrollable form |
| 9 | Edit listing (all fields) | ✅ Done | Full edit form |
| 10 | Rich text description editor | ❌ Missing | Plain text only |
| 11 | Image upload (max 10) | ✅ Done | |
| 12 | Image reorder | ✅ Done | Arrow buttons |
| 13 | Image delete | ✅ Done | |
| 14 | Highlight tags selection | ✅ Done | Toggle chips |
| 15 | Listing tier selection (Basic/Standard/Featured) | ✅ Done | TierSelector component |
| 16 | Publish/Unpublish | ✅ Done | Status actions |
| 17 | Under Offer / Mark Sold | ✅ Done | Status actions |
| 18 | Delete listing | ✅ Done | With confirmation |
| 19 | Checkout / payment for paid tiers | ❌ Missing | No Stripe checkout in mobile |
| **Enquiries** | | | |
| 20 | View all agency enquiries | ✅ Done | Agency-wide for owner |
| 21 | Enquiry charts (bar + donut) | ❌ Missing | List only |
| 22 | Filter by reason | ❌ Missing | No filters |
| 23 | View full enquiry detail | ✅ Partial | Card with message, no sheet |
| 24 | Email/Call from enquiry | ✅ Done | |
| **Payments** | | | |
| 25 | View all agency payments | ✅ Partial | Shows payments but not agency-wide per backend fix |
| 26 | Stats (total, completed, pending) | ❌ Missing | No summary cards |
| 27 | Broker column (which broker) | ❌ Missing | |
| **Subscription** | | | |
| 28 | View active subscription details | ✅ Done | Plan, price, period |
| 29 | Subscribe (Stripe card payment) | ❌ Missing | Invoice request only |
| 30 | Subscribe (invoice request) | ✅ Done | |
| 31 | Manage billing (Stripe portal) | ❌ Missing | |
| 32 | Billing history | ❌ Missing | |
| **Workspace — Profile** | | | |
| 33 | Edit name, phone, email, website, bio | ✅ Done | |
| 34 | Profile photo upload | ✅ Done | |
| 35 | Logo upload | ❌ Missing | No logo upload in profile |
| 36 | Profile slug/URL | ✅ Done | |
| 37 | Social links (LinkedIn, Facebook, Instagram) | ✅ Done | |
| 38 | Public email | ✅ Done | |
| **Workspace — Agency** | | | |
| 39 | Edit agency name, contact, bio | ✅ Done | |
| 40 | Agency logo upload | ✅ Done | Tap avatar |
| 41 | Agency slug | ❌ Missing | Not in mobile form |
| 42 | Social links | ✅ Done | In edit form |
| **Workspace — Team** | | | |
| 43 | Invite broker by email | ✅ Done | |
| 44 | View pending invitations | ❌ Missing | No pending invitations list |
| 45 | Resend invitation | ❌ Missing | |
| 46 | Revoke invitation | ❌ Missing | |
| 47 | View active brokers | ✅ Done | Team members list |
| 48 | Remove broker | ✅ Done | With confirmation |
| **Notifications** | | | |
| 49 | View notifications | ✅ Done | Last 10 in More screen |
| 50 | Mark as read | ✅ Done | |
| 51 | Dedicated notifications page (50 items) | ❌ Missing | Only 10 in More screen |

**Broker-Owner Summary: 29 of 51 features done (57%)**

---

## ROLE: BROKER-MEMBER

### Web Broker-Member Features vs Mobile Status

| # | Feature (Web) | Mobile Status | Notes |
|---|--------------|---------------|-------|
| 1 | Dashboard stats (own listings/enquiries) | ✅ Done | |
| 2 | View own listings | ✅ Done | |
| 3 | Create listing | ✅ Done | |
| 4 | Edit own listing | ✅ Done | |
| 5 | All listing management (images, status, delete) | ✅ Done | |
| 6 | View own enquiries | ✅ Done | |
| 7 | Email/Call from enquiry | ✅ Done | |
| 8 | View own payments | ✅ Done | |
| 9 | Edit profile (name, contact, bio, social, photo) | ✅ Done | |
| 10 | Notifications | ✅ Done | |
| 11 | Rich text description | ❌ Missing | Plain text |
| 12 | Checkout for paid tiers | ❌ Missing | |
| 13 | Enquiry charts | ❌ Missing | |
| 14 | Search/filter listings | ❌ Missing | |

**Broker-Member Summary: 10 of 14 features done (71%)**

---

## ROLE: PUBLIC (Unauthenticated)

| # | Feature (Web) | Mobile Status | Notes |
|---|--------------|---------------|-------|
| 1 | Homepage with featured + recent listings | ✅ Done | |
| 2 | Search with filters (category, state, price, sort) | ✅ Done | |
| 3 | Suburb filter | ✅ Done | |
| 4 | Revenue range filter | ✅ Done | |
| 5 | Listing detail page | ✅ Done | |
| 6 | Submit enquiry | ✅ Done | |
| 7 | Broker profile page | ✅ Done | |
| 8 | Agency profile page | ✅ Done | |
| 9 | Login | ✅ Done | |
| 10 | Register | ✅ Done | |
| 11 | Email verification | ✅ Done | |
| 12 | Password reset | ✅ Done | |
| 13 | Join via invitation | ✅ Done | |
| 14 | Ad slots (homepage, search, listing) | ❌ Missing | No ad display |
| 15 | Highlight filter in search | ❌ Missing | |

**Public Summary: 13 of 15 features done (87%)**

---

## PRIORITY RANKING — What to Build Next

### HIGH PRIORITY (Core business functions missing)

| # | Feature | Role | Effort |
|---|---------|------|--------|
| 1 | Admin: Agencies management (approve/disable) | Admin | Medium |
| 2 | Admin: Subscriptions management (activate/reject/extend/cancel) | Admin | Medium |
| 3 | Admin: Payments management (view logs, approve invoices) | Admin | Medium |
| 4 | Admin: Listings search/filter | Admin | Low |
| 5 | Admin: Extend/Remove featured on listings | Admin | Low |
| 6 | Broker: Pending invitations list + resend/revoke | Owner | Low |
| 7 | Broker: Dedicated notifications page (50 items vs 10) | All | Low |

### MEDIUM PRIORITY (Feature parity improvements)

| # | Feature | Role | Effort |
|---|---------|------|--------|
| 8 | Admin: Enquiries filter (reason, broker) | Admin | Low |
| 9 | Admin: Categories management | Admin | Medium |
| 10 | Broker: Listings search/filter (status, category) | Broker | Low |
| 11 | Broker: Enquiry charts (bar + donut) | Owner | Medium |
| 12 | Broker: Payment summary cards | All | Low |
| 13 | Broker: Agency slug in edit form | Owner | Low |
| 14 | Broker: Profile logo upload | All | Low |

### LOW PRIORITY (Nice to have)

| # | Feature | Role | Effort |
|---|---------|------|--------|
| 15 | Admin: Products/Plans management | Admin | High |
| 16 | Admin: Advertising management | Admin | High |
| 17 | Admin: Overview charts | Admin | Medium |
| 18 | Broker: Overview chart + recent listings | All | Medium |
| 19 | Broker: Rich text editor for descriptions | All | High |
| 20 | Broker: Stripe card payment checkout | Owner | High |
| 21 | Public: Ad slot display | Public | Medium |
| 22 | Public: Highlight filter in search | Public | Low |
