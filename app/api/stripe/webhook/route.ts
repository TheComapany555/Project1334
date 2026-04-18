import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import type Stripe from "stripe";

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
      await handleListingTierPayment(supabase, session.metadata);
    } else {
      // Legacy: featured listing payment (backward compatible)
      await handleFeaturedPayment(supabase, session);
    }
  }

  // ── Payment intent succeeded ──
  if (event.type === "payment_intent.succeeded") {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    const paymentType = paymentIntent.metadata?.payment_type;

    if (paymentType === "subscription") {
      await handleSubscriptionPayment(supabase, paymentIntent);
    } else if (paymentType === "listing_tier") {
      await handleListingTierPayment(supabase, paymentIntent.metadata);
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
 * Set scope-aware featured timestamps on a listing without clobbering an
 * existing scope. e.g. paying for "category" while "homepage" is still active
 * extends category only. is_featured is true if either scope is still active;
 * featured_until is the latest end date (legacy / analytics).
 */
async function applyFeaturedToListing(
  supabase: ReturnType<typeof createServiceRoleClient>,
  listingId: string,
  packageDays: number,
  scope: "homepage" | "category" | "both"
) {
  const now = new Date();

  const { data: listing } = await supabase
    .from("listings")
    .select(
      "featured_homepage_until, featured_category_until, featured_scope"
    )
    .eq("id", listingId)
    .single();

  // For each scope, extend from the later of (now, current scope expiry)
  const homepageBase =
    listing?.featured_homepage_until &&
    new Date(listing.featured_homepage_until) > now
      ? new Date(listing.featured_homepage_until)
      : now;
  const categoryBase =
    listing?.featured_category_until &&
    new Date(listing.featured_category_until) > now
      ? new Date(listing.featured_category_until)
      : now;

  const newHomepage = new Date(
    homepageBase.getTime() + packageDays * 24 * 60 * 60 * 1000
  );
  const newCategory = new Date(
    categoryBase.getTime() + packageDays * 24 * 60 * 60 * 1000
  );

  const payload: Record<string, unknown> = {
    featured_from: now.toISOString(),
    featured_package_days: packageDays,
    featured_scope: scope,
  };

  if (scope === "homepage") {
    payload.featured_homepage_until = newHomepage.toISOString();
  } else if (scope === "category") {
    payload.featured_category_until = newCategory.toISOString();
  } else {
    payload.featured_homepage_until = newHomepage.toISOString();
    payload.featured_category_until = newCategory.toISOString();
  }

  const finalHp =
    scope === "homepage" || scope === "both"
      ? newHomepage.toISOString()
      : listing?.featured_homepage_until ?? null;
  const finalCat =
    scope === "category" || scope === "both"
      ? newCategory.toISOString()
      : listing?.featured_category_until ?? null;

  const hpMs = finalHp ? new Date(finalHp).getTime() : 0;
  const catMs = finalCat ? new Date(finalCat).getTime() : 0;
  payload.is_featured = hpMs > now.getTime() || catMs > now.getTime();
  const stampTimes = [hpMs, catMs].filter((t) => t > 0);
  payload.featured_until =
    stampTimes.length > 0
      ? new Date(Math.max(...stampTimes)).toISOString()
      : null;

  await supabase.from("listings").update(payload).eq("id", listingId);
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

  // Set up Stripe recurring subscription for future auto-billing
  try {
    const agencyEmail = paymentIntent.metadata?.agency_email;
    const agencyName = paymentIntent.metadata?.agency_name;

    // Create Stripe customer (no payment method attached — will collect on first invoice)
    const customer = await stripe.customers.create({
      email: agencyEmail || undefined,
      name: agencyName || undefined,
      metadata: { agency_id: agencyId ?? "" },
    });

    // Get the subscription product to create a recurring price
    const { data: product } = await supabase
      .from("products")
      .select("*")
      .eq("id", productId)
      .single();

    if (product) {
      const stripePrice = await stripe.prices.create({
        currency: product.currency,
        unit_amount: product.price,
        recurring: { interval: "month" },
        product_data: {
          name: product.name,
          metadata: { product_id: product.id },
        },
      });

      // Create subscription with trial_end = 30 days from now (first month already paid)
      // When the trial ends, Stripe will send an invoice and collect payment
      const trialEnd = Math.floor(periodEnd.getTime() / 1000);
      const stripeSub = await stripe.subscriptions.create({
        customer: customer.id,
        items: [{ price: stripePrice.id }],
        trial_end: trialEnd,
        payment_settings: {
          save_default_payment_method: "on_subscription",
        },
        metadata: {
          agency_id: agencyId ?? "",
          subscription_db_id: subscriptionDbId,
        },
      });

      // Update DB with Stripe references
      await supabase
        .from("agency_subscriptions")
        .update({
          stripe_customer_id: customer.id,
          stripe_subscription_id: stripeSub.id,
          stripe_price_id: stripePrice.id,
        })
        .eq("id", subscriptionDbId);
    }
  } catch (err) {
    // Subscription is activated regardless — agency has 30 days access
    // Admin can set up recurring billing manually via Stripe dashboard if this fails
    console.error("[webhook] Failed to set up Stripe recurring subscription:", err);
  }
}

async function handleListingTierPayment(
  supabase: ReturnType<typeof createServiceRoleClient>,
  metadata: Record<string, string> | null | undefined
) {
  if (!metadata) return;

  const paymentId = metadata.payment_id;
  const listingId = metadata.listing_id;
  const listingTier = metadata.listing_tier || "standard";
  const packageDays = Number(metadata.package_days ?? 0);

  if (paymentId) {
    await supabase
      .from("payments")
      .update({ status: "paid", paid_at: new Date().toISOString() })
      .eq("id", paymentId);
  }

  if (listingId) {
    const now = new Date();

    // Check if listing was already published before — don't overwrite published_at
    const { data: existingListing } = await supabase
      .from("listings")
      .select("published_at")
      .eq("id", listingId)
      .single();

    const payload: Record<string, unknown> = {
      listing_tier: listingTier,
      tier_paid_at: now.toISOString(),
      status: "published",
      published_at: existingListing?.published_at ?? now.toISOString(),
    };

    await supabase.from("listings").update(payload).eq("id", listingId);

    // If the tier is 'featured', also apply scope-aware featured fields
    if (listingTier === "featured" && packageDays > 0) {
      const scope =
        (metadata.featured_scope as "homepage" | "category" | "both" | undefined) ??
        "homepage";
      await applyFeaturedToListing(supabase, listingId, packageDays, scope);
    }
  }
}
