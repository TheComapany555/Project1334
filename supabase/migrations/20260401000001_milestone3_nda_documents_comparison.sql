-- Milestone 3: NDA System, Document Vault, and Comparison Tool
-- ============================================================

-- 1. Listing NDA configuration (broker sets NDA requirement per listing)
CREATE TABLE IF NOT EXISTS listing_ndas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  nda_text text NOT NULL,
  is_required boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(listing_id)
);

CREATE INDEX idx_listing_ndas_listing ON listing_ndas(listing_id);
ALTER TABLE listing_ndas ENABLE ROW LEVEL SECURITY;

-- 2. NDA Signatures (buyer signs NDA for a listing)
CREATE TABLE IF NOT EXISTS nda_signatures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  signer_name text NOT NULL,
  signer_email text NOT NULL,
  signature_data text NOT NULL,
  signed_at timestamptz NOT NULL DEFAULT now(),
  ip_address text,
  UNIQUE(listing_id, user_id)
);

CREATE INDEX idx_nda_signatures_listing ON nda_signatures(listing_id);
CREATE INDEX idx_nda_signatures_user ON nda_signatures(user_id);
ALTER TABLE nda_signatures ENABLE ROW LEVEL SECURITY;

-- RLS: users can read their own signatures
CREATE POLICY "Users can view own NDA signatures"
  ON nda_signatures FOR SELECT
  USING (auth.uid() = user_id);

-- 3. Listing Documents (Document Vault)
CREATE TABLE IF NOT EXISTS listing_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  name text NOT NULL,
  file_url text NOT NULL,
  file_size integer,
  file_type text,
  category text NOT NULL DEFAULT 'other'
    CHECK (category IN ('profit_loss', 'lease_agreement', 'equipment_list', 'tax_return', 'financial_statement', 'other')),
  is_confidential boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  uploaded_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_listing_documents_listing ON listing_documents(listing_id);
CREATE INDEX idx_listing_documents_category ON listing_documents(listing_id, category);
ALTER TABLE listing_documents ENABLE ROW LEVEL SECURITY;

-- RLS: public can see non-confidential doc metadata for published listings
CREATE POLICY "Public can view non-confidential document names"
  ON listing_documents FOR SELECT
  USING (
    is_confidential = false
    AND EXISTS (
      SELECT 1 FROM listings WHERE listings.id = listing_id AND listings.status = 'published'
    )
  );

-- 4. Comparison lists for buyers
CREATE TABLE IF NOT EXISTS comparison_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'My Comparison',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_comparison_lists_user ON comparison_lists(user_id);
ALTER TABLE comparison_lists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own comparison lists"
  ON comparison_lists FOR ALL
  USING (auth.uid() = user_id);

-- 5. Comparison list items
CREATE TABLE IF NOT EXISTS comparison_list_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comparison_list_id uuid NOT NULL REFERENCES comparison_lists(id) ON DELETE CASCADE,
  listing_id uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  added_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(comparison_list_id, listing_id)
);

CREATE INDEX idx_comparison_items_list ON comparison_list_items(comparison_list_id);
CREATE INDEX idx_comparison_items_listing ON comparison_list_items(listing_id);
ALTER TABLE comparison_list_items ENABLE ROW LEVEL SECURITY;

-- 6. Storage bucket for listing documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('listing-documents', 'listing-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for listing-documents bucket
CREATE POLICY "Service role can manage listing documents"
  ON storage.objects FOR ALL
  USING (bucket_id = 'listing-documents')
  WITH CHECK (bucket_id = 'listing-documents');
