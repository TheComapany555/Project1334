import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { getMobileUser } from "@/lib/mobile-jwt";

// GET /api/mobile/listings - search/browse listings
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query") || "";
    const category_id = searchParams.get("category_id");
    const state = searchParams.get("state");
    const suburb = searchParams.get("suburb");
    const min_price = searchParams.get("min_price");
    const max_price = searchParams.get("max_price");
    const min_revenue = searchParams.get("min_revenue");
    const max_revenue = searchParams.get("max_revenue");
    const highlight_ids = searchParams.get("highlight_ids");
    const sort = searchParams.get("sort") || "newest";
    const featured = searchParams.get("featured");
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = Math.min(parseInt(searchParams.get("pageSize") || "10"), 50);

    const supabase = createServiceRoleClient();

    // Paginate on id-only rows first. Deep embeds + .range() on `listings` often break PostgREST
    // past small offsets (500s); we fetch ids for the page then load full rows by id.
    let idBuilder = supabase
      .from("listings")
      .select("id", { count: "exact" })
      .eq("status", "published");

    if (query) {
      idBuilder = idBuilder.or(
        `title.ilike.%${query}%,summary.ilike.%${query}%,location_text.ilike.%${query}%`,
      );
    }
    if (category_id) idBuilder = idBuilder.eq("category_id", category_id);
    if (state) idBuilder = idBuilder.eq("state", state);
    if (suburb) idBuilder = idBuilder.ilike("suburb", `%${suburb}%`);
    if (min_price) idBuilder = idBuilder.gte("asking_price", Number(min_price));
    if (max_price) idBuilder = idBuilder.lte("asking_price", Number(max_price));
    if (min_revenue) idBuilder = idBuilder.gte("revenue", Number(min_revenue));
    if (max_revenue) idBuilder = idBuilder.lte("revenue", Number(max_revenue));
    if (highlight_ids) {
      // Filter listings that have ANY of the selected highlights
      const ids = highlight_ids.split(",").filter(Boolean);
      if (ids.length > 0) {
        const { data: matchingListingIds } = await supabase
          .from("listing_highlight_map")
          .select("listing_id")
          .in("highlight_id", ids);
        const listingIds = [...new Set((matchingListingIds ?? []).map((r) => r.listing_id))];
        if (listingIds.length > 0) {
          idBuilder = idBuilder.in("id", listingIds);
        } else {
          // No listings match these highlights — return empty
          return NextResponse.json({ data: [], total: 0, page, pageSize });
        }
      }
    }
    if (featured === "true") idBuilder = idBuilder.eq("is_featured", true);

    switch (sort) {
      case "price_asc":
        idBuilder = idBuilder.order("asking_price", { ascending: true, nullsFirst: false });
        break;
      case "price_desc":
        idBuilder = idBuilder.order("asking_price", { ascending: false, nullsFirst: false });
        break;
      case "revenue_desc":
        idBuilder = idBuilder.order("revenue", { ascending: false, nullsFirst: false });
        break;
      default:
        idBuilder = idBuilder.order("published_at", { ascending: false, nullsFirst: false });
    }

    const from = (page - 1) * pageSize;
    idBuilder = idBuilder.order("created_at", { ascending: false });
    idBuilder = idBuilder.range(from, from + pageSize - 1);

    const { data: idRows, count, error: idError } = await idBuilder;

    if (idError) {
      console.error("[mobile/listings] id page error:", idError);
      return NextResponse.json({ error: "Failed to fetch listings" }, { status: 500 });
    }

    const orderedIds = (idRows ?? []).map((r: { id: string }) => r.id);
    if (orderedIds.length === 0) {
      return NextResponse.json({ data: [], total: count ?? 0, page, pageSize });
    }

    const { data: rows, error: fullError } = await supabase
      .from("listings")
      .select(
        "*, category:categories(id, name), listing_images(id, url, sort_order), listing_highlights:listing_highlight_map(listing_highlights(id, label, accent, active))",
      )
      .in("id", orderedIds);

    if (fullError) {
      console.error("[mobile/listings] full fetch error:", fullError);
      return NextResponse.json({ error: "Failed to fetch listings" }, { status: 500 });
    }

    const byId = new Map((rows ?? []).map((listing: any) => [listing.id, listing]));
    const ordered = orderedIds.map((id) => byId.get(id)).filter(Boolean) as any[];

    // Flatten highlights from join table
    const listings = ordered.map((listing: any) => ({
      ...listing,
      listing_highlights:
        listing.listing_highlights
          ?.map((m: any) => m.listing_highlights)
          .filter(Boolean) ?? [],
    }));

    return NextResponse.json({ data: listings, total: count ?? 0, page, pageSize });
  } catch (err) {
    console.error("[mobile/listings] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/mobile/listings - create listing
export async function POST(request: Request) {
  try {
    const user = await getMobileUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const supabase = createServiceRoleClient();

    const { data: profile } = await supabase
      .from("profiles")
      .select("agency_id")
      .eq("id", user.sub)
      .single();

    const slug =
      body.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "") +
      "-" +
      Math.random().toString(36).substring(2, 8);

    const { data: listing, error } = await supabase
      .from("listings")
      .insert({
        broker_id: user.sub,
        agency_id: profile?.agency_id || null,
        slug,
        title: body.title,
        category_id: body.category_id || null,
        location_text: body.location_text || null,
        state: body.state || null,
        suburb: body.suburb || null,
        postcode: body.postcode || null,
        asking_price: body.asking_price,
        price_type: body.price_type || "fixed",
        revenue: body.revenue,
        profit: body.profit,
        lease_details: body.lease_details || null,
        summary: body.summary || null,
        description: body.description || null,
        status: "draft",
        listing_tier: body.listing_tier || "basic",
        tier_product_id: body.tier_product_id || null,
      })
      .select("id")
      .single();

    if (error || !listing) {
      console.error("[mobile/listings] create error:", error);
      return NextResponse.json({ error: "Failed to create listing" }, { status: 500 });
    }

    // Link highlights
    if (body.highlight_ids?.length) {
      await supabase.from("listing_highlight_map").insert(
        body.highlight_ids.map((hid: string) => ({
          listing_id: listing.id,
          highlight_id: hid,
        })),
      );
    }

    return NextResponse.json({ data: { id: listing.id } }, { status: 201 });
  } catch (err) {
    console.error("[mobile/listings] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
