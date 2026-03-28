import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from("categories")
      .select("id, name, slug, active")
      .eq("active", true)
      .order("name");

    if (error) return NextResponse.json({ error: "Failed to fetch categories" }, { status: 500 });
    return NextResponse.json({ data: data || [] });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
