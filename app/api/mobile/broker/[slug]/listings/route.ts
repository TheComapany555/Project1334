import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = Math.min(parseInt(searchParams.get("pageSize") || "20"), 50);
    const supabase = createServiceRoleClient();

    const { data: broker } = await supabase
      .from("profiles")
      .select("id")
      .eq("slug", slug)
      .single();

    if (!broker) return NextResponse.json({ data: [], total: 0 });

    const from = (page - 1) * pageSize;

    const { data, count } = await supabase
      .from("listings")
      .select(
        "id, slug, title, asking_price, price_type, revenue, location_text, is_featured, category:categories(id, name), listing_images(id, url, sort_order)",
        { count: "exact" },
      )
      .eq("broker_id", broker.id)
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .range(from, from + pageSize - 1);

    return NextResponse.json({ data: data || [], total: count ?? 0, page, pageSize });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
