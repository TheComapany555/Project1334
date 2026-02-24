-- Tokens for email verification and password reset. Server-only access (service role).
CREATE TABLE public.auth_tokens (
  id         uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type       text NOT NULL CHECK (type IN ('email_verification', 'password_reset')),
  token      text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_auth_tokens_token ON public.auth_tokens(token);
CREATE INDEX idx_auth_tokens_user_type ON public.auth_tokens(user_id, type);

ALTER TABLE public.auth_tokens ENABLE ROW LEVEL SECURITY;
-- No policies: only server (service role) accesses this table.
