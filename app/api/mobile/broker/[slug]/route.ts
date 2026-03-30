import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const supabase = createServiceRoleClient();

    const { data: profile, error } = await supabase
      .from("profiles")
      .select(
        "id, name, company, phone, email_public, website, bio, photo_url, logo_url, slug, agency_id, agency_role, social_links, role, agency:agencies(id, name, slug, logo_url)",
      )
      .eq("slug", slug)
      .maybeSingle();

    if (error || !profile) {
      if (error) console.error("[mobile/broker/slug]", slug, error.message);
      return NextResponse.json({ error: "Broker not found" }, { status: 404 });
    }

    // Match /broker/[slug]/listings: that route resolves by slug without role filter.
    // Allow broker + admin; for "user" only expose if they have published listings (same public surface as listings API).
    const role = profile.role as string;
    const isBrokerLike = role === "broker" || role === "admin";
    if (!isBrokerLike) {
      const { count } = await supabase
        .from("listings")
        .select("id", { count: "exact", head: true })
        .eq("broker_id", profile.id)
        .eq("status", "published");
      if (!count) {
        return NextResponse.json({ error: "Broker not found" }, { status: 404 });
      }
    }

    const { email_public, ...rest } = profile as typeof profile & { email_public?: string | null };
    let email: string | null = email_public ?? null;
    if (!email) {
      const { data: userRow } = await supabase
        .from("users")
        .select("email")
        .eq("id", profile.id)
        .maybeSingle();
      email = userRow?.email ?? null;
    }

    return NextResponse.json({ data: { ...rest, email } });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
