import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { getMobileUser } from "@/lib/mobile-jwt";

// DELETE /api/mobile/favorites/[listingId] — unsave a listing
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ listingId: string }> },
) {
  try {
    const user = await getMobileUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { listingId } = await params;
    const supabase = createServiceRoleClient();

    await supabase
      .from("user_favorites")
      .delete()
      .eq("user_id", user.sub)
      .eq("listing_id", listingId);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[mobile/favorites/delete] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
