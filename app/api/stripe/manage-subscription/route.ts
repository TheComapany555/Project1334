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

  const agencyId = session.user.agencyId;
  const agencyRole = session.user.agencyRole;
  if (!agencyId || agencyRole !== "owner") {
    return NextResponse.json(
      { error: "Only agency owners can manage subscriptions" },
      { status: 403 }
    );
  }

  const supabase = createServiceRoleClient();

  // Get subscription with Stripe customer ID
  const { data: sub } = await supabase
    .from("agency_subscriptions")
    .select("stripe_customer_id")
    .eq("agency_id", agencyId)
    .in("status", ["active", "trialing", "past_due"])
    .limit(1)
    .single();

  if (!sub?.stripe_customer_id) {
    return NextResponse.json(
      { error: "No active subscription found" },
      { status: 400 }
    );
  }

  const origin =
    req.headers.get("origin") ||
    process.env.NEXTAUTH_URL ||
    "http://localhost:3000";

  try {
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: sub.stripe_customer_id,
      return_url: `${origin}/dashboard/subscribe`,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (err) {
    console.error("[manage-subscription] Stripe error:", err);
    return NextResponse.json(
      { error: "Failed to create portal session" },
      { status: 500 }
    );
  }
}
