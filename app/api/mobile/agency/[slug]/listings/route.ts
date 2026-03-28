import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const supabase = createServiceRoleClient();

    const { data: agency } = await supabase
      .from("agencies")
      .select("id")
      .eq("slug", slug)
      .single();

    if (!agency) return NextResponse.json({ data: [] });

    const { data } = await supabase
      .from("listings")
      .select("*, category:categories(id, name), listing_images(id, url, sort_order)")
      .eq("agency_id", agency.id)
      .eq("status", "published")
      .order("published_at", { ascending: false });

    return NextResponse.json({ data: data || [] });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
