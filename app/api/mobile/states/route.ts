import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from("listings")
      .select("state")
      .eq("status", "published")
      .not("state", "is", null);

    if (error) return NextResponse.json({ error: "Failed to fetch states" }, { status: 500 });

    const states = [...new Set((data || []).map((r: any) => r.state).filter(Boolean))].sort();
    return NextResponse.json({ data: states });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
