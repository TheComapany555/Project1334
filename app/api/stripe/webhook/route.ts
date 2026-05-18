import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import {
  applyFeaturedToListing,
  applyListingTierBenefits,
} from "@/lib/payments/apply-benefits";
import { incrementDiscountCodeUsage } from "@/lib/actions/discount-codes";
import type Stripe from "stripe";

/**
 * Increment discount code usage when a Checkout Session completes (Stripe is
 * now the source of truth for redemption). Idempotent enough for our needs:
 * Stripe rarely re-delivers the same completed event, and we'd rather slightly
 * over-count than under-count for promo flow.
 */
async function recordDiscountUsage(
  metadata: Stripe.Metadata | null | undefined
) {
  const id = metadata?.discount_code_id;
  if (id) await incrementDiscountCodeUsage(id);
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid signature";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const supabase = createServiceRoleClient();

  // ── Checkout session completed ──
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const paymentType = session.metadata?.payment_type;

    if (paymentType === "subscription") {
      // Subscription checkout completed
      const subscriptionDbId = session.metadata?.subscription_db_id;
      const stripeSubscriptionId =
        typeof session.subscription === "string"
          ? session.subscription
          : null;

      if (subscriptionDbId) {
        await supabase
          .from("agency_subscriptions")
          .update({
            status: "active",
            stripe_subscription_id: stripeSubscriptionId,
            current_period_start: new Date().toISOString(),
            current_period_end: new Date(
              Date.now() + 30 * 24 * 60 * 60 * 1000
            ).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", subscriptionDbId);
      }
    } else if (paymentType === "listing_tier") {
      // Listing tier payment completed
      await applyListingTierBenefits(supabase, session.metadata);
      await recordDiscountUsage(session.metadata);
    } else {
      // Legacy / modern featured listing payment (also covers the discounted
      // checkout-session flow at /api/stripe/create-checkout-session)
      await handleFeaturedPayment(supabase, session);
      await recordDiscountUsage(session.metadata);
    }
  }

  // ── Payment intent succeeded ──
  if (event.type === "payment_intent.succeeded") {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    const paymentType = paymentIntent.metadata?.payment_type;

    if (paymentType === "subscription") {
      await handleSubscriptionPayment(supabase, paymentIntent);
    } else if (paymentType === "listing_tier") {
      await applyListingTierBenefits(supabase, paymentIntent.metadata);
    } else {
      // Legacy or featured payment
      const paymentId = paymentIntent.metadata?.payment_id;
      const listingId = paymentIntent.metadata?.listing_id;
      const packageDays = Number(paymentIntent.metadata?.package_days ?? 0);
      const scope =
        (paymentIntent.metadata?.featured_scope as
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
          .eq("stripe_payment_intent", paymentIntent.id)
          .eq("status", "pending");
      }
    }
  }

  // ── Subscription lifecycle events ──
  if (event.type === "customer.subscription.updated") {
    const subscription = event.data.object as Stripe.Subscription;
    const agencyId = subscription.metadata?.agency_id;
    const dbId = subscription.metadata?.subscription_db_id;

    if (dbId || agencyId) {
      const status = mapStripeSubStatus(subscription.status);

      // Extract period dates from subscription items
      const subItem = subscription.items?.data?.[0];
      const periodStartRaw = subItem?.current_period_start;
      const periodEndRaw = subItem?.current_period_end;
      const periodStart = periodStartRaw
        ? new Date(periodStartRaw * 1000).toISOString()
        : new Date().toISOString();
      const periodEnd = periodEndRaw
        ? new Date(periodEndRaw * 1000).toISOString()
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      const payload: Record<string, unknown> = {
        status,
        current_period_start: periodStart,
        current_period_end: periodEnd,
        cancel_at_period_end: subscription.cancel_at_period_end,
        updated_at: new Date().toISOString(),
      };

      if (status === "past_due") {
        // 7-day grace period after current_period_end
        const periodEndMs = periodEndRaw
          ? periodEndRaw * 1000
          : Date.now();
        payload.grace_period_end = new Date(
          periodEndMs + 7 * 24 * 60 * 60 * 1000
        ).toISOString();
      }

      if (subscription.cancel_at_period_end) {
        payload.cancelled_at = new Date().toISOString();
      }

      let query = supabase.from("agency_subscriptions").update(payload);
      if (dbId) {
        query = query.eq("id", dbId);
      } else {
        query = query.eq("stripe_subscription_id", subscription.id);
      }
      await query;
    }
  }

  if (event.type === "customer.subscription.deleted") {
    const subscription = event.data.object as Stripe.Subscription;
    await supabase
      .from("agency_subscriptions")
      .update({
        status: "expired",
        cancelled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("stripe_subscription_id", subscription.id);
  }

  // ── Seat reconciliation: adjust the extra-seat line item before each invoice ──
  //
  // Fires ~7 days before Stripe generates the next invoice. We compute the
  // current broker count and update the Stripe SubscriptionItem quantity if
  // it has drifted from what's currently billed. This is the "true up at
  // next invoice" mechanism — no instant proration on broker invite/remove,
  // but the upcoming invoice reflects reality.
  if (event.type === "invoice.upcoming") {
    const invoice = event.data.object as Stripe.Invoice;
    const rawSub = (invoice as unknown as Record<string, unknown>).subscription;
    const subscriptionId = typeof rawSub === "string" ? rawSub : null;
    if (subscriptionId) {
      await reconcileSeatsForSubscription(supabase, subscriptionId);
    }
  }

  if (event.type === "invoice.paid") {
    const invoice = event.data.object as Stripe.Invoice;
    // Extract subscription ID from invoice (handle different API shapes)
    const rawSub = (invoice as unknown as Record<string, unknown>).subscription;
    const subscriptionId = typeof rawSub === "string" ? rawSub : null;

    if (subscriptionId && invoice.billing_reason !== "subscription_create") {
      const { data: sub } = await supabase
        .from("agency_subscriptions")
        .select("id, agency_id")
        .eq("stripe_subscription_id", subscriptionId)
        .single();

      if (sub) {
        if (invoice.lines?.data?.[0]) {
          const line = invoice.lines.data[0];
          await supabase
            .from("agency_subscriptions")
            .update({
              status: "active",
              current_period_start: new Date(
                (line.period?.start ?? Date.now() / 1000) * 1000
              ).toISOString(),
              current_period_end: new Date(
                (line.period?.end ?? Date.now() / 1000) * 1000
              ).toISOString(),
              grace_period_end: null,
              updated_at: new Date().toISOString(),
            })
            .eq("id", sub.id);
        }

        const rawPi = (invoice as unknown as Record<string, unknown>).payment_intent;
        await supabase.from("payments").insert({
          agency_id: sub.agency_id,
          subscription_id: sub.id,
          amount: invoice.amount_paid,
          currency: invoice.currency,
          status: "paid",
          payment_type: "subscription",
          package_days: 30,
          paid_at: new Date().toISOString(),
          stripe_payment_intent: typeof rawPi === "string" ? rawPi : null,
        });
      }
    }
  }

  if (event.type === "invoice.payment_failed") {
    const invoice = event.data.object as Stripe.Invoice;
    const rawSub = (invoice as unknown as Record<string, unknown>).subscription;
    const subscriptionId = typeof rawSub === "string" ? rawSub : null;

    if (subscriptionId) {
      const { data: sub } = await supabase
        .from("agency_subscriptions")
        .select("id, current_period_end")
        .eq("stripe_subscription_id", subscriptionId)
        .single();

      if (sub) {
        const graceEnd = sub.current_period_end
          ? new Date(
              new Date(sub.current_period_end).getTime() +
                7 * 24 * 60 * 60 * 1000
            ).toISOString()
          : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

        await supabase
          .from("agency_subscriptions")
          .update({
            status: "past_due",
            grace_period_end: graceEnd,
            updated_at: new Date().toISOString(),
          })
          .eq("id", sub.id);
      }
    }
  }

  return NextResponse.json({ received: true });
}

// ── Helpers ──

function mapStripeSubStatus(
  stripeStatus: Stripe.Subscription.Status
): string {
  switch (stripeStatus) {
    case "active":
      return "active";
    case "trialing":
      return "trialing";
    case "past_due":
      return "past_due";
    case "canceled":
      return "cancelled";
    case "unpaid":
      return "expired";
    case "incomplete":
      return "pending";
    case "incomplete_expired":
      return "expired";
    case "paused":
      return "cancelled";
    default:
      return "expired";
  }
}

async function handleFeaturedPayment(
  supabase: ReturnType<typeof createServiceRoleClient>,
  session: Stripe.Checkout.Session
) {
  const paymentId = session.metadata?.payment_id;
  const listingId = session.metadata?.listing_id;
  const packageDays = Number(session.metadata?.package_days ?? 0);
  const scope =
    (session.metadata?.featured_scope as
      | "homepage"
      | "category"
      | "both"
      | undefined) ?? "homepage";

  if (!paymentId || !listingId || !packageDays) return;

  const amountTotal = session.amount_total ?? 0;

  await supabase
    .from("payments")
    .update({
      status: "paid",
      amount: amountTotal,
      stripe_payment_intent:
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : null,
      paid_at: new Date().toISOString(),
    })
    .eq("id", paymentId);

  await applyFeaturedToListing(supabase, listingId, packageDays, scope);
}

/**
 * Recompute the broker count for a Stripe subscription and update the
 * per-extra-seat line item's quantity in-place if it has drifted.
 *
 * Called by the `invoice.upcoming` handler so each new invoice bills the
 * agency's actual current headcount. Idempotent and safe to re-run.
 */
async function reconcileSeatsForSubscription(
  supabase: ReturnType<typeof createServiceRoleClient>,
  stripeSubscriptionId: string,
) {
  const { data: sub } = await supabase
    .from("agency_subscriptions")
    .select(
      "id, agency_id, quantity, included_seats_snapshot, extra_seat_stripe_item_id",
    )
    .eq("stripe_subscription_id", stripeSubscriptionId)
    .maybeSingle();
  if (!sub || !sub.agency_id) return;

  // Count accepted brokers — invitations don't count towards billing.
  const { count: currentSeats } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("agency_id", sub.agency_id);

  const seats = currentSeats ?? 0;
  const included = sub.included_seats_snapshot ?? 0;
  const extraSeats = Math.max(0, seats - included);

  // Always sync our `quantity` mirror so the admin UI / pricing helpers stay
  // accurate, even if there's no Stripe seat line item (flat plans).
  await supabase
    .from("agency_subscriptions")
    .update({ quantity: seats, updated_at: new Date().toISOString() })
    .eq("id", sub.id);

  // If this subscription doesn't have an extra-seat line item (flat plan, or
  // tiered plan with 0 extras at subscribe time), there's nothing to update
  // on Stripe's side — flat-line subscriptions ignore broker count.
  if (!sub.extra_seat_stripe_item_id) return;

  try {
    await stripe.subscriptionItems.update(sub.extra_seat_stripe_item_id, {
      quantity: extraSeats,
      proration_behavior: "none",
    });
  } catch (err) {
    console.error(
      "[webhook] Failed to reconcile seat quantity for subscription",
      stripeSubscriptionId,
      err,
    );
  }
}

async function handleSubscriptionPayment(
  supabase: ReturnType<typeof createServiceRoleClient>,
  paymentIntent: Stripe.PaymentIntent
) {
  const subscriptionDbId = paymentIntent.metadata?.subscription_db_id;
  const agencyId = paymentIntent.metadata?.agency_id;
  const productId = paymentIntent.metadata?.product_id;

  if (!subscriptionDbId) return;

  const now = new Date();
  const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  // Activate the subscription
  await supabase
    .from("agency_subscriptions")
    .update({
      status: "active",
      current_period_start: now.toISOString(),
      current_period_end: periodEnd.toISOString(),
      updated_at: now.toISOString(),
    })
    .eq("id", subscriptionDbId);

  // Set up Stripe recurring subscription for future auto-billing.
  //
  // The metadata stamped by create-subscription/route.ts gives us the
  // already-resolved (admin-override-aware) base price + per-seat price +
  // initial seat quantity. Using those snapshots instead of re-reading the
  // product means recurring charges respect per-agency overrides (a
  // pre-existing bug: overrides applied to the first PaymentIntent but
  // not the recurring Stripe sub).
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

    // Create Stripe customer (no payment method attached — will collect on first invoice)
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
      // Line 1: base price (covers the included seats).
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

      // Line 2 (optional): per-extra-seat price, quantity = brokers above the included count.
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

      // Create subscription with trial_end = 30 days from now (first month already paid).
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

      // Locate the extra-seat subscription item ID so the reconciler can
      // update its quantity later.
      let extraSeatItemId: string | null = null;
      if (extraSeatPrice) {
        const items = stripeSub.items?.data ?? [];
        for (const item of items) {
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
    // Subscription is activated regardless — agency has 30 days access
    // Admin can set up recurring billing manually via Stripe dashboard if this fails
    console.error("[webhook] Failed to set up Stripe recurring subscription:", err);
  }
}

