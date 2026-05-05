import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { getMobileUser } from "@/lib/mobile-jwt";

// GET /api/mobile/documents/download?doc_id=... — get a short-lived signed URL
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const doc_id = searchParams.get("doc_id");

    if (!doc_id) {
      return NextResponse.json({ error: "doc_id required" }, { status: 400 });
    }

    const mobileUser = await getMobileUser(request).catch(() => null);
    const userId = mobileUser?.sub ?? null;

    const supabase = createServiceRoleClient();

    const { data: doc } = await supabase
      .from("listing_documents")
      .select("id, listing_id, file_url, is_confidential, approval_status")
      .eq("id", doc_id)
      .single();

    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // Only approved documents are accessible to buyers
    if (doc.approval_status !== "approved") {
      return NextResponse.json({ error: "Document not available" }, { status: 404 });
    }

    // Verify listing is published
    const { data: listing } = await supabase
      .from("listings")
      .select("id")
      .eq("id", doc.listing_id)
      .eq("status", "published")
      .single();

    if (!listing) {
      return NextResponse.json({ error: "Listing not available" }, { status: 404 });
    }

    // Confidential documents require NDA to be signed
    if (doc.is_confidential) {
      if (!userId) {
        return NextResponse.json({ error: "Sign in to access this document" }, { status: 401 });
      }

      const { data: ndaRow } = await supabase
        .from("listing_ndas")
        .select("is_required")
        .eq("listing_id", doc.listing_id)
        .single();

      if (ndaRow?.is_required) {
        const { data: sig } = await supabase
          .from("nda_signatures")
          .select("id")
          .eq("listing_id", doc.listing_id)
          .eq("user_id", userId)
          .single();

        if (!sig) {
          return NextResponse.json(
            { error: "You must sign the NDA to access this document" },
            { status: 403 }
          );
        }

        const { data: access } = await supabase
          .from("document_access_requests")
          .select("status")
          .eq("document_id", doc.id)
          .eq("user_id", userId)
          .maybeSingle();

        if (access?.status !== "approved") {
          return NextResponse.json(
            { error: "The broker has not approved access to this document yet" },
            { status: 403 }
          );
        }
      }
    }

    // Return the file URL directly (already a public/signed URL from Supabase storage)
    return NextResponse.json({ url: doc.file_url });
  } catch (err) {
    console.error("[mobile/documents/download] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
