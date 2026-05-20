-- Widen broker_contacts.source CHECK so rows added via the bulk-import
-- flow can be attributed correctly instead of being lumped under "manual".
--
-- Before: source IN ('enquiry', 'manual')
-- After:  source IN ('enquiry', 'manual', 'import')
--
-- Existing rows stay untouched; the import server action will start using
-- 'import' going forward.

ALTER TABLE public.broker_contacts
  DROP CONSTRAINT IF EXISTS broker_contacts_source_check;

ALTER TABLE public.broker_contacts
  ADD CONSTRAINT broker_contacts_source_check
  CHECK (source IN ('enquiry', 'manual', 'import'));

COMMENT ON COLUMN public.broker_contacts.source IS
  'How the contact was created. enquiry = pulled in from a public enquiry form submission. manual = broker typed it in. import = uploaded via the bulk-import flow.';
