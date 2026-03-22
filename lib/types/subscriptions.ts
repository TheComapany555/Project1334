export type SubscriptionStatus =
  | "pending"
  | "active"
  | "past_due"
  | "cancelled"
  | "expired"
  | "trialing";

export type AgencySubscription = {
  id: string;
  agency_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
  plan_product_id: string | null;
  status: SubscriptionStatus;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  cancelled_at: string | null;
  grace_period_end: string | null;
  created_at: string;
  updated_at: string;
  agency?: { id: string; name: string; slug: string | null };
  plan_product?: { id: string; name: string; price: number; currency: string };
};

export type SubscriptionForAdmin = AgencySubscription & {
  agency_name: string;
  agency_email: string | null;
  broker_count: number;
};
