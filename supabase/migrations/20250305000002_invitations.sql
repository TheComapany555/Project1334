-- Agency invitations: allow agency owners to invite brokers
CREATE TABLE public.agency_invitations (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id  uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  email      text NOT NULL,
  token      text UNIQUE NOT NULL,
  status     text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'expired')),
  invited_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_agency_invitations_agency ON public.agency_invitations(agency_id);
CREATE INDEX idx_agency_invitations_token ON public.agency_invitations(token);
CREATE INDEX idx_agency_invitations_email ON public.agency_invitations(email);

ALTER TABLE public.agency_invitations ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.agency_invitations IS 'Invitations sent by agency owners to onboard new brokers into their agency.';
