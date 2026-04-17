-- Enquiry-side consent capture.
-- The public enquiry form gains a checkbox: "I agree to be added to the
-- broker's contact list for marketing communications." If checked, the
-- broker can one-click add the enquirer to their CRM contacts (and the
-- consent flows through to broker_contacts.consent_marketing).
-- ============================================================

ALTER TABLE public.enquiries
  ADD COLUMN IF NOT EXISTS consent_marketing boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS interest text;

CREATE INDEX IF NOT EXISTS idx_enquiries_consent
  ON public.enquiries(broker_id, consent_marketing)
  WHERE consent_marketing = true;

COMMENT ON COLUMN public.enquiries.consent_marketing IS
  'Buyer ticked the consent checkbox on the enquiry form. Carries through to broker_contacts.consent_marketing when the broker adds them as a contact.';
COMMENT ON COLUMN public.enquiries.interest IS
  'Optional free-text interest captured on the enquiry form (e.g. "Cafe in Sydney <$500k"). Mirrors broker_contacts.interest for direct copy when adding to CRM.';
