-- SaleBiz single-plan pricing model (client decision, 2026-06-03):
-- ONE agency subscription = an "agency fee" that covers 1 broker, plus a
-- per-extra-broker seat (~$95/mo, admin-customizable). This replaces the old
-- 3-tier picker (Starter / Growth / Scale) and any legacy flat plan.
--
-- IMPORTANT: this migration deliberately bakes in NO business price. It only
-- DEACTIVATES the old seed plans. The single live plan is created/edited by an
-- admin in Admin > Products, so the base fee + seat price stay fully
-- customizable (and version-control carries no pricing decisions). After
-- applying this, set up the one plan in the admin panel:
--
--   name            = "Agency Subscription"   (any name)
--   product_type    = subscription
--   pricing_model   = tiered_seats
--   included_seats  = 1                        (agency fee covers 1 broker)
--   extra_seat_price = 9500                     (cents = $95/extra broker/mo)
--   price           = <your monthly base agency fee, in cents>
--   status          = active
--
-- The subscribe page auto-detects a single active plan and switches to the
-- single-plan layout; if no plan is active it shows "No plans available", so
-- create the plan before onboarding agencies.

UPDATE public.products
SET status = 'inactive',
    updated_at = now()
WHERE product_type = 'subscription'
  AND status = 'active'
  AND (
    name IN ('Starter', 'Growth', 'Scale')  -- the seeded tier plans
    OR pricing_model = 'flat'                -- any legacy flat-rate plan
  );
