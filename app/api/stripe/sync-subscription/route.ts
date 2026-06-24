import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { syncSubscriptionById } from "@/lib/payments/activate-subscription";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "broker") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const agencyId = session.user.agencyId;
  const agencyRole = session.user.agencyRole;
  if (!agencyId || agencyRole !== "owner") {
    return NextResponse.json(
      { error: "Only agency owners can sync subscriptions" },
      { status: 403 },
    );
  }

  const body = (await req.json()) as { subscriptionId?: string };
  if (!body.subscriptionId) {
    return NextResponse.json({ error: "subscriptionId required" }, { status: 400 });
  }

  const supabase = createServiceRoleClient();
  const { data: sub } = await supabase
    .from("agency_subscriptions")
    .select("id, agency_id")
    .eq("id", body.subscriptionId)
    .single();

  if (!sub || sub.agency_id !== agencyId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const result = await syncSubscriptionById(supabase, body.subscriptionId);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({
      ok: true,
      alreadyActive: result.alreadyActive ?? false,
    });
  } catch (err) {
    console.error("[sync-subscription]", err);
    return NextResponse.json({ error: "Failed to sync subscription" }, { status: 500 });
  }
}
