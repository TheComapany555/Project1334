# End-to-End Testing Guide — Milestone 1 & 2

## Prerequisites

### 1. Run Migrations (Supabase SQL Editor)
Run these **in order**:
```
supabase/migrations/20260321000001_agency_subscriptions.sql
supabase/migrations/20260321000002_listing_tiers.sql
supabase/migrations/20260322000001_agency_pricing_and_invoices.sql
```

### 2. Seed Products
```
supabase/seed-subscription-plans.sql
```

### 3. Clean Up Test Data
```sql
-- Remove any duplicate/stale subscription rows
DELETE FROM agency_subscriptions WHERE status IN ('pending', 'expired', 'cancelled');

-- Verify products exist
SELECT id, name, price, product_type, status FROM products ORDER BY product_type, price;
-- Should see: Basic Listing ($0), Standard Listing ($49), Featured Listing Tier ($99), Agency Monthly Subscription ($199)
```

### 4. Start Stripe CLI
```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```
Copy the `whsec_...` secret into `.env` as `STRIPE_WEBHOOK_SECRET`.

### 5. Start Dev Server
```bash
npm run dev
```

### 6. Test Accounts Needed
- **Admin account** (role: admin)
- **Agency owner account** (role: broker, with agency)
- A second browser/incognito for switching between admin and broker

---

## Test Flow 1: Agency Subscription (Card Payment)

### Step 1: Verify Access Gating
1. Log in as **agency owner**
2. **Expected**: Redirected to `/dashboard/subscribe` (if no active subscription)
3. Try navigating to `/dashboard/listings` manually
4. **Expected**: Redirected back to `/dashboard/subscribe`
5. `/dashboard/profile` should still be accessible (whitelisted)

### Step 2: Subscribe via Card
1. On `/dashboard/subscribe`, verify the plan card shows:
   - Agency Monthly Subscription
   - $199/month
   - Feature list (Unlimited listings, broker accounts, etc.)
2. Click **"Subscribe now"**
3. **Expected**: Checkout form appears with Stripe Elements
4. Enter test card: `4242 4242 4242 4242`, any future expiry, any CVC
5. Click **"Subscribe — $199.00 AUD/month"**
6. **Expected**: "Subscription activated!" success screen
7. **Expected**: Auto-redirect to `/dashboard` after ~3 seconds
8. **Expected**: "No active subscription" banner is gone
9. Check Stripe CLI terminal — should see `payment_intent.succeeded` webhook

### Step 3: Verify Active Subscription
1. Navigate to `/dashboard/subscribe`
2. **Expected**: Shows "Your subscription" card with:
   - "Active" badge
   - Current period dates
   - "Manage billing & invoices" button
3. Click **"Manage billing & invoices"**
4. **Expected**: Opens Stripe billing portal showing subscription details

### Step 4: Verify Dashboard Access
1. Navigate to `/dashboard/listings` — should work
2. Navigate to `/dashboard/enquiries` — should work
3. Navigate to `/dashboard/agency` — should work

---

## Test Flow 2: Agency Subscription (Invoice Request)

### Step 1: Setup
1. Delete existing subscription for test agency:
```sql
DELETE FROM agency_subscriptions WHERE agency_id = '<your-agency-id>';
```
2. Log out and back in as agency owner

### Step 2: Request Invoice
1. On `/dashboard/subscribe`, click **"Subscribe now"**
2. Click **"Request invoice"** tab
3. **Expected**: Shows "How it works" steps + notes field
4. Enter notes: "Please send to accounts@test.com, PO #12345"
5. Click **"Request invoice — $199.00 AUD/mo"**
6. **Expected**: "Invoice requested" success message
7. Check server logs — should see email sent to admin (or error if Resend not configured)

### Step 3: Admin Processes Invoice
1. Log in as **admin**
2. Go to `/admin/payments`
3. **Expected**: Yellow alert banner: "1 Pending invoice request"
4. Find the subscription payment in the table — should show "invoiced" status + "Invoice" badge
5. Click the **eye icon** to open payment detail
6. **Expected**: Invoice section visible with:
   - "Invoice Request" header
   - Agency notes showing "Please send to accounts@test.com, PO #12345"
   - Editable admin notes field
   - "Approve" and "Mark as paid" buttons
7. Enter admin notes: "Invoice #INV-001 sent via Xero on 22 Mar"
8. Click **"Save notes"** → toast "Admin notes saved"
9. Click **"Approve"** → toast "Payment marked as approved"
10. **Expected**: Status changes to "approved", email sent to agency

### Step 4: Mark as Paid
1. Open the same payment again
2. Click **"Mark as paid"**
3. **Expected**: Status changes to "paid"
4. Check `agency_subscriptions` table:
```sql
SELECT status, current_period_start, current_period_end FROM agency_subscriptions WHERE agency_id = '<agency-id>';
-- Should show: status='active', dates set to now → now+30 days
```
5. Log in as agency owner → dashboard should be fully accessible

---

## Test Flow 3: Listing Tiers

### Step 3a: Basic Tier (Free, Immediate Publish)
1. Log in as agency owner (with active subscription)
2. Go to `/dashboard/listings/new`
3. Fill Step 1 (title, category, price) and Step 2 (summary, description)
4. On Step 3, select **"Basic"** tier ($0)
5. Click **"Publish"**
6. **Expected**: Listing created and published immediately
7. Go to `/search` — **listing should NOT appear** (basic = direct URL only)
8. Navigate to the listing via `/listing/<slug>` — **should be visible**

### Step 3b: Standard Tier (Paid, Search Visible)
1. Create another listing, select **"Standard"** tier ($49)
2. Click **"Continue to payment"**
3. **Expected**: Redirected to `/checkout?listing=...&product=...&type=listing_tier`
4. **Expected**: Order summary shows $49.00 AUD, "Standard Listing"
5. **Expected**: Toggle between "Pay by card" and "Request invoice" visible
6. Pay with test card `4242 4242 4242 4242`
7. **Expected**: Success screen → listing auto-published
8. Check Stripe CLI — `payment_intent.succeeded` webhook fired
9. Go to `/search` — **listing SHOULD appear in results**
10. Check `/dashboard/listings` — tier badge shows "Standard"

### Step 3c: Featured Tier (Paid, Homepage + Search)
1. Create another listing, select **"Featured"** tier ($99)
2. Pay via checkout
3. **Expected**: Listing published with featured badge
4. Go to homepage `/` — **listing should appear** with featured badge
5. Go to `/search` — **listing should appear near top** (featured sort priority)
6. Check in DB:
```sql
SELECT listing_tier, tier_paid_at, is_featured, featured_until FROM listings WHERE slug = '<slug>';
-- Should show: listing_tier='featured', tier_paid_at set, is_featured=true, featured_until set
```

### Step 3d: Tier Change on Unpaid Draft
1. Create a listing with "Featured" tier but **don't pay**
2. Go to `/dashboard/listings` — should show "Featured" badge + "Unpaid" indicator
3. Edit the listing → should be able to change tier to "Standard" (since not paid yet)
4. Try to publish the listing directly → **Expected**: Error "Payment required before publishing"

### Step 3e: Invoice for Listing Tier
1. Create a listing with "Standard" tier
2. On checkout, click **"Request invoice"**
3. Add notes and submit
4. **Expected**: "Invoice requested" success
5. Check `/dashboard/listings` — listing shows "Standard" + "Unpaid"
6. Admin marks invoice as paid in `/admin/payments`
7. **Expected**: Listing auto-publishes
8. Verify in `/search` — listing now visible

---

## Test Flow 4: Custom Agency Pricing

### Step 1: Admin Sets Custom Price
1. Log in as **admin**
2. Go to `/admin/brokers`
3. Click **"Actions"** dropdown on an agency → **"Custom pricing"**
4. **Expected**: Shows all active products with default prices
5. For "Standard Listing" (default $49), enter custom price: **$29**
6. Add notes: "Agreed in contract #456"
7. Click **"Save"**
8. **Expected**: Toast "Custom price saved", "Custom price" badge appears

### Step 2: Verify Broker Sees Custom Price
1. Log in as broker from that agency
2. Go to `/dashboard/listings/new`
3. On Step 3 (tier selection):
   - **Expected**: Standard tier shows **$29** (not $49)
   - Featured and Basic should show default prices (unless also overridden)

### Step 3: Verify Checkout Uses Custom Price
1. Select Standard tier → Continue to payment
2. **Expected**: Checkout shows **$29.00 AUD** (not $49)
3. Pay with test card
4. Check in DB:
```sql
SELECT amount FROM payments ORDER BY created_at DESC LIMIT 1;
-- Should show: 2900 (cents) = $29.00
```

### Step 4: Custom Subscription Price
1. Admin sets custom price for "Agency Monthly Subscription": **$149** (default $199)
2. Agency owner goes to `/dashboard/subscribe`
3. **Expected**: Shows **$149/month** (not $199)
4. Subscribe → PaymentIntent should be for $149

### Step 5: Reset to Default
1. Admin goes to custom pricing page
2. Click **"Reset"** on Standard Listing
3. **Expected**: Custom price removed, reverts to $49 default
4. Broker creates new listing → Standard tier shows $49 again

---

## Test Flow 5: Admin Subscription Management

### Step 1: View All Subscriptions
1. Log in as **admin**
2. Go to `/admin/subscriptions`
3. **Expected**: Table showing all agencies with:
   - Agency name, status badge, plan, broker count
   - Period end date, Stripe status indicator

### Step 2: Manual Subscription Extension
1. Find the test agency in the table
2. Use admin actions to extend subscription by 30 days
3. **Expected**: `current_period_end` moved forward by 30 days

### Step 3: Cancel Subscription
1. Admin cancels the subscription
2. **Expected**: Status changes to "cancelled"
3. Agency owner refreshes dashboard → redirected to `/dashboard/subscribe`

### Step 4: Reactivate Subscription
1. Admin reactivates with 30 days
2. **Expected**: Status back to "active", new period dates set
3. Agency owner can access dashboard again

---

## Test Flow 6: Edge Cases

### 6a: Unpaid Tier Cannot Publish
1. Create a "Standard" listing (saved as draft, unpaid)
2. Try to change status to "Published" via dropdown
3. **Expected**: Error toast "Payment required before publishing"

### 6b: Basic Tier Cannot Request Invoice
1. Create a "Basic" listing
2. Somehow navigate to checkout with basic product
3. **Expected**: No "Request invoice" toggle shown (hidden for $0 products)

### 6c: Grace Period
1. In DB, set agency subscription to `past_due` with `grace_period_end` = 7 days from now
2. Agency owner should still have dashboard access
3. Set `grace_period_end` to yesterday
4. **Expected**: Agency redirected to `/dashboard/subscribe`

### 6d: Duplicate Subscription Prevention
1. Agency with active subscription tries to subscribe again
2. **Expected**: Error "Agency already has an active subscription"

### 6e: Non-Owner Cannot Subscribe
1. Log in as agency **member** (not owner)
2. Navigate to `/dashboard/subscribe`
3. **Expected**: Subscribe button not available or shows message "Only agency owners can manage subscriptions"

---

## Test Card Numbers

| Card | Behavior |
|------|----------|
| `4242 4242 4242 4242` | Succeeds |
| `4000 0000 0000 3220` | 3D Secure authentication required |
| `4000 0000 0000 9995` | Declined (insufficient funds) |
| `4000 0000 0000 0341` | Attaching to customer fails |

Use any future expiry date and any 3-digit CVC.

---

## Quick Verification Queries

```sql
-- Check agency subscriptions
SELECT a.name, s.status, s.current_period_end, s.stripe_customer_id
FROM agency_subscriptions s
JOIN agencies a ON a.id = s.agency_id
ORDER BY s.created_at DESC;

-- Check listing tiers
SELECT title, listing_tier, tier_paid_at, status, is_featured
FROM listings
ORDER BY created_at DESC
LIMIT 10;

-- Check payments
SELECT p.status, p.payment_type, p.amount, p.invoice_requested, p.invoice_notes,
       l.title as listing_title, pr.name as product_name
FROM payments p
LEFT JOIN listings l ON l.id = p.listing_id
LEFT JOIN products pr ON pr.id = p.product_id
ORDER BY p.created_at DESC
LIMIT 10;

-- Check custom pricing overrides
SELECT a.name as agency, pr.name as product, o.custom_price, pr.price as default_price
FROM agency_pricing_overrides o
JOIN agencies a ON a.id = o.agency_id
JOIN products pr ON pr.id = o.product_id;
```
