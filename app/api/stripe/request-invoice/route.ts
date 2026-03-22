import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { resolveProductPrice } from "@/lib/actions/products";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "broker") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { listingId, productId, paymentType = "featured", notes } = body as {
    listingId: string;
    productId: string;
    paymentType?: "featured" | "listing_tier";
    notes?: string;
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
    .single();

  if (!product) {
    return NextResponse.json(
      { error: "Product not found or inactive" },
      { status: 400 }
    );
  }

  // Resolve agency-specific pricing
  const resolved = await resolveProductPrice(productId, agencyId);
  const finalPrice = resolved?.price ?? product.price;
  const finalCurrency = resolved?.currency ?? product.currency;

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

  // Create payment record with status "invoiced"
  const { data: payment, error: paymentError } = await supabase
    .from("payments")
    .insert({
      broker_id: agencyId && agencyRole === "owner" ? null : userId,
      agency_id: agencyId && agencyRole === "owner" ? agencyId : null,
      listing_id: listingId,
      product_id: productId,
      package_days: product.duration_days ?? 0,
      amount: finalPrice,
      currency: finalCurrency,
      status: "invoiced",
      payment_type: paymentType,
      invoice_requested: true,
      invoice_requested_at: new Date().toISOString(),
      invoice_notes: notes?.trim() || null,
    })
    .select("id")
    .single();

  if (paymentError) {
    console.error("[request-invoice] DB error:", paymentError);
    return NextResponse.json(
      { error: "Failed to create invoice request" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    paymentId: payment.id,
  });
}
