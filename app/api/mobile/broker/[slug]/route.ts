import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const supabase = createServiceRoleClient();

    const { data: broker, error } = await supabase
      .from("profiles")
      .select("id, name, company, phone, email, website, bio, photo_url, logo_url, slug, agency_id, agency_role, social_links, agency:agencies(id, name, slug, logo_url)")
      .eq("slug", slug)
      .eq("role", "broker")
      .single();

    if (error || !broker) return NextResponse.json({ error: "Broker not found" }, { status: 404 });
    return NextResponse.json({ data: broker });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
