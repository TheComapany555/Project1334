export type PaymentStatus = "pending" | "invoiced" | "approved" | "paid";
export type PaymentType = "featured" | "listing_tier" | "subscription";

export type Payment = {
  id: string;
  broker_id: string | null;
  agency_id: string | null;
  listing_id: string | null;
  product_id: string | null;
  stripe_session_id: string | null;
  stripe_payment_intent: string | null;
  package_days: number;
  amount: number;
  currency: string;
  status: PaymentStatus;
  payment_type: PaymentType;
  subscription_id: string | null;
  invoice_requested: boolean;
  created_at: string;
  paid_at: string | null;
  listing?: { id: string; title: string; slug: string } | null;
  broker?: { name: string | null; company: string | null } | null;
  product?: { id: string; name: string } | null;
};
