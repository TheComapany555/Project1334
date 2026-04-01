import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { getSession } from "@/lib/auth-client";

// POST /api/track/view — record a web listing view, returns { view_id }
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const listing_id = body?.listing_id;
    if (!listing_id) {
      return NextResponse.json({ error: "listing_id required" }, { status: 400 });
    }

    const session = await getSession();
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip") ??
      null;

    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from("listing_views")
      .insert({
        listing_id,
        user_id: session?.user?.id ?? null,
        platform: "web",
        ip_address: ip,
      })
      .select("id")
      .single();

    if (error) {
      console.error("[track/view] insert error:", error.message);
      return NextResponse.json({ error: "Failed" }, { status: 500 });
    }

    return NextResponse.json({ view_id: data.id });
  } catch (err) {
    console.error("[track/view] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
