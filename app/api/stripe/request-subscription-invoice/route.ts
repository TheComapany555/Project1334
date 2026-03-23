import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { resolveProductPrice } from "@/lib/actions/products";
import { Resend } from "resend";
import { invoiceRequestedAdminEmail } from "@/lib/email-templates";

const resend = new Resend(process.env.RESEND_API_KEY);
const EMAIL_FROM = process.env.EMAIL_FROM ?? "Salebiz <noreply@salebiz.com.au>";
const APP_URL = process.env.NEXTAUTH_URL ?? "https://salebiz.com.au";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "broker") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const agencyId = session.user.agencyId;
  const agencyRole = session.user.agencyRole;
  if (!agencyId || agencyRole !== "owner") {
    return NextResponse.json(
      { error: "Only agency owners can request invoices" },
      { status: 403 }
    );
  }

  const body = await req.json();
  const { productId, notes } = body as { productId: string; notes?: string };
  if (!productId) {
    return NextResponse.json({ error: "Product ID required" }, { status: 400 });
  }

  const supabase = createServiceRoleClient();

  // Look up product
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

  // Resolve agency pricing
  const resolved = await resolveProductPrice(productId, agencyId);
  const finalPrice = resolved?.price ?? product.price;
  const finalCurrency = resolved?.currency ?? product.currency;

  // Create a pending subscription record
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
    return NextResponse.json(
      { error: "Failed to create subscription record" },
      { status: 500 }
    );
  }

  // Create an invoiced payment record
  const { data: payment, error: paymentError } = await supabase
    .from("payments")
    .insert({
      agency_id: agencyId,
      product_id: productId,
      package_days: product.duration_days ?? 30,
      amount: finalPrice,
      currency: finalCurrency,
      status: "invoiced",
      payment_type: "subscription",
      subscription_id: subRecord.id,
      invoice_requested: true,
      invoice_requested_at: new Date().toISOString(),
      invoice_notes: notes?.trim() || null,
    })
    .select("id")
    .single();

  if (paymentError) {
    console.error("[request-subscription-invoice] DB error:", paymentError);
    return NextResponse.json(
      { error: "Failed to create invoice request" },
      { status: 500 }
    );
  }

  // Send admin notification email
  try {
    const { data: agency } = await supabase
      .from("agencies")
      .select("name")
      .eq("id", agencyId)
      .single();

    const formattedAmount = new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: finalCurrency.toUpperCase(),
      minimumFractionDigits: 2,
    }).format(finalPrice / 100);

    const { data: admins } = await supabase
      .from("users")
      .select("email")
      .eq("role", "admin");

    const adminEmails = (admins ?? []).map((a) => a.email).filter(Boolean);

    if (adminEmails.length > 0) {
      await resend.emails.send({
        from: EMAIL_FROM,
        to: adminEmails,
        subject: `Subscription Invoice Request: ${agency?.name ?? "Agency"}`,
        html: invoiceRequestedAdminEmail({
          agencyName: agency?.name ?? "Agency",
          listingTitle: "Agency Monthly Subscription",
          productName: product.name,
          amount: `${formattedAmount} ${finalCurrency.toUpperCase()}`,
          notes: notes?.trim() || null,
          adminUrl: `${APP_URL}/admin/payments`,
        }),
      });
    }
  } catch (emailErr) {
    console.error("[request-subscription-invoice] Email error:", emailErr);
  }

  return NextResponse.json({ ok: true, paymentId: payment.id });
}
