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

  // Look up product from database (only listing-related product types)
  const { data: product } = await supabase
    .from("products")
    .select("*")
    .eq("id", productId)
    .eq("status", "active")
    .in("product_type", ["featured", "listing_tier"])
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
    .select("id, title, broker_id, agency_id, category_id")
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

  // Resolve scope:
  // - For 'featured' products use the product's scope (defaults to 'homepage' for legacy rows)
  // - For 'listing_tier' products there's no scope; webhook will apply legacy behaviour
  const featuredScope =
    product.product_type === "featured"
      ? (product.scope ?? "homepage")
      : null;

  // If the product is category-scoped, the category must match the listing's
  // category. (admin enforces this at product setup; double-check here.)
  if (
    product.product_type === "featured" &&
    product.category_id &&
    product.category_id !== listing.category_id
  ) {
    return NextResponse.json(
      { error: "This featured package is not available for this listing's category." },
      { status: 400 }
    );
  }

  const featuredCategoryId =
    product.product_type === "featured" &&
    (product.scope === "category" || product.scope === "both")
      ? listing.category_id
      : null;

  // Create payment record with product + scope reference
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
      featured_scope: featuredScope,
      featured_category_id: featuredCategoryId,
    })
    .select("id")
    .single();

  if (paymentError) {
    return NextResponse.json(
      { error: "Failed to create payment" },
      { status: 500 }
    );
  }

  // Create Stripe checkout session using price_data (no Stripe Products needed)
  const origin = req.nextUrl.origin;
  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: product.currency,
          unit_amount: product.price,
          product_data: {
            name: product.name,
            description: product.description || undefined,
          },
        },
        quantity: 1,
      },
    ],
    metadata: {
      payment_id: payment.id,
      listing_id: listingId,
      product_id: productId,
      package_days: String(product.duration_days ?? 0),
      ...(featuredScope ? { featured_scope: featuredScope } : {}),
      ...(featuredCategoryId
        ? { featured_category_id: featuredCategoryId }
        : {}),
    },
    success_url: `${origin}/dashboard/payments?success=true&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/dashboard/listings?cancelled=true`,
  });

  // Update payment with stripe session ID
  await supabase
    .from("payments")
    .update({ stripe_session_id: checkoutSession.id })
    .eq("id", payment.id);

  return NextResponse.json({ url: checkoutSession.url });
}
