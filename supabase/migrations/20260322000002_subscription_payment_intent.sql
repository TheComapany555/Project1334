-- Add stripe_payment_intent column for embedded payment flow
ALTER TABLE public.agency_subscriptions
  ADD COLUMN IF NOT EXISTS stripe_payment_intent text;
