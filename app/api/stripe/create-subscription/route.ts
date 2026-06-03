import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { quoteAgencyPlan } from "@/lib/actions/subscription-pricing";
import { validateSubscriptionDiscount } from "@/lib/actions/discount-codes";

/** Stripe's minimum chargeable amount (~$0.50 in AUD/USD), in cents. */
const STRIPE_MIN_CHARGE_CENTS = 50;

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "broker") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const agencyId = session.user.agencyId;
  const agencyRole = session.user.agencyRole;
  if (!agencyId || agencyRole !== "owner") {
    return NextResponse.json(
      { error: "Only agency owners can manage subscriptions" },
      { status: 403 }
    );
  }

  const body = await req.json();
  const { productId, discountCode } = body as {
    productId: string;
    discountCode?: string;
  };
  if (!productId) {
    return NextResponse.json({ error: "Product ID required" }, { status: 400 });
  }

  const supabase = createServiceRoleClient();

  // Look up subscription product
  const { data: product } = await supabase
    .from("products")
    .select("*")
    .eq("id", productId)
    .eq("status", "active")
    .eq("product_type", "subscription")
    .single();

  if (!product) {
    return NextResponse.json(
      { error: "Subscription plan not found" },
      { status: 400 }
    );
  }

  // Check for existing active subscription
  const { data: existingSub } = await supabase
    .from("agency_subscriptions")
    .select("id")
    .eq("agency_id", agencyId)
    .in("status", ["active", "trialing", "past_due"])
    .limit(1)
    .single();

  if (existingSub) {
    return NextResponse.json(
      { error: "Agency already has an active subscription" },
      { status: 400 }
    );
  }

  // Clean up any old non-active subscriptions for this agency
  await supabase
    .from("agency_subscriptions")
    .delete()
    .eq("agency_id", agencyId)
    .in("status", ["pending", "expired", "cancelled"]);

  // Get agency info
  const { data: agency } = await supabase
    .from("agencies")
    .select("name, email")
    .eq("id", agencyId)
    .single();

  try {
    // Try to insert a pending subscription record. If one already exists (race condition),
    // reuse it instead of failing.
    let subRecordId: string;
    const { data: subRecord, error: subError } = await supabase
      .from("agency_subscriptions")
      .insert({
        agency_id: agencyId,
        plan_product_id: productId,
        status: "pending",
      })
      .select("id")
      .single();

    if (subError) {
      // Unique constraint violation — a pending row already exists, reuse it
      const { data: existingPending } = await supabase
        .from("agency_subscriptions")
        .select("id")
        .eq("agency_id", agencyId)
        .eq("status", "pending")
        .single();

      if (existingPending) {
        subRecordId = existingPending.id;
      } else {
        console.error("[create-subscription] DB insert error:", subError.message);
        return NextResponse.json(
          { error: "Failed to create subscription record" },
          { status: 500 }
        );
      }
    } else {
      subRecordId = subRecord.id;
    }

    // Resolve agency-specific pricing using the unified quote helper.
    // Returns base price + per-seat overage based on current broker count,
    // with admin overrides applied.
    const quote = await quoteAgencyPlan(agencyId, productId);
    if (!quote) {
      return NextResponse.json(
        { error: "Failed to price subscription plan" },
        { status: 500 },
      );
    }

    // First-month charge = base + any extra-seat overage at sign-up time.
    // A discount code (if supplied + valid) reduces this first month's agency
    // fee. Ongoing/bespoke deals are handled via per-agency pricing overrides,
    // so the recurring Stripe sub created in the webhook stays at full price.
    let firstChargeCents = quote.monthly_total_cents;
    let discountCodeId: string | null = null;
    let discountAmountCents = 0;

    if (discountCode?.trim()) {
      const result = await validateSubscriptionDiscount({
        code: discountCode.trim(),
        productId,
      });
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      if (result.is_free || result.final_amount < STRIPE_MIN_CHARGE_CENTS) {
        // Can't charge $0 (or sub-minimum) on a card. Route fully-comped /
        // near-free deals through admin activation or invoicing instead.
        return NextResponse.json(
          {
            error:
              "This code brings the first month below the minimum card charge. " +
              "Use “Request invoice” or contact sales — an admin will activate your account.",
          },
          { status: 400 },
        );
      }
      firstChargeCents = result.final_amount;
      discountCodeId = result.code?.id ?? null;
      discountAmountCents = result.discount_amount;
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: firstChargeCents,
      currency: quote.currency,
      automatic_payment_methods: { enabled: true },
      metadata: {
        payment_type: "subscription",
        agency_id: agencyId,
        subscription_db_id: subRecordId,
        product_id: productId,
        agency_name: agency?.name ?? "",
        agency_email: agency?.email ?? session.user.email ?? "",
        // Snapshots so the webhook can construct the recurring Stripe sub
        // with the right line items + quantities.
        pricing_model: quote.pricing_model,
        included_seats: String(quote.included_seats ?? 0),
        extra_seat_price: String(quote.extra_seat_price_cents ?? 0),
        seat_quantity: String(quote.current_seats),
        base_price_cents: String(quote.base_price_cents),
        // Discount applied to this first month (webhook increments usage).
        ...(discountCodeId
          ? {
              discount_code_id: discountCodeId,
              discount_amount: String(discountAmountCents),
              original_amount: String(quote.monthly_total_cents),
            }
          : {}),
      },
    });

    // Persist snapshots on the subscription row so billing is stable even if
    // an admin edits the plan's pricing later. Quantity is the broker count
    // we're billing for this period; it gets reconciled at each invoice cycle.
    await supabase
      .from("agency_subscriptions")
      .update({
        stripe_payment_intent: paymentIntent.id,
        quantity: quote.current_seats,
        included_seats_snapshot: quote.included_seats,
        extra_seat_price_snapshot: quote.extra_seat_price_cents,
      })
      .eq("id", subRecordId);

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      subscriptionId: subRecordId,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[create-subscription] Error:", message);
    return NextResponse.json(
      { error: message || "Failed to create subscription" },
      { status: 500 }
    );
  }
}
