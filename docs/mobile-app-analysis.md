# Salebiz Mobile App — Complete Analysis

**Location:** `/Users/macbookpro/Documents/Freelancing/Salesbiz/salebiz-mobile/`
**Stack:** React Native (Expo), Expo Router, TypeScript, React Hook Form + Zod
**Bundle ID:** `com.salebiz.mobile` (iOS & Android)

---

## 1. Current Implementation Status

### Overall Assessment: ~70% Complete (Broker-focused MVP)

The mobile app has a solid foundation with all screens implemented but is **missing significant features** compared to the web app. It currently functions as a **broker-only tool** — no admin features, no subscription management, no payment processing, and several business-critical flows are incomplete.

---

## 2. What's IMPLEMENTED (Working)

### Authentication
| Feature | Status | Notes |
|---------|--------|-------|
| Login (email/password) | ✅ Complete | Zod validation, toast errors |
| Registration | ✅ Complete | Name/email/password, creates user |
| Password Reset (UI) | ✅ Complete | Email form + success state |
| JWT Token Storage | ✅ Complete | Expo SecureStore, 30-day tokens |
| Auto-login on relaunch | ✅ Complete | Token validation on mount |
| Logout | ✅ Complete | With confirmation dialog |

### Public Screens
| Feature | Status | Notes |
|---------|--------|-------|
| Home (featured + recent) | ✅ Complete | Horizontal featured scroll, vertical recent list |
| Search with filters | ✅ Complete | Category, state, price range, sort, infinite scroll |
| Listing detail | ✅ Complete | Gallery, financials, broker card, enquiry form |
| Broker profile | ✅ Complete | Bio, contact actions, listings list |
| Agency profile | ✅ Complete | Bio, brokers list, listings, contact |
| Enquiry submission | ✅ Complete | Reason, message, contact info, validation |

### Broker Dashboard
| Feature | Status | Notes |
|---------|--------|-------|
| Dashboard overview (stats) | ✅ Complete | 6 stat cards, pull-to-refresh |
| My listings (list view) | ✅ Complete | With publish/unpublish toggle |
| Create listing | ✅ Complete | Multi-image upload, all fields, highlights |
| Edit listing | ✅ Complete | Image management, form pre-populated |
| Enquiries list | ✅ Complete | Contact actions (call/email), listing links |
| Payment history (view only) | ✅ Complete | List of past payments |
| Profile editing | ✅ Complete | Photo upload, all fields, slug |
| Workspace (agency info) | ✅ Complete | Agency card, team list, invite broker |
| Notifications (basic) | ✅ Complete | Last 50, mark as read, in "More" screen |

### Components
| Component | Status | Quality |
|-----------|--------|---------|
| ListingCard | ✅ | Excellent — featured/tier badges, two layouts |
| ImageGallery | ✅ | Excellent — fullscreen modal, pagination |
| FilterSheet | ✅ | Good — bottom sheet with all filter options |
| EnquiryForm | ✅ | Excellent — full validation, API integration |
| FeaturedBadge | ✅ | Excellent — live countdown timer |
| StatusBadge | ✅ | Good — semantic color mapping |
| Header | ✅ | Good — safe area, back button, right slot |
| All UI primitives | ✅ | Good — Button, Input, Card, Select, Avatar, Badge, EmptyState, Skeleton |

---

## 3. What's MISSING (Gaps vs Web App)

### Critical Gaps (Must Fix)

| # | Feature | Web App Has | Mobile App | Impact |
|---|---------|-------------|------------|--------|
| 1 | **Subscription management** | Full checkout (Stripe card + invoice) | ❌ Not implemented | Brokers can't subscribe from mobile — **blocking** |
| 2 | **Subscription gate** | Blocks dashboard if no subscription | ❌ Not implemented | Mobile lets unsubscribed users access everything |
| 3 | **Listing tier selection** | Basic/Standard/Featured with pricing | ❌ Always creates "basic" | Can't create paid listings from mobile |
| 4 | **Payment/checkout flow** | Stripe integration + invoice request | ❌ Not implemented | No way to pay for anything from mobile |
| 5 | **Email verification flow** | Token-based verification with resend | ❌ Not implemented | Registered users can't verify email from mobile |
| 6 | **Password reset email** | Sends via Resend | ⚠️ UI only, TODO in API | Reset form shows success but no email sent |
| 7 | **Agency registration** | Creates agency + broker + sends verification | ⚠️ Partial | Registration creates user but may not create agency properly |
| 8 | **Listing status state machine** | draft→published→under_offer→sold | ⚠️ Only publish/unpublish | Can't mark as "under offer" or "sold" |
| 9 | **Rich text description** | Lexical editor (rich text) | ❌ Plain text only | Descriptions created on mobile will be plain text |
| 10 | **Agency owner: edit member profiles** | Owner can edit any member's profile | ❌ Not implemented | Owner can only invite/remove, not edit |

### Moderate Gaps

| # | Feature | Web App Has | Mobile App | Impact |
|---|---------|-------------|------------|--------|
| 11 | **Join via invitation** | `/auth/join` with token validation | ❌ Not implemented | Invited brokers can't join from mobile |
| 12 | **Subscription status banner** | Warning banner for past_due/no subscription | ❌ Not implemented | No visual indicator of subscription issues |
| 13 | **Dashboard analytics charts** | 6-month bar/area charts for listings & enquiries | ❌ Not implemented | Stats cards only, no trend visualization |
| 14 | **Enquiry charts** | Bar chart (timeline) + donut (by reason) | ❌ Not implemented | List only, no visual analytics |
| 15 | **Image reordering** | Drag-to-reorder listing images | ❌ Not implemented | Images have sort_order but no reorder UI |
| 16 | **Listing delete** | Permanent delete option | ❌ Not implemented | No API endpoint for delete from mobile |
| 17 | **Agency logo upload** | Owner can upload agency logo | ❌ Not implemented | Can only view agency logo |
| 18 | **Agency settings edit** | Full agency profile editing | ❌ Not implemented | Workspace shows agency info read-only |
| 19 | **Social links management** | LinkedIn, Facebook, Instagram on profile | ❌ Not implemented | Profile edit doesn't include social links |
| 20 | **Public email field** | Separate public-facing email | ❌ Not implemented | Profile edit missing email_public |

### Minor Gaps

| # | Feature | Web App Has | Mobile App |
|---|---------|-------------|------------|
| 21 | Featured listings table | Lists featured with expiry dates | ❌ |
| 22 | Notification link navigation | Clicks navigate to relevant screen | ⚠️ Partial |
| 23 | Enquiry owner visibility | Agency owners see ALL agency enquiries | ⚠️ API supports but not verified in UI |
| 24 | Payment type display | Shows subscription vs listing_tier vs featured | ⚠️ Basic display only |
| 25 | Listing highlights in search | Filter by highlight tags | ❌ FilterSheet missing highlights filter |
| 26 | Revenue/profit range filter | Web search has revenue and profit range filters | ❌ FilterSheet missing these |
| 27 | Suburb filter in search | Web search filters by suburb | ❌ FilterSheet missing suburb |
| 28 | Ad slots | Homepage, search, listing pages have ads | ❌ No ad display |
| 29 | Lease details in create/edit | Web has lease details field | ✅ Field exists but may not save |

---

## 4. API Gaps (Backend Missing)

| Endpoint Needed | Purpose | Status |
|-----------------|---------|--------|
| `DELETE /api/mobile/listings/[id]` | Delete listing | ❌ Missing |
| `PUT /api/mobile/listings/[id]/status` | Set any status (under_offer, sold) | ❌ Missing (only publish/unpublish exist) |
| `POST /api/mobile/listings/[id]/images/reorder` | Reorder images | ❌ Missing |
| `PUT /api/mobile/agency/mine` | Update agency settings | ❌ Missing |
| `POST /api/mobile/agency/mine/logo` | Upload agency logo | ❌ Missing |
| `POST /api/mobile/subscribe` | Create subscription checkout | ❌ Missing |
| `GET /api/mobile/products` | Get available products/tiers | ❌ Missing |
| `POST /api/mobile/auth/verify` | Verify email token | ❌ Missing |
| `POST /api/mobile/auth/join` | Accept invitation | ❌ Missing |
| Password reset email sending | Actual email dispatch in reset flow | ⚠️ TODO in code |
| Invitation email sending | Send email when inviting broker | ⚠️ TODO in code |

---

## 5. Code Quality Issues

### Critical
1. **Production URL placeholder** — `lib/constants.ts:90` has `'https://your-production-domain.com'` hardcoded. Must be replaced before any production build.

### Moderate
2. **Badge `darkenColor()` is a stub** — Returns color unchanged, text contrast may be poor on some badge colors.
3. **Silent API failures** — Home screen and some other screens silently swallow API errors instead of showing error state.
4. **No offline support** — App will show blank screens if backend is unreachable.
5. **No retry logic** — Failed API calls are not retried.
6. **Filter state not preserved** — Navigating away from search loses filter selections.

### Minor
7. **Console logs in production** — `__DEV__` guards exist but extensive logging.
8. **No caching** — Categories, states, highlights fetched on every screen mount.
9. **No accessibility IDs** — Missing `testID` props for testing.
10. **Share URL hardcoded** — Listing detail share uses a hardcoded domain.

---

## 6. Architecture Assessment

### Strengths
- **Clean folder structure** — app/, components/, lib/, contexts/, hooks/
- **Type safety** — Full TypeScript with comprehensive types
- **Validation** — Zod schemas for all forms
- **Secure auth** — JWT in SecureStore, proper token lifecycle
- **Pull-to-refresh** — Implemented on all list screens
- **Platform-aware** — Proper iOS/Android handling (tab bar heights, safe areas, API URL)
- **Component reuse** — Good component abstraction (ListingCard, Header, etc.)

### Weaknesses
- **No state management library** — Uses only React Context + useState. Will become painful as features grow.
- **No data caching/sync** — Every screen re-fetches on mount. Should consider React Query/TanStack Query.
- **No deep linking configuration** — Expo Router supports it but not configured.
- **No push notifications** — Only in-app polling (every 30s on web, per-screen-focus on mobile).
- **No error boundaries** — Unhandled errors will crash the app.

---

## 7. Comparison Summary: Web vs Mobile

| Area | Web App | Mobile App | Parity |
|------|---------|------------|--------|
| Public browsing | Full | Full | ✅ 100% |
| Auth (login/register) | Full | Mostly working | ⚠️ 80% |
| Email verification | Full | Missing | ❌ 0% |
| Invitation join flow | Full | Missing | ❌ 0% |
| Broker dashboard overview | Full with charts | Stats cards only | ⚠️ 60% |
| Listing CRUD | Full with tiers | Create/edit (basic only) | ⚠️ 70% |
| Listing status management | Full state machine | Publish/unpublish only | ⚠️ 40% |
| Rich text editor | Lexical editor | Plain text | ⚠️ 30% |
| Enquiries | Full with charts | List only | ⚠️ 70% |
| Payments | Full with analytics | View-only list | ⚠️ 30% |
| Subscription management | Full Stripe integration | Not implemented | ❌ 0% |
| Workspace/team | Full (invite, edit, remove) | View + invite + remove | ⚠️ 70% |
| Agency settings | Full editing | Read-only | ⚠️ 20% |
| Profile settings | Full with social links | Basic fields only | ⚠️ 70% |
| Notifications | Full with real-time | Basic list (per-focus) | ⚠️ 50% |
| Admin panel | Full | Not implemented | ❌ 0% |
| Advertising | Full CRUD + display | Not implemented | ❌ 0% |
| Analytics/charts | Multiple chart types | None | ❌ 0% |

---

## 8. Recommended Implementation Priority

### Phase 1 — Critical (Blocking Business Operations)
1. Fix production API URL configuration
2. Subscription gate + management (Stripe/invoice)
3. Email verification flow
4. Listing tier selection + checkout
5. Full listing status state machine (under_offer, sold)

### Phase 2 — Important (Feature Parity)
6. Join via invitation flow
7. Agency settings editing (owner)
8. Social links on profile
9. Subscription status banner
10. Image reordering
11. Listing delete

### Phase 3 — Enhancement
12. Dashboard analytics charts
13. Data caching (React Query)
14. Push notifications
15. Deep linking
16. Error boundaries
17. Offline support
18. Search filter improvements (highlights, revenue/profit range, suburb)

### Phase 4 — Nice to Have
19. Ad display integration
20. Admin panel (may not be needed on mobile)
21. Rich text editor for descriptions

---

*Analysis complete. Ready to proceed with implementation.*
