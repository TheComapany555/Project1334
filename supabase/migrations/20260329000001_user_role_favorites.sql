-- Add 'user' as a valid role for mobile app users (buyers/browsers)
-- Existing roles: 'broker', 'admin'
-- New role: 'user' — can save favorites, send enquiries, view sent enquiries

-- User favorites table
CREATE TABLE IF NOT EXISTS user_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  listing_id uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, listing_id)
);

CREATE INDEX idx_user_favorites_user ON user_favorites(user_id);
CREATE INDEX idx_user_favorites_listing ON user_favorites(listing_id);

-- Add user_id to enquiries so logged-in users' enquiries are tracked
ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_enquiries_user ON enquiries(user_id);
