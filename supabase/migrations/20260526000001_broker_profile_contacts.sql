-- Contacts submitted from a broker's public profile.
-- Server-only access via service role; admins and brokers read through actions.
CREATE TABLE public.broker_profile_contacts (
  id                 uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  broker_id          uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_id            uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  contact_name       text,
  contact_email      text NOT NULL,
  contact_phone      text,
  message            text NOT NULL,
  consent_marketing  boolean NOT NULL DEFAULT false,
  created_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_broker_profile_contacts_broker_id
  ON public.broker_profile_contacts(broker_id, created_at DESC);

CREATE INDEX idx_broker_profile_contacts_email
  ON public.broker_profile_contacts(lower(contact_email));

CREATE INDEX idx_broker_profile_contacts_created
  ON public.broker_profile_contacts(created_at DESC);

ALTER TABLE public.broker_profile_contacts ENABLE ROW LEVEL SECURITY;

-- No public policies: public submissions go through server actions only.
COMMENT ON TABLE public.broker_profile_contacts IS
  'Contact requests submitted from broker public profile pages.';
