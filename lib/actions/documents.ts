"use server";

import { createServiceRoleClient } from "@/lib/supabase/admin";
import type { ListingDocument } from "@/lib/types/documents";

async function requireBroker() {
  const { getServerSession } = await import("next-auth");
  const { authOptions } = await import("@/lib/auth");
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "broker") {
    throw new Error("Unauthorized");
  }
  return {
    userId: session.user.id,
    agencyId: session.user.agencyId ?? null,
  };
}

async function verifyListingOwnership(listingId: string, userId: string) {
  const supabase = createServiceRoleClient();
  const { data: listing } = await supabase
    .from("listings")
    .select("id, broker_id, agency_id")
    .eq("id", listingId)
    .single();
  if (!listing) return false;

  if (listing.broker_id === userId) return true;

  if (listing.agency_id) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("agency_id, agency_role")
      .eq("id", userId)
      .single();
    return (
      profile?.agency_id === listing.agency_id &&
      profile?.agency_role === "owner"
    );
  }

  return false;
}

// ── Broker: Document Management ──

export async function getListingDocuments(
  listingId: string
): Promise<ListingDocument[]> {
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("listing_documents")
    .select("*")
    .eq("listing_id", listingId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  return data ?? [];
}

export async function uploadListingDocument(
  listingId: string,
  formData: FormData
): Promise<{ ok: true; document: ListingDocument } | { ok: false; error: string }> {
  const { userId } = await requireBroker();

  if (!(await verifyListingOwnership(listingId, userId))) {
    return { ok: false, error: "You do not own this listing." };
  }

  const file = formData.get("file") as File | null;
  const name = (formData.get("name") as string)?.trim();
  const category = (formData.get("category") as string) || "other";
  const isConfidential = formData.get("is_confidential") === "true";

  if (!file || file.size === 0) {
    return { ok: false, error: "Please select a file." };
  }
  if (file.size > 10 * 1024 * 1024) {
    return { ok: false, error: "File must be under 10MB." };
  }
  if (!name) {
    return { ok: false, error: "Please enter a document name." };
  }

  const supabase = createServiceRoleClient();

  // Upload to storage
  const ext = file.name.split(".").pop() || "pdf";
  const filePath = `${listingId}/${crypto.randomUUID()}.${ext}`;
  const arrayBuffer = await file.arrayBuffer();
  const { error: uploadError } = await supabase.storage
    .from("listing-documents")
    .upload(filePath, arrayBuffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    return { ok: false, error: "Failed to upload file." };
  }

  // Get signed URL (private bucket)
  const { data: urlData } = await supabase.storage
    .from("listing-documents")
    .createSignedUrl(filePath, 60 * 60 * 24 * 365 * 10); // 10 year signed URL

  const fileUrl = urlData?.signedUrl ?? filePath;

  // Insert document record. New uploads start as 'pending' so they are
  // hidden from buyers until the broker explicitly approves them.
  const { data: doc, error: insertError } = await supabase
    .from("listing_documents")
    .insert({
      listing_id: listingId,
      name,
      file_url: fileUrl,
      file_size: file.size,
      file_type: file.type,
      category,
      is_confidential: isConfidential,
      uploaded_by: userId,
      approval_status: "pending",
    })
    .select("*")
    .single();

  if (insertError || !doc) {
    return { ok: false, error: "Failed to save document record." };
  }

  return { ok: true, document: doc };
}

export async function deleteListingDocument(
  listingId: string,
  documentId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { userId } = await requireBroker();

  if (!(await verifyListingOwnership(listingId, userId))) {
    return { ok: false, error: "You do not own this listing." };
  }

  const supabase = createServiceRoleClient();
  const { error } = await supabase
    .from("listing_documents")
    .delete()
    .eq("id", documentId)
    .eq("listing_id", listingId);

  if (error) return { ok: false, error: "Failed to delete document." };
  return { ok: true };
}

export async function updateDocumentOrder(
  listingId: string,
  documentIds: string[]
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { userId } = await requireBroker();

  if (!(await verifyListingOwnership(listingId, userId))) {
    return { ok: false, error: "You do not own this listing." };
  }

  const supabase = createServiceRoleClient();
  for (let i = 0; i < documentIds.length; i++) {
    await supabase
      .from("listing_documents")
      .update({ sort_order: i })
      .eq("id", documentIds[i])
      .eq("listing_id", listingId);
  }

  return { ok: true };
}

// ── Broker: Approve / Reject Documents ──

export async function approveListingDocument(
  listingId: string,
  documentId: string
): Promise<{ ok: true; document: ListingDocument } | { ok: false; error: string }> {
  const { userId } = await requireBroker();

  if (!(await verifyListingOwnership(listingId, userId))) {
    return { ok: false, error: "You do not own this listing." };
  }

  const supabase = createServiceRoleClient();
  const { data: doc, error } = await supabase
    .from("listing_documents")
    .update({
      approval_status: "approved",
      approved_by: userId,
      approved_at: new Date().toISOString(),
      rejection_reason: null,
    })
    .eq("id", documentId)
    .eq("listing_id", listingId)
    .select("*")
    .single();

  if (error || !doc) return { ok: false, error: "Failed to approve document." };
  return { ok: true, document: doc };
}

export async function rejectListingDocument(
  listingId: string,
  documentId: string,
  reason: string
): Promise<{ ok: true; document: ListingDocument } | { ok: false; error: string }> {
  const { userId } = await requireBroker();

  if (!(await verifyListingOwnership(listingId, userId))) {
    return { ok: false, error: "You do not own this listing." };
  }

  const trimmed = reason?.trim();
  if (!trimmed) {
    return { ok: false, error: "Please provide a rejection reason." };
  }

  const supabase = createServiceRoleClient();
  const { data: doc, error } = await supabase
    .from("listing_documents")
    .update({
      approval_status: "rejected",
      approved_by: userId,
      approved_at: new Date().toISOString(),
      rejection_reason: trimmed,
    })
    .eq("id", documentId)
    .eq("listing_id", listingId)
    .select("*")
    .single();

  if (error || !doc) return { ok: false, error: "Failed to reject document." };
  return { ok: true, document: doc };
}

export async function resetDocumentApproval(
  listingId: string,
  documentId: string
): Promise<{ ok: true; document: ListingDocument } | { ok: false; error: string }> {
  const { userId } = await requireBroker();

  if (!(await verifyListingOwnership(listingId, userId))) {
    return { ok: false, error: "You do not own this listing." };
  }

  const supabase = createServiceRoleClient();
  const { data: doc, error } = await supabase
    .from("listing_documents")
    .update({
      approval_status: "pending",
      approved_by: null,
      approved_at: null,
      rejection_reason: null,
    })
    .eq("id", documentId)
    .eq("listing_id", listingId)
    .select("*")
    .single();

  if (error || !doc) return { ok: false, error: "Failed to reset document." };
  return { ok: true, document: doc };
}

// ── Public: Get documents for a listing (respects NDA) ──

export async function getPublicListingDocuments(
  listingId: string,
  userId: string | null
): Promise<{ documents: ListingDocument[]; requiresNda: boolean; hasSigned: boolean }> {
  const supabase = createServiceRoleClient();

  // Check if NDA is required
  const { data: nda } = await supabase
    .from("listing_ndas")
    .select("is_required")
    .eq("listing_id", listingId)
    .single();

  const requiresNda = !!(nda?.is_required);

  // Check if user has signed
  let hasSigned = false;
  if (userId && requiresNda) {
    const { data: sig } = await supabase
      .from("nda_signatures")
      .select("id")
      .eq("listing_id", listingId)
      .eq("user_id", userId)
      .single();
    hasSigned = !!sig;
  }

  // Get approved documents only. Pending and rejected docs are hidden from buyers.
  const { data: docs } = await supabase
    .from("listing_documents")
    .select("*")
    .eq("listing_id", listingId)
    .eq("approval_status", "approved")
    .order("sort_order", { ascending: true });

  const allDocs = docs ?? [];

  // If NDA required and not signed, only show non-confidential docs
  if (requiresNda && !hasSigned) {
    return {
      documents: allDocs.map((d) =>
        d.is_confidential
          ? { ...d, file_url: "", name: d.name }
          : d
      ),
      requiresNda,
      hasSigned,
    };
  }

  return { documents: allDocs, requiresNda, hasSigned };
}
