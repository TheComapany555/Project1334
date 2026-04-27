import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { resolveProductPrice } from "@/lib/actions/products";
import { validateDiscountCode } from "@/lib/actions/discount-codes";
import {
  ensureStripeCoupon,
  invalidateStripeCoupon,
} from "@/lib/payments/stripe-coupons";

/**
 * Create a Stripe Checkout Session at the original product price with an
 * optional Stripe Coupon attached. Stripe processes the discount on its end —
 * 100% off is allowed natively (no $0 PaymentIntent needed) and the redemption
 * shows up on the Stripe dashboard with the coupon line item.
 *
 * The webhook handles `checkout.session.completed` to mark the payment paid
 * and apply the listing benefits (featured timestamps / tier publish).
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "broker") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const {
    listingId,
    productId,
    paymentType = "featured",
    couponCode,
  } = body as {
    listingId: string;
    productId: string;
    paymentType?: "featured" | "listing_tier";
    couponCode?: string;
  };

  if (!listingId || !productId) {
    return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
  }

  const supabase = createServiceRoleClient();
  const userId = session.user.id;
  const agencyId = session.user.agencyId ?? null;
  const agencyRole = session.user.agencyRole ?? null;

  // Look up product
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

  // Resolve agency-specific price (custom override or default)
  const resolved = await resolveProductPrice(productId, agencyId);
  const basePrice = resolved?.price ?? product.price;
  const finalCurrency = resolved?.currency ?? product.currency;

  // Resolve discount code (server-side re-validation; never trust client)
  let discountCodeId: string | null = null;
  let discountAmount = 0;
  let stripeCouponId: string | null = null;
  let finalPrice = basePrice;

  if (couponCode) {
    const validation = await validateDiscountCode({
      code: couponCode,
      productId,
      agencyId,
    });
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }
    discountCodeId = validation.code.id;
    discountAmount = validation.discount_amount;
    finalPrice = validation.final_amount;

    // Sync the matching Stripe Coupon (lazy-create / verify)
    const { data: codeRow } = await supabase
      .from("discount_codes")
      .select("*")
      .eq("id", discountCodeId)
      .single();
    if (!codeRow) {
      return NextResponse.json(
        { error: "Discount code not available." },
        { status: 400 }
      );
    }
    try {
      stripeCouponId = await ensureStripeCoupon(codeRow);
    } catch (err) {
      console.error("[create-checkout-session] Coupon sync failed:", err);
      return NextResponse.json(
        { error: "Couldn't apply discount. Please try again." },
        { status: 500 }
      );
    }
  }

  // Determine listing tier for tier flow
  let listingTier: string | undefined;
  if (paymentType === "listing_tier") {
    const { data: listingData } = await supabase
      .from("listings")
      .select("listing_tier")
      .eq("id", listingId)
      .single();
    listingTier = listingData?.listing_tier ?? "standard";
  }

  // Featured-scope (legacy/featured products carry a scope)
  const featuredScope =
    product.product_type === "featured"
      ? (product.scope ?? "homepage")
      : null;
  const featuredCategoryId =
    product.product_type === "featured" &&
    (product.scope === "category" || product.scope === "both")
      ? listing.category_id
      : null;

  // Create payment row tracking the discounted total Stripe will collect.
  const { data: payment, error: paymentError } = await supabase
    .from("payments")
    .insert({
      broker_id: agencyId && agencyRole === "owner" ? null : userId,
      agency_id: agencyId && agencyRole === "owner" ? agencyId : null,
      listing_id: listingId,
      product_id: productId,
      package_days: product.duration_days ?? 0,
      amount: finalPrice,
      original_amount: basePrice,
      discount_amount: discountAmount || null,
      discount_code_id: discountCodeId,
      currency: finalCurrency,
      status: "pending",
      payment_type: paymentType,
      featured_scope: featuredScope,
      featured_category_id: featuredCategoryId,
    })
    .select("id")
    .single();

  if (paymentError) {
    console.error("[create-checkout-session] DB error:", paymentError);
    return NextResponse.json(
      { error: "Failed to create payment" },
      { status: 500 }
    );
  }

  // Build Stripe Checkout Session
  const origin = req.nextUrl.origin;
  const metadata: Record<string, string> = {
    payment_id: payment.id,
    listing_id: listingId,
    product_id: productId,
    package_days: String(product.duration_days ?? 0),
    payment_type: paymentType,
  };
  if (listingTier) metadata.listing_tier = listingTier;
  if (discountCodeId) metadata.discount_code_id = discountCodeId;
  if (featuredScope) metadata.featured_scope = featuredScope;
  if (featuredCategoryId) metadata.featured_category_id = featuredCategoryId;

  try {
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "payment",
      // Use base (pre-discount) price so Stripe shows the coupon as a separate
      // line item on the dashboard.
      line_items: [
        {
          price_data: {
            currency: finalCurrency,
            unit_amount: basePrice,
            product_data: {
              name: product.name,
              description: product.description || undefined,
            },
          },
          quantity: 1,
        },
      ],
      ...(stripeCouponId
        ? { discounts: [{ coupon: stripeCouponId }] }
        : { allow_promotion_codes: false }),
      metadata,
      success_url: `${origin}/dashboard/payments?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/dashboard/listings?cancelled=true`,
    });

    await supabase
      .from("payments")
      .update({ stripe_session_id: checkoutSession.id })
      .eq("id", payment.id);

    if (!checkoutSession.url) {
      return NextResponse.json(
        { error: "Stripe did not return a checkout URL" },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: checkoutSession.url });
  } catch (err) {
    console.error("[create-checkout-session] Stripe error:", err);

    // If Stripe rejected the coupon (deleted out from under us, etc.),
    // invalidate the cached ID so the next attempt re-creates it.
    const message = err instanceof Error ? err.message : "";
    if (discountCodeId && /coupon|discount/i.test(message)) {
      await invalidateStripeCoupon(discountCodeId);
    }

    await supabase.from("payments").delete().eq("id", payment.id);
    return NextResponse.json(
      { error: "Failed to start checkout. Please try again." },
      { status: 500 }
    );
  }
}
