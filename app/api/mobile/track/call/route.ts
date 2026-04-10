import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { getMobileUser } from "@/lib/mobile-jwt";

// POST /api/mobile/track/call — record a phone call button click (mobile)
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { listing_id, broker_id } = body ?? {};

    if (!listing_id) {
      return NextResponse.json({ error: "listing_id required" }, { status: 400 });
    }

    const mobileUser = await getMobileUser(request).catch(() => null);
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip") ??
      null;

    const supabase = createServiceRoleClient();
    const { error } = await supabase.from("call_clicks").insert({
      listing_id,
      broker_id: broker_id ?? null,
      user_id: mobileUser?.sub ?? null,
      platform: "mobile",
      ip_address: ip,
    });

    if (error) {
      console.error("[mobile/track/call] insert error:", error.message);
      return NextResponse.json({ error: "Failed" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[mobile/track/call] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
