import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from("listing_highlights")
      .select("id, label, accent_color, active")
      .order("label");

    if (error) {
      console.error("[mobile/highlights] supabase error:", error.message, error.code);
      // If table doesn't exist or column issue, return empty array gracefully
      return NextResponse.json({ data: [] });
    }

    // Filter active in JS in case column doesn't exist
    const filtered = (data || []).filter((h: any) => h.active !== false);
    return NextResponse.json({ data: filtered });
  } catch (err) {
    console.error("[mobile/highlights] error:", err);
    return NextResponse.json({ data: [] });
  }
}
