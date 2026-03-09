import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { createServiceRoleClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "broker") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { listingId, productId } = body as {
    listingId: string;
    productId: string;
  };

  if (!listingId || !productId) {
    return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
  }

  const supabase = createServiceRoleClient();
  const userId = session.user.id;
  const agencyId = session.user.agencyId ?? null;
  const agencyRole = session.user.agencyRole ?? null;

  // Look up product from database
  const { data: product } = await supabase
    .from("products")
    .select("*")
    .eq("id", productId)
    .eq("status", "active")
    .single();

  if (!product) {
    return NextResponse.json(
      { error: "Product not found or inactive" },
      { status: 400 }
    );
  }

  // Verify listing ownership
  let query = supabase
    .from("listings")
    .select("id, title, broker_id, agency_id")
    .eq("id", listingId);

  if (agencyId && agencyRole === "owner") {
    query = query.eq("agency_id", agencyId);
  } else {
    query = query.eq("broker_id", userId);
  }

  const { data: listing } = await query.single();
  if (!listing) {
    return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  }

  // Create payment record
  const { data: payment, error: paymentError } = await supabase
    .from("payments")
    .insert({
      broker_id: agencyId && agencyRole === "owner" ? null : userId,
      agency_id: agencyId && agencyRole === "owner" ? agencyId : null,
      listing_id: listingId,
      product_id: productId,
      package_days: product.duration_days ?? 0,
      amount: product.price,
      currency: product.currency,
      status: "pending",
    })
    .select("id")
    .single();

  if (paymentError) {
    console.error("[create-payment-intent] DB error:", paymentError);
    return NextResponse.json(
      { error: "Failed to create payment" },
      { status: 500 }
    );
  }

  // Create Stripe PaymentIntent
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: product.price,
      currency: product.currency,
      metadata: {
        payment_id: payment.id,
        listing_id: listingId,
        product_id: productId,
        package_days: String(product.duration_days ?? 0),
      },
      automatic_payment_methods: { enabled: true },
    });

    // Store payment intent ID on our record
    await supabase
      .from("payments")
      .update({ stripe_payment_intent: paymentIntent.id })
      .eq("id", payment.id);

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentId: payment.id,
    });
  } catch (err) {
    console.error("[create-payment-intent] Stripe error:", err);
    // Clean up the pending payment record
    await supabase.from("payments").delete().eq("id", payment.id);
    return NextResponse.json(
      { error: "Failed to initialize payment" },
      { status: 500 }
    );
  }
}
