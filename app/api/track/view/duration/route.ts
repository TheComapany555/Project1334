import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";

// POST /api/track/view/duration — update duration on a view record (called via sendBeacon on exit)
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { view_id, duration_seconds } = body ?? {};

    if (!view_id || typeof duration_seconds !== "number") {
      return NextResponse.json({ ok: false });
    }

    const clamped = Math.min(Math.round(duration_seconds), 7200); // cap at 2h
    if (clamped < 2) return NextResponse.json({ ok: false }); // ignore sub-2s blips

    const supabase = createServiceRoleClient();
    await supabase
      .from("listing_views")
      .update({ duration_seconds: clamped })
      .eq("id", view_id)
      .is("duration_seconds", null); // only update if not already set

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false });
  }
}
