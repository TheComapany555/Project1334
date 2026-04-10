import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { getSession } from "@/lib/auth-client";

// POST /api/track/call — record a phone call button click (web)
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { listing_id, broker_id } = body ?? {};

    if (!listing_id) {
      return NextResponse.json({ error: "listing_id required" }, { status: 400 });
    }

    const session = await getSession();
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip") ??
      null;

    const supabase = createServiceRoleClient();
    const { error } = await supabase.from("call_clicks").insert({
      listing_id,
      broker_id: broker_id ?? null,
      user_id: session?.user?.id ?? null,
      platform: "web",
      ip_address: ip,
    });

    if (error) {
      console.error("[track/call] insert error:", error.message);
      return NextResponse.json({ error: "Failed" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[track/call] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
