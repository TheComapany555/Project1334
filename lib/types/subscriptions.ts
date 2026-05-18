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
  /** Seats this subscription is billing for in the current period. */
  quantity: number;
  /** Snapshot of plan's included_seats at subscribe time (tiered_seats only). */
  included_seats_snapshot: number | null;
  /** Snapshot of plan's extra_seat_price (cents) at subscribe time. */
  extra_seat_price_snapshot: number | null;
  /** Stripe Price ID for the per-extra-seat recurring line item. */
  extra_seat_stripe_price_id: string | null;
  /** Stripe SubscriptionItem ID for the per-extra-seat line item. */
  extra_seat_stripe_item_id: string | null;
  created_at: string;
  updated_at: string;
  agency?: { id: string; name: string; slug: string | null };
  plan_product?: {
    id: string;
    name: string;
    price: number;
    currency: string;
    pricing_model?: "flat" | "tiered_seats";
    included_seats?: number | null;
    extra_seat_price?: number | null;
  };
};

export type SubscriptionForAdmin = AgencySubscription & {
  agency_name: string;
  agency_email: string | null;
  broker_count: number;
  /** Computed monthly total at the agency's current broker count (base + overage). */
  monthly_total_cents: number;
  /** Cached "extra" seat count if the plan is tiered_seats; 0 for flat. */
  extra_seats_now: number;
};
