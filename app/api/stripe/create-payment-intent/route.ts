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
  const { listingId, productId, paymentType = "featured" } = body as {
    listingId: string;
    productId: string;
    paymentType?: "featured" | "listing_tier";
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
      payment_type: paymentType,
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
    const metadata: Record<string, string> = {
      payment_id: payment.id,
      listing_id: listingId,
      product_id: productId,
      package_days: String(product.duration_days ?? 0),
      payment_type: paymentType,
    };

    // For listing tier payments, determine tier from the listing's current tier
    if (paymentType === "listing_tier") {
      // Read the listing's tier directly from the database (set at creation/edit time)
      const { data: listingData } = await supabase
        .from("listings")
        .select("listing_tier")
        .eq("id", listingId)
        .single();
      metadata.listing_tier = listingData?.listing_tier ?? "standard";
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: product.price,
      currency: product.currency,
      metadata,
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
