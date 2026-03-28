import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";

// GET /api/mobile/listings/public/[slug] - listing detail by slug (public)
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const supabase = createServiceRoleClient();

    // Fetch listing with basic relations
    const { data: listing, error } = await supabase
      .from("listings")
      .select("*, category:categories(*), listing_images(*)")
      .eq("slug", slug)
      .eq("status", "published")
      .single();

    if (error || !listing) {
      console.error("[mobile/listings/public] not found:", slug, "error:", error?.message, error?.code);
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    // Fetch broker profile separately
    let broker = null;
    if (listing.broker_id) {
      const { data: brokerData } = await supabase
        .from("profiles")
        .select("id, name, company, phone, website, bio, photo_url, logo_url, slug, agency_id")
        .eq("id", listing.broker_id)
        .single();
      broker = brokerData;

      // Get broker email from users table
      if (broker) {
        const { data: userData } = await supabase
          .from("users")
          .select("email")
          .eq("id", listing.broker_id)
          .single();
        if (userData) (broker as any).email = userData.email;
      }
    }

    // Fetch agency separately
    let agency = null;
    if (listing.agency_id) {
      const { data: agencyData } = await supabase
        .from("agencies")
        .select("id, name, slug, logo_url")
        .eq("id", listing.agency_id)
        .single();
      agency = agencyData;
    }

    // Fetch highlights separately to avoid join issues
    let highlights: any[] = [];
    try {
      const { data: mapRows } = await supabase
        .from("listing_highlight_map")
        .select("highlight_id")
        .eq("listing_id", listing.id);

      if (mapRows && mapRows.length > 0) {
        const ids = mapRows.map((r: any) => r.highlight_id);
        const { data: hlData } = await supabase
          .from("listing_highlights")
          .select("id, label, accent_color, active")
          .in("id", ids);
        highlights = hlData || [];
      }
    } catch {
      // Highlights are optional - don't fail the request
    }

    return NextResponse.json({
      data: {
        ...listing,
        broker,
        agency,
        listing_highlights: highlights,
      },
    });
  } catch (err) {
    console.error("[mobile/listings/public/slug] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
