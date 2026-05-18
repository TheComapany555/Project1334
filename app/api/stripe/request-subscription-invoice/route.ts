import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { quoteAgencyPlan } from "@/lib/actions/subscription-pricing";
import { Resend } from "resend";
import { invoiceRequestedAdminEmail } from "@/lib/email-templates";
import { notifyAdmins } from "@/lib/actions/notifications";

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

  // Resolve agency pricing including per-seat overage (uses snapshots so the
  // invoice amount is locked at request-time even if seat count changes
  // before admin approves).
  const quote = await quoteAgencyPlan(agencyId, productId);
  if (!quote) {
    return NextResponse.json(
      { error: "Failed to price subscription plan" },
      { status: 500 },
    );
  }
  const finalPrice = quote.monthly_total_cents;
  const finalCurrency = quote.currency;

  // Create a pending subscription record with the seat snapshot so admin
  // knows what the agency was sized for at request time.
  const { data: subRecord, error: subError } = await supabase
    .from("agency_subscriptions")
    .insert({
      agency_id: agencyId,
      plan_product_id: productId,
      status: "pending",
      quantity: quote.current_seats,
      included_seats_snapshot: quote.included_seats,
      extra_seat_price_snapshot: quote.extra_seat_price_cents,
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

  const { data: agency } = await supabase
    .from("agencies")
    .select("name")
    .eq("id", agencyId)
    .single();

  // Send admin notification email
  try {
    const fmt = (cents: number) =>
      new Intl.NumberFormat("en-AU", {
        style: "currency",
        currency: finalCurrency.toUpperCase(),
        minimumFractionDigits: 2,
      }).format(cents / 100);

    // Build a per-seat breakdown line for tiered plans so admin knows how
    // the total was calculated.
    let breakdown: string | null = null;
    if (quote.pricing_model === "tiered_seats") {
      const basePart = `${fmt(quote.base_price_cents)} base (${quote.included_seats} included)`;
      if (quote.extra_seats > 0 && quote.extra_seat_price_cents) {
        const extraTotal = quote.extra_seats * quote.extra_seat_price_cents;
        breakdown = `${basePart} + ${quote.extra_seats} extra × ${fmt(quote.extra_seat_price_cents)} = ${fmt(quote.base_price_cents + extraTotal)}`;
      } else {
        breakdown = `${basePart} — no overage (${quote.current_seats} broker${quote.current_seats === 1 ? "" : "s"})`;
      }
    }

    const { data: admins } = await supabase
      .from("profiles")
      .select("id, users!inner(email)")
      .eq("role", "admin");

    const adminList = (admins ?? []) as unknown as { id: string; users: { email: string } }[];
    const adminEmails = adminList.map((a) => a.users.email).filter(Boolean);

    if (adminEmails.length > 0) {
      await resend.emails.send({
        from: EMAIL_FROM,
        to: adminEmails,
        subject: `Subscription Invoice Request: ${agency?.name ?? "Agency"} — ${product.name}`,
        html: invoiceRequestedAdminEmail({
          agencyName: agency?.name ?? "Agency",
          listingTitle: product.name,
          productName: product.name,
          amount: `${fmt(finalPrice)} ${finalCurrency.toUpperCase()}`,
          breakdown,
          notes: notes?.trim() || null,
          adminUrl: `${APP_URL}/admin/payments`,
        }),
      });
    }
  } catch (emailErr) {
    console.error("[request-subscription-invoice] Email error:", emailErr);
  }

  // In-app notification for admins
  notifyAdmins({
    type: "invoice_requested",
    title: "New subscription invoice request",
    message: `${agency?.name ?? "An agency"} requested an invoice for ${product.name}`,
    link: "/admin/subscriptions",
  }).catch(() => {});

  return NextResponse.json({ ok: true, paymentId: payment.id });
}
