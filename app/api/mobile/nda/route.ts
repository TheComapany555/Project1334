import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { getMobileUser } from "@/lib/mobile-jwt";

// POST /api/mobile/nda — sign the NDA for a listing
export async function POST(request: Request) {
  try {
    const mobileUser = await getMobileUser(request).catch(() => null);
    if (!mobileUser?.sub) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { listing_id, signer_name, signer_email } = body ?? {};

    if (!listing_id || !signer_name?.trim()) {
      return NextResponse.json(
        { error: "listing_id and signer_name are required" },
        { status: 400 }
      );
    }

    const supabase = createServiceRoleClient();

    // Verify the listing exists and is published
    const { data: listing } = await supabase
      .from("listings")
      .select("id")
      .eq("id", listing_id)
      .eq("status", "published")
      .single();

    if (!listing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    // Upsert NDA signature (typed name counts as signature on mobile)
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;

    const { error } = await supabase.from("nda_signatures").upsert(
      {
        listing_id,
        user_id: mobileUser.sub,
        signer_name: signer_name.trim(),
        signer_email: signer_email?.trim() ?? "",
        // Store typed name as the signature data for mobile
        signature_data: `mobile:typed:${signer_name.trim()}`,
        ip_address: ip,
      },
      { onConflict: "listing_id,user_id" }
    );

    if (error) {
      console.error("[mobile/nda] sign error:", error.message);
      return NextResponse.json({ error: "Failed to sign NDA" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[mobile/nda] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
