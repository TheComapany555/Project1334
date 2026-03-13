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

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const paymentId = session.metadata?.payment_id;
    const listingId = session.metadata?.listing_id;
    const packageDays = Number(session.metadata?.package_days ?? 0);

    if (!paymentId || !listingId || !packageDays) {
      return NextResponse.json({ error: "Missing metadata" }, { status: 400 });
    }

    const amountTotal = session.amount_total ?? 0;

    // Update payment record
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

    // Update listing featured status
    const now = new Date();
    const featuredUntil = new Date(
      now.getTime() + packageDays * 24 * 60 * 60 * 1000
    );

    await supabase
      .from("listings")
      .update({
        is_featured: true,
        featured_from: now.toISOString(),
        featured_until: featuredUntil.toISOString(),
        featured_package_days: packageDays,
      })
      .eq("id", listingId);
  }

  if (event.type === "payment_intent.succeeded") {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    const paymentId = paymentIntent.metadata?.payment_id;
    const listingId = paymentIntent.metadata?.listing_id;
    const packageDays = Number(paymentIntent.metadata?.package_days ?? 0);

    if (paymentId && listingId && packageDays) {
      // Full activation flow (in-app checkout via PaymentIntent)
      await supabase
        .from("payments")
        .update({
          status: "paid",
          paid_at: new Date().toISOString(),
        })
        .eq("id", paymentId);

      const now = new Date();
      const featuredUntil = new Date(
        now.getTime() + packageDays * 24 * 60 * 60 * 1000
      );

      await supabase
        .from("listings")
        .update({
          is_featured: true,
          featured_from: now.toISOString(),
          featured_until: featuredUntil.toISOString(),
          featured_package_days: packageDays,
        })
        .eq("id", listingId);
    } else {
      // Fallback: update any pending payment matching this intent
      await supabase
        .from("payments")
        .update({ status: "paid", paid_at: new Date().toISOString() })
        .eq("stripe_payment_intent", paymentIntent.id)
        .eq("status", "pending");
    }
  }

  return NextResponse.json({ received: true });
}
