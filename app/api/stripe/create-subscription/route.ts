import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { resolveProductPrice } from "@/lib/actions/products";

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
  const { productId } = body as { productId: string };
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

    // Resolve agency-specific pricing (custom override or default)
    const resolved = await resolveProductPrice(productId, agencyId);
    const finalPrice = resolved?.price ?? product.price;
    const finalCurrency = resolved?.currency ?? product.currency;

    // Use the same PaymentIntent approach as featured listings
    const paymentIntent = await stripe.paymentIntents.create({
      amount: finalPrice,
      currency: finalCurrency,
      automatic_payment_methods: { enabled: true },
      metadata: {
        payment_type: "subscription",
        agency_id: agencyId,
        subscription_db_id: subRecordId,
        product_id: productId,
        agency_name: agency?.name ?? "",
        agency_email: agency?.email ?? session.user.email ?? "",
      },
    });

    // Store the payment intent ID on the subscription record
    await supabase
      .from("agency_subscriptions")
      .update({ stripe_payment_intent: paymentIntent.id })
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
