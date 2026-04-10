-- Broker contact list: save enquiry contacts for CRM-lite functionality
CREATE TABLE public.broker_contacts (
  id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  broker_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name         text,
  email        text NOT NULL,
  phone        text,
  company      text,
  notes        text,
  source       text DEFAULT 'manual' CHECK (source IN ('enquiry', 'manual')),
  enquiry_id   uuid REFERENCES public.enquiries(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- Each broker can only save a given email once
CREATE UNIQUE INDEX idx_broker_contacts_unique_email ON public.broker_contacts (broker_id, email);
CREATE INDEX idx_broker_contacts_broker_id ON public.broker_contacts (broker_id);

ALTER TABLE public.broker_contacts ENABLE ROW LEVEL SECURITY;

-- Brokers see only their own contacts
CREATE POLICY "broker_contacts_select_own"
  ON public.broker_contacts FOR SELECT
  USING (broker_id = auth.uid());

CREATE POLICY "broker_contacts_insert_own"
  ON public.broker_contacts FOR INSERT
  WITH CHECK (broker_id = auth.uid());

CREATE POLICY "broker_contacts_update_own"
  ON public.broker_contacts FOR UPDATE
  USING (broker_id = auth.uid());

CREATE POLICY "broker_contacts_delete_own"
  ON public.broker_contacts FOR DELETE
  USING (broker_id = auth.uid());

-- Agency owners can see all contacts from brokers in their agency
CREATE POLICY "broker_contacts_agency_owner_select"
  ON public.broker_contacts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.agency_role = 'owner'
        AND p.agency_id = (
          SELECT agency_id FROM public.profiles WHERE id = broker_contacts.broker_id
        )
    )
  );
