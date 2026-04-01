"use server";

import { createServiceRoleClient } from "@/lib/supabase/admin";
import type { ListingNda, NdaSignature, NdaSignatureWithListing } from "@/lib/types/nda";

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

async function requireUser() {
  const { getServerSession } = await import("next-auth");
  const { authOptions } = await import("@/lib/auth");
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }
  return {
    userId: session.user.id,
    email: session.user.email ?? "",
    name: session.user.name ?? "",
  };
}

// ── Broker: Manage NDA for a listing ──

export async function getListingNda(
  listingId: string
): Promise<ListingNda | null> {
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("listing_ndas")
    .select("*")
    .eq("listing_id", listingId)
    .single();
  return data ?? null;
}

export async function upsertListingNda(
  listingId: string,
  ndaText: string,
  isRequired: boolean
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { userId } = await requireBroker();
  const supabase = createServiceRoleClient();

  // Verify broker owns this listing
  const { data: listing } = await supabase
    .from("listings")
    .select("id, broker_id, agency_id")
    .eq("id", listingId)
    .single();
  if (!listing) return { ok: false, error: "Listing not found." };

  // Check ownership: direct or agency
  if (listing.broker_id !== userId) {
    if (listing.agency_id) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("agency_id, agency_role")
        .eq("id", userId)
        .single();
      if (
        !profile ||
        profile.agency_id !== listing.agency_id ||
        profile.agency_role !== "owner"
      ) {
        return { ok: false, error: "You do not own this listing." };
      }
    } else {
      return { ok: false, error: "You do not own this listing." };
    }
  }

  const { error } = await supabase.from("listing_ndas").upsert(
    {
      listing_id: listingId,
      nda_text: ndaText,
      is_required: isRequired,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "listing_id" }
  );

  if (error) return { ok: false, error: "Failed to save NDA." };
  return { ok: true };
}

export async function deleteListingNda(
  listingId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireBroker();
  const supabase = createServiceRoleClient();
  const { error } = await supabase
    .from("listing_ndas")
    .delete()
    .eq("listing_id", listingId);
  if (error) return { ok: false, error: "Failed to delete NDA." };
  return { ok: true };
}

// ── Buyer: Sign NDA ──

export async function signNda(
  listingId: string,
  signatureData: string,
  signerName: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { userId, email } = await requireUser();
  const supabase = createServiceRoleClient();

  // Verify NDA exists and listing is published
  const { data: nda } = await supabase
    .from("listing_ndas")
    .select("id, listing_id, is_required")
    .eq("listing_id", listingId)
    .single();
  if (!nda) return { ok: false, error: "No NDA found for this listing." };

  const { data: listing } = await supabase
    .from("listings")
    .select("id, status")
    .eq("id", listingId)
    .eq("status", "published")
    .single();
  if (!listing) return { ok: false, error: "Listing not found." };

  if (!signerName.trim()) {
    return { ok: false, error: "Please enter your full name." };
  }
  if (!signatureData) {
    return { ok: false, error: "Please provide your signature." };
  }

  const { error } = await supabase.from("nda_signatures").upsert(
    {
      listing_id: listingId,
      user_id: userId,
      signer_name: signerName.trim(),
      signer_email: email,
      signature_data: signatureData,
      signed_at: new Date().toISOString(),
    },
    { onConflict: "listing_id,user_id" }
  );

  if (error) return { ok: false, error: "Failed to sign NDA." };
  return { ok: true };
}

// ── Check NDA status ──

export async function hasSignedNda(
  listingId: string,
  userId: string
): Promise<boolean> {
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("nda_signatures")
    .select("id")
    .eq("listing_id", listingId)
    .eq("user_id", userId)
    .single();
  return !!data;
}

export async function getNdaSignaturesForListing(
  listingId: string
): Promise<NdaSignature[]> {
  await requireBroker();
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("nda_signatures")
    .select("*")
    .eq("listing_id", listingId)
    .order("signed_at", { ascending: false });
  return data ?? [];
}

/** Broker: get all NDA signatures across all their listings. Agency owners see all agency signatures. */
export async function getBrokerNdaSignatures(): Promise<NdaSignatureWithListing[]> {
  const { userId, agencyId } = await requireBroker();
  const supabase = createServiceRoleClient();

  // Get broker's listing IDs (or all agency listing IDs if owner)
  let listingIds: string[] = [];
  if (agencyId) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("agency_role")
      .eq("id", userId)
      .single();

    if (profile?.agency_role === "owner") {
      const { data: listings } = await supabase
        .from("listings")
        .select("id")
        .eq("agency_id", agencyId);
      listingIds = (listings ?? []).map((l) => l.id);
    } else {
      const { data: listings } = await supabase
        .from("listings")
        .select("id")
        .eq("broker_id", userId);
      listingIds = (listings ?? []).map((l) => l.id);
    }
  } else {
    const { data: listings } = await supabase
      .from("listings")
      .select("id")
      .eq("broker_id", userId);
    listingIds = (listings ?? []).map((l) => l.id);
  }

  if (listingIds.length === 0) return [];

  const { data } = await supabase
    .from("nda_signatures")
    .select(`*, listing:listings(id, title, slug)`)
    .in("listing_id", listingIds)
    .order("signed_at", { ascending: false });

  const rows = (data ?? []) as (NdaSignature & {
    listing?: { id: string; title: string; slug: string }[] | { id: string; title: string; slug: string };
  })[];

  return rows.map((r) => ({
    ...r,
    listing: Array.isArray(r.listing) ? r.listing[0] ?? null : r.listing ?? null,
  }));
}

export async function getListingNdaStatus(listingId: string): Promise<{
  hasNda: boolean;
  ndaText: string | null;
  hasSigned: boolean;
}> {
  const { getServerSession } = await import("next-auth");
  const { authOptions } = await import("@/lib/auth");
  const session = await getServerSession(authOptions);

  const supabase = createServiceRoleClient();
  const { data: nda } = await supabase
    .from("listing_ndas")
    .select("nda_text, is_required")
    .eq("listing_id", listingId)
    .single();

  if (!nda || !nda.is_required) {
    return { hasNda: false, ndaText: null, hasSigned: false };
  }

  let hasSigned = false;
  if (session?.user?.id) {
    const { data: sig } = await supabase
      .from("nda_signatures")
      .select("id")
      .eq("listing_id", listingId)
      .eq("user_id", session.user.id)
      .single();
    hasSigned = !!sig;
  }

  return { hasNda: true, ndaText: nda.nda_text, hasSigned };
}

// ── Admin: View all NDA signatures ──

async function requireAdmin() {
  const { getServerSession } = await import("next-auth");
  const { authOptions } = await import("@/lib/auth");
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "admin") {
    throw new Error("Unauthorized");
  }
  return { userId: session.user.id };
}

export type AdminNdaSignature = NdaSignature & {
  listing?: { id: string; title: string; slug: string } | null;
};

export async function getAllNdaSignatures(options?: {
  page?: number;
  pageSize?: number;
  listingId?: string | null;
}): Promise<{ signatures: AdminNdaSignature[]; total: number }> {
  await requireAdmin();
  const supabase = createServiceRoleClient();

  const page = Math.max(1, options?.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, options?.pageSize ?? 20));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("nda_signatures")
    .select(
      `*, listing:listings(id, title, slug)`,
      { count: "exact" }
    )
    .order("signed_at", { ascending: false });

  if (options?.listingId?.trim()) {
    query = query.eq("listing_id", options.listingId.trim());
  }

  const { data, error, count } = await query.range(from, to);
  if (error) return { signatures: [], total: 0 };

  const rows = (data ?? []) as (NdaSignature & {
    listing?: { id: string; title: string; slug: string }[] | { id: string; title: string; slug: string };
  })[];

  const signatures: AdminNdaSignature[] = rows.map((r) => ({
    ...r,
    listing: Array.isArray(r.listing) ? r.listing[0] ?? null : r.listing ?? null,
  }));

  return { signatures, total: count ?? 0 };
}

export async function getAdminNdaStats(): Promise<{
  totalSignatures: number;
  listingsWithNda: number;
  recentSignatures: number;
}> {
  await requireAdmin();
  const supabase = createServiceRoleClient();

  const [sigCount, ndaCount, recentCount] = await Promise.all([
    supabase
      .from("nda_signatures")
      .select("id", { count: "exact", head: true }),
    supabase
      .from("listing_ndas")
      .select("id", { count: "exact", head: true })
      .eq("is_required", true),
    supabase
      .from("nda_signatures")
      .select("id", { count: "exact", head: true })
      .gte("signed_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
  ]);

  return {
    totalSignatures: sigCount.count ?? 0,
    listingsWithNda: ndaCount.count ?? 0,
    recentSignatures: recentCount.count ?? 0,
  };
}
