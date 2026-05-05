"use server";

import { createServiceRoleClient } from "@/lib/supabase/admin";
import type { ListingDocument } from "@/lib/types/documents";

const CONFIDENTIAL_PLACEHOLDER_NAME = "Confidential document";

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
    agencyRole: session.user.agencyRole ?? null,
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
  const { error: uploadError } = await supabase.storage
    .from("listing-documents")
    .upload(filePath, file, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
      cacheControl: "3600",
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

  if (doc.is_confidential) {
    await backfillPendingAccessRequestsForNdaBuyers(listingId, doc.id);
  }

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

// ── NDA document access requests (buyer signs NDA → broker approves per doc) ──

/** After an NDA is signed: queue access requests for all published confidential docs on the listing. */
export async function createPendingDocumentAccessRequestsForBuyer(
  listingId: string,
  buyerUserId: string
): Promise<number> {
  const supabase = createServiceRoleClient();
  const { data: docs } = await supabase
    .from("listing_documents")
    .select("id")
    .eq("listing_id", listingId)
    .eq("approval_status", "approved")
    .eq("is_confidential", true);

  const rows = (docs ?? []).map((d) => ({
    document_id: d.id,
    listing_id: listingId,
    user_id: buyerUserId,
    status: "pending" as const,
  }));
  if (rows.length === 0) return 0;

  const { error } = await supabase.from("document_access_requests").upsert(rows, {
    onConflict: "document_id,user_id",
    ignoreDuplicates: true,
  });
  if (error) console.error("[documents] upsert document_access_requests:", error.message);
  return rows.length;
}

async function backfillPendingAccessRequestsForNdaBuyers(
  listingId: string,
  documentId: string
) {
  const supabase = createServiceRoleClient();
  const { data: signers } = await supabase
    .from("nda_signatures")
    .select("user_id")
    .eq("listing_id", listingId);
  const rows = (signers ?? []).map((s) => ({
    document_id: documentId,
    listing_id: listingId,
    user_id: s.user_id,
    status: "pending" as const,
  }));
  if (rows.length === 0) return;
  const { error } = await supabase.from("document_access_requests").upsert(rows, {
    onConflict: "document_id,user_id",
    ignoreDuplicates: true,
  });
  if (error) console.error("[documents] backfill document_access_requests:", error.message);
}

function redactConfidentialDoc(d: ListingDocument): ListingDocument {
  return {
    ...d,
    file_url: "",
    name: CONFIDENTIAL_PLACEHOLDER_NAME,
    file_size: null,
    file_type: null,
    buyer_access_pending: true,
    category: "other",
  };
}

export type PublicListingDocumentsResult = {
  documents: ListingDocument[];
  requiresNda: boolean;
  hasSigned: boolean;
  /** When NDA is required and unsigned: how many confidential files exist (titles never exposed). */
  lockedConfidentialCount: number;
};

// ── Public: Get documents for a listing (respects NDA + broker access approval) ──

export async function getPublicListingDocuments(
  listingId: string,
  userId: string | null
): Promise<PublicListingDocumentsResult> {
  const supabase = createServiceRoleClient();

  const { data: nda } = await supabase
    .from("listing_ndas")
    .select("is_required")
    .eq("listing_id", listingId)
    .single();

  const requiresNda = !!(nda?.is_required);

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

  const { data: docs } = await supabase
    .from("listing_documents")
    .select("*")
    .eq("listing_id", listingId)
    .eq("approval_status", "approved")
    .order("sort_order", { ascending: true });

  const allDocs = docs ?? [];

  const confidentialApproved = allDocs.filter((d) => d.is_confidential);
  const lockedConfidentialCount = requiresNda ? confidentialApproved.length : 0;

  const accessStatusByDocId = new Map<string, string>();
  if (userId && requiresNda && hasSigned) {
    const { data: reqs } = await supabase
      .from("document_access_requests")
      .select("document_id, status")
      .eq("listing_id", listingId)
      .eq("user_id", userId);
    for (const r of reqs ?? []) accessStatusByDocId.set(r.document_id, r.status);
  }

  // Non–NDA listings: behave as before (approved docs visible).
  if (!requiresNda) {
    return {
      documents: allDocs as ListingDocument[],
      requiresNda,
      hasSigned,
      lockedConfidentialCount: 0,
    };
  }

  // NDA required, not signed: never expose confidential rows or filenames
  if (!hasSigned) {
    const visible = allDocs.filter((d) => !d.is_confidential) as ListingDocument[];
    return {
      documents: visible,
      requiresNda,
      hasSigned,
      lockedConfidentialCount,
    };
  }

  // Signed NDA: show titles/files only where broker approved this buyer's access
  const released = allDocs.map((d) => {
    const row = d as ListingDocument;
    if (!row.is_confidential) return row;
    if (accessStatusByDocId.get(row.id) === "approved") {
      const { buyer_access_pending: _, ...rest } = row;
      return rest as ListingDocument;
    }
    return redactConfidentialDoc(row);
  });

  return {
    documents: released,
    requiresNda,
    hasSigned,
    lockedConfidentialCount: 0,
  };
}

// ── Broker: document access queue ──

export type BrokerDocumentAccessRequestRow = {
  id: string;
  listing_id: string;
  document_id: string;
  user_id: string;
  status: string;
  requested_at: string;
  reviewed_at: string | null;
  rejection_reason: string | null;
  listing_title: string | null;
  document_name: string | null;
  buyer_name: string | null;
  buyer_email: string | null;
};

export async function getBrokerDocumentAccessRequests(params?: {
  status?: "pending" | "approved" | "rejected" | "all";
}): Promise<BrokerDocumentAccessRequestRow[]> {
  const { userId, agencyId, agencyRole } = await requireBroker();
  const supabase = createServiceRoleClient();

  let listingIds: string[] = [];
  if (agencyId && agencyRole === "owner") {
    const { data: ls } = await supabase.from("listings").select("id").eq("agency_id", agencyId);
    listingIds = (ls ?? []).map((l) => l.id);
  } else {
    const { data: ls } = await supabase.from("listings").select("id").eq("broker_id", userId);
    listingIds = (ls ?? []).map((l) => l.id);
  }
  if (listingIds.length === 0) return [];

  let q = supabase
    .from("document_access_requests")
    .select("id, listing_id, document_id, user_id, status, requested_at, reviewed_at, rejection_reason")
    .in("listing_id", listingIds)
    .order("requested_at", { ascending: false });

  const st = params?.status ?? "pending";
  if (st !== "all") q = q.eq("status", st);

  const { data: rows, error } = await q;
  if (error || !rows?.length) return [];

  const listingSet = new Set(listingIds);
  const filtered = rows.filter((r: { listing_id: string }) => listingSet.has(r.listing_id));
  const docIds = [...new Set(filtered.map((r: { document_id: string }) => r.document_id))];
  const userIds = [...new Set(filtered.map((r: { user_id: string }) => r.user_id))];

  const [listingsRes, docsRes, profilesRes, usersRes] = await Promise.all([
    supabase.from("listings").select("id, title").in("id", [...new Set(filtered.map((r: { listing_id: string }) => r.listing_id))]),
    docIds.length
      ? supabase.from("listing_documents").select("id, name").in("id", docIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    userIds.length
      ? supabase.from("profiles").select("id, name").in("id", userIds)
      : Promise.resolve({ data: [] as { id: string; name: string | null }[] }),
    userIds.length
      ? supabase.from("users").select("id, email").in("id", userIds)
      : Promise.resolve({ data: [] as { id: string; email: string }[] }),
  ]);

  const titleByLid = new Map((listingsRes.data ?? []).map((l) => [l.id, l.title]));
  const nameByDid = new Map((docsRes.data ?? []).map((d) => [d.id, d.name]));
  const profByUid = new Map((profilesRes.data ?? []).map((p) => [p.id, p.name]));
  const emailByUid = new Map((usersRes.data ?? []).map((u) => [u.id, u.email]));

  return filtered.map((r: (typeof filtered)[number]) => ({
    id: r.id,
    listing_id: r.listing_id,
    document_id: r.document_id,
    user_id: r.user_id,
    status: r.status,
    requested_at: r.requested_at,
    reviewed_at: r.reviewed_at,
    rejection_reason: r.rejection_reason,
    listing_title: titleByLid.get(r.listing_id) ?? null,
    document_name: nameByDid.get(r.document_id) ?? null,
    buyer_name: profByUid.get(r.user_id) ?? null,
    buyer_email: emailByUid.get(r.user_id) ?? null,
  }));
}

export async function getPendingDocumentAccessRequestCount(): Promise<number> {
  const rows = await getBrokerDocumentAccessRequests({ status: "pending" });
  return rows.length;
}

export async function approveBuyerDocumentAccess(
  requestId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { userId } = await requireBroker();
  const supabase = createServiceRoleClient();

  const { data: req } = await supabase
    .from("document_access_requests")
    .select("id, listing_id, status")
    .eq("id", requestId)
    .single();
  if (!req) return { ok: false, error: "Request not found." };
  if (req.status !== "pending") return { ok: false, error: "This request was already reviewed." };

  if (!(await verifyListingOwnership(req.listing_id, userId))) {
    return { ok: false, error: "You cannot manage this listing." };
  }

  const { error } = await supabase
    .from("document_access_requests")
    .update({
      status: "approved",
      reviewed_by: userId,
      reviewed_at: new Date().toISOString(),
      rejection_reason: null,
    })
    .eq("id", requestId);

  if (error) return { ok: false, error: "Failed to approve access." };
  return { ok: true };
}

export async function rejectBuyerDocumentAccess(
  requestId: string,
  reason?: string | null
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { userId } = await requireBroker();
  const supabase = createServiceRoleClient();

  const { data: req } = await supabase
    .from("document_access_requests")
    .select("id, listing_id, status")
    .eq("id", requestId)
    .single();
  if (!req) return { ok: false, error: "Request not found." };
  if (req.status !== "pending") return { ok: false, error: "This request was already reviewed." };

  if (!(await verifyListingOwnership(req.listing_id, userId))) {
    return { ok: false, error: "You cannot manage this listing." };
  }

  const trimmed = reason?.trim() || null;
  const { error } = await supabase
    .from("document_access_requests")
    .update({
      status: "rejected",
      reviewed_by: userId,
      reviewed_at: new Date().toISOString(),
      rejection_reason: trimmed,
    })
    .eq("id", requestId);

  if (error) return { ok: false, error: "Failed to deny access." };
  return { ok: true };
}
