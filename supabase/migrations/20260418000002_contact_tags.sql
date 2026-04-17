-- Broker contact tagging system (e.g. VIP, Investor, Buyer).
-- Tags are broker-scoped so each broker maintains their own tag taxonomy.
-- ============================================================

CREATE TABLE public.contact_tags (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  broker_id   uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name        text NOT NULL,
  color       text NOT NULL DEFAULT 'primary'
    CHECK (color IN ('primary', 'secondary', 'warning', 'success', 'danger', 'neutral')),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_contact_tags_unique_name
  ON public.contact_tags (broker_id, lower(name));
CREATE INDEX idx_contact_tags_broker ON public.contact_tags (broker_id);

ALTER TABLE public.contact_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contact_tags_select_own"
  ON public.contact_tags FOR SELECT
  USING (broker_id = auth.uid());

CREATE POLICY "contact_tags_insert_own"
  ON public.contact_tags FOR INSERT
  WITH CHECK (broker_id = auth.uid());

CREATE POLICY "contact_tags_update_own"
  ON public.contact_tags FOR UPDATE
  USING (broker_id = auth.uid());

CREATE POLICY "contact_tags_delete_own"
  ON public.contact_tags FOR DELETE
  USING (broker_id = auth.uid());

-- Agency owners can read tags belonging to brokers in their agency
CREATE POLICY "contact_tags_agency_owner_select"
  ON public.contact_tags FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.agency_role = 'owner'
        AND p.agency_id = (
          SELECT agency_id FROM public.profiles WHERE id = contact_tags.broker_id
        )
    )
  );

-- Many-to-many join: a contact can have multiple tags
CREATE TABLE public.broker_contact_tag_map (
  contact_id  uuid NOT NULL REFERENCES public.broker_contacts(id) ON DELETE CASCADE,
  tag_id      uuid NOT NULL REFERENCES public.contact_tags(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (contact_id, tag_id)
);

CREATE INDEX idx_contact_tag_map_tag ON public.broker_contact_tag_map (tag_id);

ALTER TABLE public.broker_contact_tag_map ENABLE ROW LEVEL SECURITY;

-- Policies join through broker_contacts ownership
CREATE POLICY "contact_tag_map_select_own"
  ON public.broker_contact_tag_map FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.broker_contacts bc
      WHERE bc.id = broker_contact_tag_map.contact_id
        AND bc.broker_id = auth.uid()
    )
  );

CREATE POLICY "contact_tag_map_insert_own"
  ON public.broker_contact_tag_map FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.broker_contacts bc
      WHERE bc.id = broker_contact_tag_map.contact_id
        AND bc.broker_id = auth.uid()
    )
  );

CREATE POLICY "contact_tag_map_delete_own"
  ON public.broker_contact_tag_map FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.broker_contacts bc
      WHERE bc.id = broker_contact_tag_map.contact_id
        AND bc.broker_id = auth.uid()
    )
  );

COMMENT ON TABLE public.contact_tags IS
  'Broker-scoped contact tags (VIP, Investor, etc). Each broker maintains their own tag list; agency owners can read across brokers in their agency.';
