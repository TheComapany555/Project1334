import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { incrementDiscountCodeUsage } from "@/lib/actions/discount-codes";

type SupabaseAdmin = ReturnType<typeof createServiceRoleClient>;

/**
 * Activate agency subscription from a succeeded subscription PaymentIntent.
 * Idempotent: safe to call from webhook and client sync fallback.
 */
export async function activateSubscriptionFromPaymentIntent(
  supabase: SupabaseAdmin,
  paymentIntent: Stripe.PaymentIntent,
): Promise<{ ok: boolean; alreadyActive?: boolean; error?: string }> {
  const subscriptionDbId = paymentIntent.metadata?.subscription_db_id;
  const agencyId = paymentIntent.metadata?.agency_id;
  const productId = paymentIntent.metadata?.product_id;

  if (!subscriptionDbId) {
    return { ok: false, error: "Missing subscription metadata." };
  }

  if (paymentIntent.status !== "succeeded") {
    return { ok: false, error: "Payment has not succeeded yet." };
  }

  const { data: existing } = await supabase
    .from("agency_subscriptions")
    .select("status, stripe_subscription_id")
    .eq("id", subscriptionDbId)
    .single();

  if (
    existing &&
    ["active", "trialing", "past_due"].includes(existing.status) &&
    existing.stripe_subscription_id
  ) {
    return { ok: true, alreadyActive: true };
  }

  const now = new Date();
  const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  await supabase
    .from("agency_subscriptions")
    .update({
      status: "active",
      current_period_start: now.toISOString(),
      current_period_end: periodEnd.toISOString(),
      updated_at: now.toISOString(),
    })
    .eq("id", subscriptionDbId);

  const discountCodeId = paymentIntent.metadata?.discount_code_id;
  if (discountCodeId) {
    await incrementDiscountCodeUsage(discountCodeId).catch((e) =>
      console.error("[activate-subscription] Failed to increment discount usage:", e),
    );
  }

  if (existing?.stripe_subscription_id) {
    return { ok: true, alreadyActive: existing.status !== "pending" };
  }

  try {
    const agencyEmail = paymentIntent.metadata?.agency_email;
    const agencyName = paymentIntent.metadata?.agency_name;
    const pricingModel =
      (paymentIntent.metadata?.pricing_model as
        | "flat"
        | "tiered_seats"
        | undefined) ?? "flat";
    const includedSeats = Number(paymentIntent.metadata?.included_seats ?? "0");
    const extraSeatPriceCents = Number(
      paymentIntent.metadata?.extra_seat_price ?? "0",
    );
    const seatQuantity = Number(paymentIntent.metadata?.seat_quantity ?? "1");
    const basePriceCents = Number(
      paymentIntent.metadata?.base_price_cents ?? "0",
    );

    const customer = await stripe.customers.create({
      email: agencyEmail || undefined,
      name: agencyName || undefined,
      metadata: { agency_id: agencyId ?? "" },
    });

    const { data: product } = await supabase
      .from("products")
      .select("*")
      .eq("id", productId)
      .single();

    if (product) {
      const basePrice = await stripe.prices.create({
        currency: product.currency,
        unit_amount: basePriceCents || product.price,
        recurring: { interval: "month" },
        product_data: {
          name: product.name,
          metadata: { product_id: product.id, line: "base" },
        },
      });

      const items: Stripe.SubscriptionCreateParams.Item[] = [
        { price: basePrice.id, quantity: 1 },
      ];

      let extraSeatPrice: Stripe.Price | null = null;
      const extraSeats =
        pricingModel === "tiered_seats"
          ? Math.max(0, seatQuantity - includedSeats)
          : 0;
      if (pricingModel === "tiered_seats" && extraSeatPriceCents > 0) {
        extraSeatPrice = await stripe.prices.create({
          currency: product.currency,
          unit_amount: extraSeatPriceCents,
          recurring: { interval: "month" },
          product_data: {
            name: `${product.name} — extra broker`,
            metadata: { product_id: product.id, line: "extra_seat" },
          },
        });
        if (extraSeats > 0) {
          items.push({ price: extraSeatPrice.id, quantity: extraSeats });
        }
      }

      const trialEnd = Math.floor(periodEnd.getTime() / 1000);
      const stripeSub = await stripe.subscriptions.create({
        customer: customer.id,
        items,
        trial_end: trialEnd,
        payment_settings: {
          save_default_payment_method: "on_subscription",
        },
        metadata: {
          agency_id: agencyId ?? "",
          subscription_db_id: subscriptionDbId,
          pricing_model: pricingModel,
        },
      });

      let extraSeatItemId: string | null = null;
      if (extraSeatPrice) {
        for (const item of stripeSub.items?.data ?? []) {
          if (item.price?.id === extraSeatPrice.id) {
            extraSeatItemId = item.id;
            break;
          }
        }
      }

      await supabase
        .from("agency_subscriptions")
        .update({
          stripe_customer_id: customer.id,
          stripe_subscription_id: stripeSub.id,
          stripe_price_id: basePrice.id,
          extra_seat_stripe_price_id: extraSeatPrice?.id ?? null,
          extra_seat_stripe_item_id: extraSeatItemId,
          quantity: seatQuantity,
        })
        .eq("id", subscriptionDbId);
    }
  } catch (err) {
    console.error(
      "[activate-subscription] Failed to set up Stripe recurring subscription:",
      err,
    );
  }

  return { ok: true, alreadyActive: false };
}

/** Client/webhook fallback: activate by DB subscription id after card pay. */
export async function syncSubscriptionById(
  supabase: SupabaseAdmin,
  subscriptionId: string,
): Promise<{ ok: boolean; alreadyActive?: boolean; error?: string }> {
  const { data: sub } = await supabase
    .from("agency_subscriptions")
    .select("id, status, stripe_payment_intent")
    .eq("id", subscriptionId)
    .single();

  if (!sub) {
    return { ok: false, error: "Subscription not found." };
  }

  if (["active", "trialing", "past_due"].includes(sub.status)) {
    return { ok: true, alreadyActive: true };
  }

  if (!sub.stripe_payment_intent) {
    return { ok: false, error: "No payment on file for this subscription." };
  }

  const pi = await stripe.paymentIntents.retrieve(sub.stripe_payment_intent);
  return activateSubscriptionFromPaymentIntent(supabase, pi);
}
