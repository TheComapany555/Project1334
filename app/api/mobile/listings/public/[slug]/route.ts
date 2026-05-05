import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { getMobileUser } from "@/lib/mobile-jwt";
import { getPublicListingDocuments } from "@/lib/actions/documents";

// GET /api/mobile/listings/public/[slug] - listing detail by slug (public)
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const supabase = createServiceRoleClient();

    // Resolve authenticated user (optional — anonymous access still allowed)
    const mobileUser = await getMobileUser(request).catch(() => null);
    const userId = mobileUser?.sub ?? null;

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
        .select("id, name, slug, logo_url, phone, email, website, bio, status")
        .eq("id", listing.agency_id)
        .single();
      if (agencyData && agencyData.status === "active") {
        agency = agencyData;
      }
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

    // ── NDA status ──────────────────────────────────────────────────────────
    let nda: {
      required: boolean;
      text: string | null;
      signed: boolean;
    } = { required: false, text: null, signed: false };

    try {
      const { data: ndaRow } = await supabase
        .from("listing_ndas")
        .select("nda_text, is_required")
        .eq("listing_id", listing.id)
        .single();

      if (ndaRow?.is_required) {
        let signed = false;
        if (userId) {
          const { data: sig } = await supabase
            .from("nda_signatures")
            .select("id")
            .eq("listing_id", listing.id)
            .eq("user_id", userId)
            .single();
          signed = !!sig;
        }
        nda = { required: true, text: ndaRow.nda_text, signed };
      }
    } catch {
      // NDA is optional — don't fail
    }

    // ── Documents (NDA + broker access — same rules as web) ──────────────────
    let documents: {
      id: string;
      name: string;
      category: string;
      is_confidential: boolean;
      file_url: string | null;
      file_size: number | null;
      file_type: string | null;
    }[] = [];

    try {
      const docBundle = await getPublicListingDocuments(listing.id, userId);
      documents = docBundle.documents.map((d) => ({
        id: d.id,
        name: d.name,
        category: d.category,
        is_confidential: d.is_confidential,
        file_size: d.file_size,
        file_type: d.file_type,
        file_url: d.file_url?.trim() ? d.file_url : null,
      }));
    } catch {
      // Documents are optional — don't fail
    }

    return NextResponse.json({
      data: {
        ...listing,
        broker,
        agency,
        listing_highlights: highlights,
        nda,
        documents,
      },
    });
  } catch (err) {
    console.error("[mobile/listings/public/slug] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
