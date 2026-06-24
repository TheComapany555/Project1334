import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { syncPaymentById } from "@/lib/payments/sync-payment";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "broker") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as { paymentId?: string };
  if (!body.paymentId) {
    return NextResponse.json({ error: "paymentId required" }, { status: 400 });
  }

  const supabase = createServiceRoleClient();
  const userId = session.user.id;
  const agencyId = session.user.agencyId ?? null;
  const agencyRole = session.user.agencyRole ?? null;

  const { data: payment } = await supabase
    .from("payments")
    .select("id, broker_id, agency_id")
    .eq("id", body.paymentId)
    .single();

  if (!payment) {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  }

  const owned =
    payment.broker_id === userId ||
    (agencyId && agencyRole === "owner" && payment.agency_id === agencyId);
  if (!owned) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const result = await syncPaymentById(supabase, body.paymentId);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({
      ok: true,
      alreadyPaid: result.alreadyPaid ?? false,
    });
  } catch (err) {
    console.error("[sync-payment]", err);
    return NextResponse.json({ error: "Failed to sync payment" }, { status: 500 });
  }
}
