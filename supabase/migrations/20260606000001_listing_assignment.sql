-- Tier B / Feature #6: Listing Assignment From Agency to Brokers.
--
-- Agencies upload listings under one account, then distribute them across their
-- brokers. We model "assign" as an ownership transfer: listings.broker_id holds
-- the current owner/assignee (drives enquiries, edit rights, and the public
-- contact), so every existing ownership check keeps working unchanged.
--
-- We add `created_by` to remember the ORIGINAL creator. broker_id moves on
-- reassignment; created_by is fixed, which lets the broker dashboard separate
-- "Listings I created" from "Listings assigned to me".

ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Backfill: existing listings were created by their current broker.
UPDATE public.listings SET created_by = broker_id WHERE created_by IS NULL;

CREATE INDEX IF NOT EXISTS idx_listings_created_by ON public.listings(created_by);

COMMENT ON COLUMN public.listings.created_by IS
  'Original creator (profiles.id). broker_id is the current owner/assignee and changes on reassignment; created_by is fixed so the dashboard can distinguish "Created by me" from "Assigned to me".';

-- Allow an in-app notification when a listing is assigned/reassigned to a broker.
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check CHECK (type IN (
    -- Pre-existing
    'enquiry_received',
    'enquiry_reply',
    'enquiry_sent',
    'listing_published',
    'listing_unpublished',
    'listing_shared',
    'listing_alert_match',
    'payment_received',
    'payment_approved',
    'invoice_requested',
    'subscription_activated',
    'subscription_cancelled',
    'subscription_expiring',
    'broker_joined',
    'broker_removed',
    'agency_approved',
    'document_access_requested',
    'general',
    -- M1.2 (CRM)
    'follow_up_due',
    'email_received',
    'feedback_logged',
    -- M1.3 (messaging)
    'message_received',
    'message_sent',
    -- M2.2 (Virtual Data Room)
    'data_room_request',
    'data_room_view',
    'data_room_download',
    'access_approved',
    'access_expiring',
    'access_expired',
    'new_files_added',
    -- Tier B / Feature #6 (listing assignment)
    'listing_assigned'
  ));
