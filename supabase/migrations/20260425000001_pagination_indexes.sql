-- Composite indexes supporting paginated `(filter, order_by created_at DESC) RANGE`
-- queries introduced in lib/types/pagination.ts. The 20260410000001 migration
-- added single-column indexes; these add the `(col, created_at DESC)` shape
-- so Postgres can satisfy each list_*Paginated action without a sort step.

-- ── listings: broker / agency dashboards ──
-- listBrokerListings: WHERE broker_id = ? OR agency_id = ? ORDER BY updated_at DESC
CREATE INDEX IF NOT EXISTS idx_listings_broker_updated
  ON listings (broker_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_listings_agency_updated
  ON listings (agency_id, updated_at DESC);

-- listAdminListings: status filter + visibility (admin_removed_at) + featured + created_at DESC
CREATE INDEX IF NOT EXISTS idx_listings_status_created
  ON listings (status, created_at DESC);

-- ── enquiries: broker dashboard ──
-- listBrokerEnquiries: WHERE broker_id IN (...) ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_enquiries_broker_created
  ON enquiries (broker_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_enquiries_created
  ON enquiries (created_at DESC);

-- ── payments: broker / agency / admin tables ──
CREATE INDEX IF NOT EXISTS idx_payments_broker_created
  ON payments (broker_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_payments_agency_created
  ON payments (agency_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_payments_status_created
  ON payments (status, created_at DESC);

-- ── nda_signatures: broker dashboard ──
-- listBrokerNdaSignatures: WHERE listing_id IN (...) ORDER BY signed_at DESC
CREATE INDEX IF NOT EXISTS idx_nda_signatures_listing_signed
  ON nda_signatures (listing_id, signed_at DESC);

CREATE INDEX IF NOT EXISTS idx_nda_signatures_signed
  ON nda_signatures (signed_at DESC);

-- ── broker_contacts: contacts dashboard ──
CREATE INDEX IF NOT EXISTS idx_broker_contacts_broker_created
  ON broker_contacts (broker_id, created_at DESC);

-- ── agency_subscriptions: admin + per-agency lookups ──
CREATE INDEX IF NOT EXISTS idx_agency_subscriptions_status_created
  ON agency_subscriptions (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_agency_subscriptions_agency_created
  ON agency_subscriptions (agency_id, created_at DESC);

-- ── advertisements: admin table ──
CREATE INDEX IF NOT EXISTS idx_advertisements_status_sort
  ON advertisements (status, sort_order, created_at DESC);

-- ── profiles: agency broker list + admin user list ──
CREATE INDEX IF NOT EXISTS idx_profiles_role_created
  ON profiles (role, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_profiles_agency_role_created
  ON profiles (agency_id, agency_role, created_at);

-- ── agency_invitations: pending invitations list ──
CREATE INDEX IF NOT EXISTS idx_agency_invitations_agency_status_created
  ON agency_invitations (agency_id, status, created_at DESC);

-- ── agencies: admin list with status filter ──
CREATE INDEX IF NOT EXISTS idx_agencies_status_created
  ON agencies (status, created_at DESC);

-- ── notifications: per-user pagination (already paginated since launch) ──
CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON notifications (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON notifications (user_id, is_read)
  WHERE is_read = false;

-- ── products: admin pagination ──
CREATE INDEX IF NOT EXISTS idx_products_status_created
  ON products (status, created_at DESC);
