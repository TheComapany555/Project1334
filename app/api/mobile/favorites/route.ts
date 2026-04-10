import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { getMobileUser } from "@/lib/mobile-jwt";

// GET /api/mobile/favorites — list user's saved listings
export async function GET(request: Request) {
  try {
    const user = await getMobileUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabase = createServiceRoleClient();

    const { data: favRows, error } = await supabase
      .from("user_favorites")
      .select("listing_id, created_at")
      .eq("user_id", user.sub)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[mobile/favorites] error:", error);
      return NextResponse.json({ error: "Failed to fetch favorites" }, { status: 500 });
    }

    if (!favRows || favRows.length === 0) {
      return NextResponse.json({ data: [], listing_ids: [] });
    }

    const listingIds = favRows.map((r) => r.listing_id);

    // Fetch only fields needed for listing cards
    const { data: listings } = await supabase
      .from("listings")
      .select("id, slug, title, asking_price, price_type, revenue, location_text, is_featured, category:categories(id, name), listing_images(id, url, sort_order)")
      .in("id", listingIds)
      .eq("status", "published");

    // Sort listings in the same order as favorites
    const listingMap = new Map((listings || []).map((l) => [l.id, l]));
    const sorted = listingIds
      .map((id) => listingMap.get(id))
      .filter(Boolean);

    return NextResponse.json({ data: sorted, listing_ids: listingIds });
  } catch (err) {
    console.error("[mobile/favorites] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/mobile/favorites — save a listing (body: { listing_id })
export async function POST(request: Request) {
  try {
    const user = await getMobileUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { listing_id } = await request.json();
    if (!listing_id) return NextResponse.json({ error: "listing_id is required" }, { status: 400 });

    const supabase = createServiceRoleClient();

    const { error } = await supabase
      .from("user_favorites")
      .upsert({ user_id: user.sub, listing_id }, { onConflict: "user_id,listing_id" });

    if (error) {
      console.error("[mobile/favorites] save error:", error);
      return NextResponse.json({ error: "Failed to save" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[mobile/favorites] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
