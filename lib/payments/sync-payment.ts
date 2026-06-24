import { stripe } from "@/lib/stripe";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import {
  applyFeaturedToListing,
  applyListingTierBenefits,
} from "@/lib/payments/apply-benefits";

const REUSABLE_PI_STATUSES = new Set([
  "requires_payment_method",
  "requires_confirmation",
  "requires_action",
]);

type SupabaseAdmin = ReturnType<typeof createServiceRoleClient>;

/**
 * Drop abandoned pending payments for a listing so the payments log doesn't
 * accumulate duplicate rows from checkout retries or tier changes.
 */
export async function clearStalePendingListingPayments(
  supabase: SupabaseAdmin,
  listingId: string,
  keepPaymentId?: string,
) {
  let q = supabase
    .from("payments")
    .delete()
    .eq("listing_id", listingId)
    .eq("status", "pending");
  if (keepPaymentId) q = q.neq("id", keepPaymentId);
  await q;
}

/**
 * Reuse an in-flight PaymentIntent when the broker refreshes checkout or
 * retries card entry for the same listing + product.
 */
export async function findReusablePendingPayment(
  supabase: SupabaseAdmin,
  listingId: string,
  productId: string,
): Promise<{ paymentId: string; clientSecret: string } | null> {
  const { data: rows } = await supabase
    .from("payments")
    .select("id, stripe_payment_intent")
    .eq("listing_id", listingId)
    .eq("product_id", productId)
    .eq("status", "pending")
    .not("stripe_payment_intent", "is", null)
    .order("created_at", { ascending: false })
    .limit(1);

  const row = rows?.[0];
  if (!row?.stripe_payment_intent) return null;

  try {
    const pi = await stripe.paymentIntents.retrieve(row.stripe_payment_intent);
    if (REUSABLE_PI_STATUSES.has(pi.status) && pi.client_secret) {
      return { paymentId: row.id, clientSecret: pi.client_secret };
    }
    if (pi.status === "succeeded") {
      await syncPaymentByIntentId(supabase, row.stripe_payment_intent);
    }
  } catch {
    return null;
  }
  return null;
}

/** Idempotent: mark paid + apply listing benefits if Stripe already succeeded. */
export async function syncPaymentByIntentId(
  supabase: SupabaseAdmin,
  paymentIntentId: string,
): Promise<{ ok: boolean; alreadyPaid?: boolean; error?: string }> {
  const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
  if (pi.status !== "succeeded") {
    return { ok: false, error: "Payment has not succeeded yet." };
  }

  const { data: payment } = await supabase
    .from("payments")
    .select("id, status")
    .eq("stripe_payment_intent", paymentIntentId)
    .maybeSingle();

  if (payment?.status === "paid") {
    return { ok: true, alreadyPaid: true };
  }

  const paymentType = pi.metadata?.payment_type;
  if (paymentType === "listing_tier") {
    await applyListingTierBenefits(supabase, pi.metadata);
    return { ok: true, alreadyPaid: false };
  }

  const paymentId = pi.metadata?.payment_id;
  const listingId = pi.metadata?.listing_id;
  const packageDays = Number(pi.metadata?.package_days ?? 0);
  const scope =
    (pi.metadata?.featured_scope as
      | "homepage"
      | "category"
      | "both"
      | undefined) ?? "homepage";

  if (paymentId && listingId && packageDays) {
    await supabase
      .from("payments")
      .update({ status: "paid", paid_at: new Date().toISOString() })
      .eq("id", paymentId);
    await applyFeaturedToListing(supabase, listingId, packageDays, scope);
  } else {
    await supabase
      .from("payments")
      .update({ status: "paid", paid_at: new Date().toISOString() })
      .eq("stripe_payment_intent", paymentIntentId)
      .eq("status", "pending");
  }

  return { ok: true, alreadyPaid: false };
}

export async function syncPaymentById(
  supabase: SupabaseAdmin,
  paymentId: string,
): Promise<{ ok: boolean; alreadyPaid?: boolean; error?: string }> {
  const { data: payment } = await supabase
    .from("payments")
    .select("id, status, stripe_payment_intent")
    .eq("id", paymentId)
    .single();

  if (!payment) return { ok: false, error: "Payment not found." };
  if (payment.status === "paid") return { ok: true, alreadyPaid: true };
  if (!payment.stripe_payment_intent) {
    return { ok: false, error: "No payment intent on file." };
  }

  return syncPaymentByIntentId(supabase, payment.stripe_payment_intent);
}
