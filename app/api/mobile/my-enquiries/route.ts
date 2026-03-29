import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { getMobileUser } from "@/lib/mobile-jwt";

// GET /api/mobile/my-enquiries — get enquiries sent by the current user
export async function GET(request: Request) {
  try {
    const user = await getMobileUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabase = createServiceRoleClient();

    // Find enquiries by user_id OR by email
    const { data: profile } = await supabase
      .from("users")
      .select("email")
      .eq("id", user.sub)
      .single();

    let query = supabase
      .from("enquiries")
      .select("*, listing:listings(id, title, slug, asking_price, price_type, location_text, listing_images(id, url, sort_order))")
      .order("created_at", { ascending: false });

    // Match by user_id (if linked) OR by contact_email
    if (profile?.email) {
      query = query.or(`user_id.eq.${user.sub},contact_email.eq.${profile.email}`);
    } else {
      query = query.eq("user_id", user.sub);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[mobile/my-enquiries] error:", error);
      return NextResponse.json({ error: "Failed to fetch enquiries" }, { status: 500 });
    }

    return NextResponse.json({ data: data || [] });
  } catch (err) {
    console.error("[mobile/my-enquiries] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
