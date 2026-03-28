import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const supabase = createServiceRoleClient();

    const { data: agency, error } = await supabase
      .from("agencies")
      .select("*")
      .eq("slug", slug)
      .eq("status", "active")
      .single();

    if (error || !agency) return NextResponse.json({ error: "Agency not found" }, { status: 404 });
    return NextResponse.json({ data: agency });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
