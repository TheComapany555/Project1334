-- Enquiries from listing detail page (buyers contact broker). Server-only access via service role.
CREATE TABLE public.enquiries (
  id             uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id     uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  broker_id      uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reason         text,
  message        text NOT NULL,
  contact_name   text,
  contact_email  text NOT NULL,
  contact_phone  text,
  created_at     timestamptz DEFAULT now()
);

CREATE INDEX idx_enquiries_listing ON public.enquiries(listing_id);
CREATE INDEX idx_enquiries_broker ON public.enquiries(broker_id);
CREATE INDEX idx_enquiries_created ON public.enquiries(created_at DESC);

ALTER TABLE public.enquiries ENABLE ROW LEVEL SECURITY;

-- No policies: only server (service role) reads/writes. No anon/authenticated access.
COMMENT ON TABLE public.enquiries IS 'Buyer enquiries from listing page; broker notified by email.';
