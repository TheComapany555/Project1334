import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { getMobileUser } from "@/lib/mobile-jwt";

// POST /api/mobile/track/view — record a mobile listing view
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { listing_id, duration_seconds } = body ?? {};

    if (!listing_id) {
      return NextResponse.json({ error: "listing_id required" }, { status: 400 });
    }

    // User is optional — anonymous views are tracked too
    const mobileUser = await getMobileUser(request).catch(() => null);
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip") ??
      null;

    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from("listing_views")
      .insert({
        listing_id,
        user_id: mobileUser?.sub ?? null,
        platform: "mobile",
        ip_address: ip,
        duration_seconds:
          typeof duration_seconds === "number"
            ? Math.min(Math.round(duration_seconds), 7200)
            : null,
      })
      .select("id")
      .single();

    if (error) {
      console.error("[mobile/track/view] insert error:", error.message);
      return NextResponse.json({ error: "Failed" }, { status: 500 });
    }

    return NextResponse.json({ view_id: data.id });
  } catch (err) {
    console.error("[mobile/track/view] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
