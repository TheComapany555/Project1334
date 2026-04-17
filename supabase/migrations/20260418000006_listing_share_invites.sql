-- External listing share invites.
-- Brokers send a listing to a non-registered email; the recipient receives
-- a magic link that walks them through NDA signing + account creation,
-- then grants access to the listing.
-- ============================================================

CREATE TABLE public.listing_share_invites (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id              uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  broker_id               uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  recipient_name          text,
  recipient_email         text NOT NULL,

  -- Random URL-safe token sent in the invite email; one-time use until consumed.
  token                   text NOT NULL UNIQUE,
  expires_at              timestamptz NOT NULL DEFAULT (now() + interval '30 days'),

  -- Lifecycle timestamps
  sent_at                 timestamptz NOT NULL DEFAULT now(),
  opened_at               timestamptz,
  nda_signed_at           timestamptz,
  account_created_at      timestamptz,
  account_created_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,

  -- Snapshot of broker info at send time (in case broker profile changes later)
  broker_name_snapshot    text,
  broker_email_snapshot   text,

  -- Optional message the broker included
  custom_message          text,

  -- Single sender flow vs bulk: 'external' = non-registered, 'contact' = saved CRM contact
  send_type               text NOT NULL DEFAULT 'external'
    CHECK (send_type IN ('external', 'contact')),

  created_at              timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_share_invites_listing ON public.listing_share_invites(listing_id);
CREATE INDEX idx_share_invites_broker ON public.listing_share_invites(broker_id);
CREATE INDEX idx_share_invites_email ON public.listing_share_invites(recipient_email);
CREATE INDEX idx_share_invites_token ON public.listing_share_invites(token);

ALTER TABLE public.listing_share_invites ENABLE ROW LEVEL SECURITY;

-- Brokers see invites they sent
CREATE POLICY "share_invites_select_own"
  ON public.listing_share_invites FOR SELECT
  USING (broker_id = auth.uid());

CREATE POLICY "share_invites_insert_own"
  ON public.listing_share_invites FOR INSERT
  WITH CHECK (broker_id = auth.uid());

-- Agency owners can read invites sent by brokers in their agency
CREATE POLICY "share_invites_agency_owner_select"
  ON public.listing_share_invites FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.agency_role = 'owner'
        AND p.agency_id = (
          SELECT agency_id FROM public.profiles WHERE id = listing_share_invites.broker_id
        )
    )
  );

COMMENT ON TABLE public.listing_share_invites IS
  'Brokers send listings to non-registered emails. The recipient gets a magic link that walks them through NDA + signup before granting listing access. Tokens are one-time-use until account_created_user_id is populated.';
