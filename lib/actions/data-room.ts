"use server";

import { createServiceRoleClient } from "@/lib/supabase/admin";
import { createNotification } from "@/lib/actions/notifications";
import { autoAdvanceContactStatus } from "@/lib/actions/crm";
import { getOrCreateBrokerContactForBuyer } from "@/lib/actions/contacts";
import type {
  BuyerDataRoomAccess,
  BuyerDataRoomPermission,
  DataRoomAccessLevel,
  DataRoomAccessStatus,
  DataRoomAccessWithBuyer,
  DocumentFolder,
  FolderTreeNode,
} from "@/lib/types/data-room";
import type { ListingDocument } from "@/lib/types/documents";

type Result<T = void> =
  | (T extends void ? { ok: true } : { ok: true } & T)
  | { ok: false; error: string };

// ── Auth helpers ─────────────────────────────────────────────

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

async function requireBuyer() {
  const { getServerSession } = await import("next-auth");
  const { authOptions } = await import("@/lib/auth");
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");
  return {
    userId: session.user.id,
    email: session.user.email ?? "",
    name: session.user.name ?? "",
  };
}

async function verifyListingOwnership(
  listingId: string,
  userId: string,
): Promise<{ ok: true; brokerId: string } | { ok: false }> {
  const supabase = createServiceRoleClient();
  const { data: listing } = await supabase
    .from("listings")
    .select("id, broker_id, agency_id")
    .eq("id", listingId)
    .single();
  if (!listing) return { ok: false };

  if (listing.broker_id === userId) {
    return { ok: true, brokerId: listing.broker_id };
  }

  if (listing.agency_id) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("agency_id, agency_role")
      .eq("id", userId)
      .single();
    if (
      profile &&
      profile.agency_id === listing.agency_id &&
      profile.agency_role === "owner"
    ) {
      return { ok: true, brokerId: listing.broker_id };
    }
  }
  return { ok: false };
}

// ── Buyer-side: request access ───────────────────────────────

/**
 * Buyer requests access to a listing's Virtual Data Room. Idempotent — if a record
 * already exists in any state we either return the existing approval (and
 * touch nothing) or reset a denied/revoked/expired record back to pending.
 *
 * NB: NDA signing is a separate step and goes through `signNda()`; this
 * action only creates the access intent. The Phase 2 UI calls this *after*
 * the buyer has signed the NDA.
 */
export async function requestDataRoomAccess(
  listingId: string,
): Promise<Result<{ accessId: string; status: DataRoomAccessStatus }>> {
  const { userId, email, name } = await requireBuyer();
  const supabase = createServiceRoleClient();

  const { data: listing } = await supabase
    .from("listings")
    .select("id, title, broker_id, status, is_private")
    .eq("id", listingId)
    .single();
  if (!listing || listing.status !== "published" || listing.is_private) {
    return { ok: false, error: "Listing not available." };
  }

  const { data: existing } = await supabase
    .from("buyer_data_room_access")
    .select("id, status")
    .eq("listing_id", listingId)
    .eq("buyer_id", userId)
    .maybeSingle();

  let accessId: string;
  let status: DataRoomAccessStatus;

  if (existing) {
    accessId = existing.id;
    if (existing.status === "approved") {
      return { ok: true, accessId, status: "approved" };
    }
    // Re-open denied/revoked/expired back to pending.
    if (existing.status !== "pending") {
      const { error } = await supabase
        .from("buyer_data_room_access")
        .update({
          status: "pending",
          requested_at: new Date().toISOString(),
          reviewed_at: null,
          reviewed_by: null,
          denial_reason: null,
          expired_at: null,
          revoked_at: null,
        })
        .eq("id", accessId);
      if (error) return { ok: false, error: "Failed to re-request access." };
    }
    status = "pending";
  } else {
    const { data: inserted, error } = await supabase
      .from("buyer_data_room_access")
      .insert({
        listing_id: listingId,
        buyer_id: userId,
        status: "pending",
        access_level: "all",
      })
      .select("id")
      .single();
    if (error || !inserted) {
      return { ok: false, error: "Failed to request access." };
    }
    accessId = inserted.id;
    status = "pending";
  }

  if (listing.broker_id) {
    const buyerLabel = name?.trim() || email || "A buyer";
    const listTitle = listing.title?.trim() || "your listing";
    createNotification({
      userId: listing.broker_id,
      type: "data_room_request",
      title: "Virtual Data Room access request",
      message: `${buyerLabel} has requested access to the Virtual Data Room for “${listTitle}”.`,
      link: `/dashboard/listings/${listingId}/data-room`,
    }).catch(() => {});

    // Mirror into CRM so the broker has a contact row to act on.
    void getOrCreateBrokerContactForBuyer({
      brokerId: listing.broker_id,
      buyerUserId: userId,
      email,
      name: name?.trim() || null,
      source: "enquiry",
      firstInteractionAt: new Date().toISOString(),
    }).catch(() => null);
  }

  return { ok: true, accessId, status };
}

// ── Buyer-side: read own access for a listing ────────────────

export async function getBuyerDataRoomAccess(
  listingId: string,
  buyerId: string,
): Promise<BuyerDataRoomAccess | null> {
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("buyer_data_room_access")
    .select("*")
    .eq("listing_id", listingId)
    .eq("buyer_id", buyerId)
    .maybeSingle();
  return data ?? null;
}

/**
 * Returns the document + folder ids the buyer is allowed to see for an
 * approved access record. When `access_level = 'all'`, both lists are empty
 * and the caller should treat the access as "every approved document".
 */
export async function getBuyerAllowedTargets(
  accessId: string,
): Promise<{ folderIds: string[]; documentIds: string[] }> {
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("buyer_data_room_permissions")
    .select("folder_id, document_id")
    .eq("access_id", accessId);
  const folderIds: string[] = [];
  const documentIds: string[] = [];
  for (const row of data ?? []) {
    if (row.folder_id) folderIds.push(row.folder_id);
    if (row.document_id) documentIds.push(row.document_id);
  }
  return { folderIds, documentIds };
}

// ── Broker-side: list & inspect access records ──────────────

export type DataRoomAccessFilter = {
  status?: DataRoomAccessStatus | "all";
};

export async function listListingDataRoomAccess(
  listingId: string,
  filter: DataRoomAccessFilter = {},
): Promise<DataRoomAccessWithBuyer[]> {
  const { userId } = await requireBroker();
  const own = await verifyListingOwnership(listingId, userId);
  if (!own.ok) return [];

  const supabase = createServiceRoleClient();
  let query = supabase
    .from("buyer_data_room_access")
    .select("*")
    .eq("listing_id", listingId)
    .order("requested_at", { ascending: false });

  if (filter.status && filter.status !== "all") {
    query = query.eq("status", filter.status);
  }

  const { data: accessRows, error } = await query;
  if (error || !accessRows?.length) return [];

  const buyerIds = [...new Set(accessRows.map((r) => r.buyer_id))];
  const accessIds = accessRows.map((r) => r.id);

  const [profilesRes, usersRes, ndaRes, permsRes] = await Promise.all([
    supabase.from("profiles").select("id, name").in("id", buyerIds),
    supabase.from("users").select("id, email").in("id", buyerIds),
    supabase
      .from("nda_signatures")
      .select("user_id, signed_at")
      .eq("listing_id", listingId)
      .in("user_id", buyerIds),
    supabase
      .from("buyer_data_room_permissions")
      .select("access_id, folder_id, document_id")
      .in("access_id", accessIds),
  ]);

  const profByUid = new Map((profilesRes.data ?? []).map((p) => [p.id, p.name]));
  const emailByUid = new Map((usersRes.data ?? []).map((u) => [u.id, u.email]));
  const ndaByUid = new Map(
    (ndaRes.data ?? []).map((s) => [s.user_id, s.signed_at]),
  );

  const folderIdsByAccess = new Map<string, string[]>();
  const docIdsByAccess = new Map<string, string[]>();
  for (const p of permsRes.data ?? []) {
    if (p.folder_id) {
      const arr = folderIdsByAccess.get(p.access_id) ?? [];
      arr.push(p.folder_id);
      folderIdsByAccess.set(p.access_id, arr);
    }
    if (p.document_id) {
      const arr = docIdsByAccess.get(p.access_id) ?? [];
      arr.push(p.document_id);
      docIdsByAccess.set(p.access_id, arr);
    }
  }

  return accessRows.map<DataRoomAccessWithBuyer>((row) => ({
    ...row,
    buyer: {
      id: row.buyer_id,
      full_name: profByUid.get(row.buyer_id) ?? null,
      email: emailByUid.get(row.buyer_id) ?? "",
    },
    nda_signed_at: ndaByUid.get(row.buyer_id) ?? null,
    granted_folder_ids: folderIdsByAccess.get(row.id) ?? [],
    granted_document_ids: docIdsByAccess.get(row.id) ?? [],
  }));
}

export type ListingDataRoomCounts = {
  pending: number;
  approved: number;
  denied: number;
  revoked: number;
  expired: number;
};

export async function getListingDataRoomCounts(
  listingId: string,
): Promise<ListingDataRoomCounts> {
  const empty: ListingDataRoomCounts = {
    pending: 0,
    approved: 0,
    denied: 0,
    revoked: 0,
    expired: 0,
  };
  const { userId } = await requireBroker();
  const own = await verifyListingOwnership(listingId, userId);
  if (!own.ok) return empty;

  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("buyer_data_room_access")
    .select("status")
    .eq("listing_id", listingId);
  if (!data) return empty;
  const counts = { ...empty };
  for (const row of data) {
    if (row.status in counts) {
      counts[row.status as keyof ListingDataRoomCounts] += 1;
    }
  }
  return counts;
}

// ── Broker-side: approve / deny / revoke ────────────────────

export type ApproveDataRoomAccessInput = {
  accessId: string;
  accessLevel: DataRoomAccessLevel;
  folderIds?: string[];
  documentIds?: string[];
  downloadAllowed?: boolean;
  expiresAt?: string | null;
  brokerNotes?: string | null;
};

export async function approveDataRoomAccess(
  input: ApproveDataRoomAccessInput,
): Promise<Result> {
  const { userId } = await requireBroker();
  const supabase = createServiceRoleClient();

  const { data: access } = await supabase
    .from("buyer_data_room_access")
    .select("id, listing_id, buyer_id, status")
    .eq("id", input.accessId)
    .single();
  if (!access) return { ok: false, error: "Access request not found." };

  const own = await verifyListingOwnership(access.listing_id, userId);
  if (!own.ok) return { ok: false, error: "You do not own this listing." };

  if (input.accessLevel === "selected") {
    const hasAny =
      (input.folderIds?.length ?? 0) > 0 ||
      (input.documentIds?.length ?? 0) > 0;
    if (!hasAny) {
      return {
        ok: false,
        error: "Select at least one folder or file for 'selected' access.",
      };
    }
  }

  const now = new Date().toISOString();
  const { error: updErr } = await supabase
    .from("buyer_data_room_access")
    .update({
      status: "approved",
      access_level: input.accessLevel,
      download_allowed: input.downloadAllowed ?? true,
      expires_at: input.expiresAt ?? null,
      reviewed_at: now,
      reviewed_by: userId,
      denial_reason: null,
      expired_at: null,
      revoked_at: null,
      broker_notes: input.brokerNotes ?? null,
    })
    .eq("id", access.id);
  if (updErr) return { ok: false, error: "Failed to approve access." };

  // Clear and rewrite permission rows so the new state is authoritative.
  await supabase
    .from("buyer_data_room_permissions")
    .delete()
    .eq("access_id", access.id);

  if (input.accessLevel === "selected") {
    const rows: {
      access_id: string;
      folder_id: string | null;
      document_id: string | null;
      granted_by: string;
    }[] = [];
    for (const folderId of input.folderIds ?? []) {
      rows.push({
        access_id: access.id,
        folder_id: folderId,
        document_id: null,
        granted_by: userId,
      });
    }
    for (const docId of input.documentIds ?? []) {
      rows.push({
        access_id: access.id,
        folder_id: null,
        document_id: docId,
        granted_by: userId,
      });
    }
    if (rows.length > 0) {
      const { error: permErr } = await supabase
        .from("buyer_data_room_permissions")
        .insert(rows);
      if (permErr) {
        return { ok: false, error: "Failed to save permissions." };
      }
    }
  }

  // Notify buyer + advance CRM pipeline.
  const { data: listing } = await supabase
    .from("listings")
    .select("title")
    .eq("id", access.listing_id)
    .single();

  createNotification({
    userId: access.buyer_id,
    type: "access_approved",
    title: "Virtual Data Room access approved",
    message: `Your access to “${listing?.title ?? "the listing"}” has been approved.`,
    link: `/account/vault`,
  }).catch(() => {});

  void autoAdvanceContactStatus({
    brokerId: own.brokerId,
    buyerUserId: access.buyer_id,
    target: "documents_shared",
    triggeredByKind: "status_changed",
  });

  return { ok: true };
}

export async function denyDataRoomAccess(
  accessId: string,
  reason: string,
): Promise<Result> {
  const trimmed = reason?.trim();
  if (!trimmed) {
    return { ok: false, error: "Please provide a reason for denial." };
  }
  const { userId } = await requireBroker();
  const supabase = createServiceRoleClient();

  const { data: access } = await supabase
    .from("buyer_data_room_access")
    .select("id, listing_id, buyer_id")
    .eq("id", accessId)
    .single();
  if (!access) return { ok: false, error: "Access request not found." };

  const own = await verifyListingOwnership(access.listing_id, userId);
  if (!own.ok) return { ok: false, error: "You do not own this listing." };

  const { error } = await supabase
    .from("buyer_data_room_access")
    .update({
      status: "denied",
      reviewed_at: new Date().toISOString(),
      reviewed_by: userId,
      denial_reason: trimmed,
    })
    .eq("id", accessId);
  if (error) return { ok: false, error: "Failed to deny access." };

  await supabase
    .from("buyer_data_room_permissions")
    .delete()
    .eq("access_id", accessId);

  const { data: listing } = await supabase
    .from("listings")
    .select("title")
    .eq("id", access.listing_id)
    .maybeSingle();
  createNotification({
    userId: access.buyer_id,
    type: "general",
    title: "Virtual Data Room access declined",
    message: `Your access request for “${listing?.title ?? "the listing"}” was declined.`,
    link: "/account/vault",
  }).catch(() => {});

  return { ok: true };
}

export async function revokeDataRoomAccess(
  accessId: string,
): Promise<Result> {
  const { userId } = await requireBroker();
  const supabase = createServiceRoleClient();

  const { data: access } = await supabase
    .from("buyer_data_room_access")
    .select("id, listing_id, buyer_id, status")
    .eq("id", accessId)
    .single();
  if (!access) return { ok: false, error: "Access record not found." };
  if (access.status !== "approved") {
    return { ok: false, error: "Only approved access can be revoked." };
  }

  const own = await verifyListingOwnership(access.listing_id, userId);
  if (!own.ok) return { ok: false, error: "You do not own this listing." };

  const { error } = await supabase
    .from("buyer_data_room_access")
    .update({
      status: "revoked",
      revoked_at: new Date().toISOString(),
      reviewed_at: new Date().toISOString(),
      reviewed_by: userId,
    })
    .eq("id", accessId);
  if (error) return { ok: false, error: "Failed to revoke access." };

  await supabase
    .from("buyer_data_room_permissions")
    .delete()
    .eq("access_id", accessId);

  return { ok: true };
}

export type UpdateDataRoomAccessInput = {
  accessId: string;
  accessLevel?: DataRoomAccessLevel;
  folderIds?: string[];
  documentIds?: string[];
  downloadAllowed?: boolean;
  expiresAt?: string | null;
  brokerNotes?: string | null;
};

/** Edit an already-approved access record's permissions / expiry / notes. */
export async function updateDataRoomAccess(
  input: UpdateDataRoomAccessInput,
): Promise<Result> {
  const { userId } = await requireBroker();
  const supabase = createServiceRoleClient();

  const { data: access } = await supabase
    .from("buyer_data_room_access")
    .select("id, listing_id, status, access_level")
    .eq("id", input.accessId)
    .single();
  if (!access) return { ok: false, error: "Access record not found." };
  if (access.status !== "approved") {
    return { ok: false, error: "Only approved access can be edited." };
  }

  const own = await verifyListingOwnership(access.listing_id, userId);
  if (!own.ok) return { ok: false, error: "You do not own this listing." };

  const nextAccessLevel = input.accessLevel ?? access.access_level;
  if (nextAccessLevel === "selected") {
    const hasAny =
      (input.folderIds?.length ?? 0) > 0 ||
      (input.documentIds?.length ?? 0) > 0;
    if (!hasAny) {
      return {
        ok: false,
        error: "Select at least one folder or file for 'selected' access.",
      };
    }
  }

  const patch: Record<string, unknown> = {};
  if (input.accessLevel !== undefined) patch.access_level = input.accessLevel;
  if (input.downloadAllowed !== undefined)
    patch.download_allowed = input.downloadAllowed;
  if (input.expiresAt !== undefined) patch.expires_at = input.expiresAt;
  if (input.brokerNotes !== undefined) patch.broker_notes = input.brokerNotes;

  if (Object.keys(patch).length > 0) {
    const { error } = await supabase
      .from("buyer_data_room_access")
      .update(patch)
      .eq("id", access.id);
    if (error) return { ok: false, error: "Failed to update access." };
  }

  // Rewrite permissions only if caller passed new lists or changed level.
  const permsTouched =
    input.folderIds !== undefined ||
    input.documentIds !== undefined ||
    input.accessLevel !== undefined;
  if (permsTouched) {
    await supabase
      .from("buyer_data_room_permissions")
      .delete()
      .eq("access_id", access.id);

    if (nextAccessLevel === "selected") {
      const rows: {
        access_id: string;
        folder_id: string | null;
        document_id: string | null;
        granted_by: string;
      }[] = [];
      for (const folderId of input.folderIds ?? []) {
        rows.push({
          access_id: access.id,
          folder_id: folderId,
          document_id: null,
          granted_by: userId,
        });
      }
      for (const docId of input.documentIds ?? []) {
        rows.push({
          access_id: access.id,
          folder_id: null,
          document_id: docId,
          granted_by: userId,
        });
      }
      if (rows.length > 0) {
        const { error: permErr } = await supabase
          .from("buyer_data_room_permissions")
          .insert(rows);
        if (permErr) return { ok: false, error: "Failed to save permissions." };
      }
    }
  }

  return { ok: true };
}

// ── Broker-side: cross-listing queue ─────────────────────────

export type BrokerDataRoomQueueRow = {
  access_id: string;
  listing_id: string;
  listing_title: string | null;
  listing_slug: string | null;
  buyer_id: string;
  buyer_name: string | null;
  buyer_email: string;
  status: DataRoomAccessStatus;
  requested_at: string;
  nda_signed_at: string | null;
};

/** Pending data-room access requests across every listing the broker controls. */
export async function getBrokerDataRoomQueue(): Promise<
  BrokerDataRoomQueueRow[]
> {
  const { userId, agencyId, agencyRole } = await requireBroker();
  const supabase = createServiceRoleClient();

  let listingIds: string[] = [];
  if (agencyId && agencyRole === "owner") {
    const { data: ls } = await supabase
      .from("listings")
      .select("id, title, slug")
      .eq("agency_id", agencyId);
    listingIds = (ls ?? []).map((l) => l.id);
  } else {
    const { data: ls } = await supabase
      .from("listings")
      .select("id, title, slug")
      .eq("broker_id", userId);
    listingIds = (ls ?? []).map((l) => l.id);
  }
  if (listingIds.length === 0) return [];

  const { data: rows } = await supabase
    .from("buyer_data_room_access")
    .select("*")
    .in("listing_id", listingIds)
    .eq("status", "pending")
    .order("requested_at", { ascending: false });
  if (!rows?.length) return [];

  const buyerIds = [...new Set(rows.map((r) => r.buyer_id))];

  const [listingsRes, profilesRes, usersRes, ndaRes] = await Promise.all([
    supabase
      .from("listings")
      .select("id, title, slug")
      .in("id", listingIds),
    supabase.from("profiles").select("id, name").in("id", buyerIds),
    supabase.from("users").select("id, email").in("id", buyerIds),
    supabase
      .from("nda_signatures")
      .select("listing_id, user_id, signed_at")
      .in("listing_id", listingIds)
      .in("user_id", buyerIds),
  ]);

  const listMap = new Map(
    (listingsRes.data ?? []).map((l) => [l.id, l]),
  );
  const profMap = new Map((profilesRes.data ?? []).map((p) => [p.id, p.name]));
  const emailMap = new Map((usersRes.data ?? []).map((u) => [u.id, u.email]));
  const ndaMap = new Map(
    (ndaRes.data ?? []).map((s) => [`${s.listing_id}:${s.user_id}`, s.signed_at]),
  );

  return rows.map<BrokerDataRoomQueueRow>((r) => {
    const l = listMap.get(r.listing_id);
    return {
      access_id: r.id,
      listing_id: r.listing_id,
      listing_title: l?.title ?? null,
      listing_slug: l?.slug ?? null,
      buyer_id: r.buyer_id,
      buyer_name: profMap.get(r.buyer_id) ?? null,
      buyer_email: emailMap.get(r.buyer_id) ?? "",
      status: r.status,
      requested_at: r.requested_at,
      nda_signed_at: ndaMap.get(`${r.listing_id}:${r.buyer_id}`) ?? null,
    };
  });
}

// ── Expiry sweep (cron-callable) ─────────────────────────────

/**
 * Marks expired data-room access records and notifies buyers.
 * Idempotent — safe to run repeatedly. Intended for a daily cron job.
 */
export async function expireDataRoomAccessSweep(): Promise<{
  expired: number;
  expiringSoon: number;
}> {
  const supabase = createServiceRoleClient();
  const nowIso = new Date().toISOString();
  const threeDays = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();

  // 1. Hard-expire anything past expires_at.
  const { data: expiringNow } = await supabase
    .from("buyer_data_room_access")
    .select("id, buyer_id, listing_id")
    .eq("status", "approved")
    .not("expires_at", "is", null)
    .lt("expires_at", nowIso);

  if (expiringNow?.length) {
    await supabase
      .from("buyer_data_room_access")
      .update({ status: "expired", expired_at: nowIso })
      .in(
        "id",
        expiringNow.map((r) => r.id),
      );
    await supabase
      .from("buyer_data_room_permissions")
      .delete()
      .in(
        "access_id",
        expiringNow.map((r) => r.id),
      );

    const listingIds = [...new Set(expiringNow.map((r) => r.listing_id))];
    const { data: listings } = await supabase
      .from("listings")
      .select("id, title")
      .in("id", listingIds);
    const titleByLid = new Map((listings ?? []).map((l) => [l.id, l.title]));

    for (const row of expiringNow) {
      createNotification({
        userId: row.buyer_id,
        type: "access_expired",
        title: "Virtual Data Room access expired",
        message: `Your access to “${titleByLid.get(row.listing_id) ?? "the listing"}” has expired.`,
        link: "/account/vault",
      }).catch(() => {});
    }
  }

  // 2. Warn buyers whose access expires in the next 3 days (one notification
  //    per buyer+listing — we use a simple existence check on notifications
  //    to avoid spamming; cron runs daily so this stays cheap).
  const { data: expiringSoonRows } = await supabase
    .from("buyer_data_room_access")
    .select("id, buyer_id, listing_id, expires_at")
    .eq("status", "approved")
    .not("expires_at", "is", null)
    .gte("expires_at", nowIso)
    .lt("expires_at", threeDays);

  let expiringSoon = 0;
  if (expiringSoonRows?.length) {
    const listingIds = [...new Set(expiringSoonRows.map((r) => r.listing_id))];
    const { data: listings } = await supabase
      .from("listings")
      .select("id, title")
      .in("id", listingIds);
    const titleByLid = new Map((listings ?? []).map((l) => [l.id, l.title]));

    for (const row of expiringSoonRows) {
      // Idempotency: only fire once per access record by checking for an
      // existing notification linking to the buyer's vault for this listing
      // in the last 4 days.
      const { count } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", row.buyer_id)
        .eq("type", "access_expiring")
        .gte(
          "created_at",
          new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
        );
      if ((count ?? 0) > 0) continue;

      createNotification({
        userId: row.buyer_id,
        type: "access_expiring",
        title: "Virtual Data Room access expiring soon",
        message: `Your access to “${titleByLid.get(row.listing_id) ?? "the listing"}” expires soon.`,
        link: "/account/vault",
      }).catch(() => {});
      expiringSoon += 1;
    }
  }

  return { expired: expiringNow?.length ?? 0, expiringSoon };
}

// ── Shared: read-side gating for documents/folders ───────────

/**
 * Returns whether a buyer can currently see a specific document on a listing.
 * Encapsulates the "approved + (all OR explicit grant) + not expired" logic
 * so server actions and read-side queries don't drift.
 */
export async function canBuyerAccessDocument(
  buyerId: string,
  documentId: string,
): Promise<{ allowed: boolean; downloadAllowed: boolean }> {
  const supabase = createServiceRoleClient();
  const { data: doc } = await supabase
    .from("listing_documents")
    .select("id, listing_id, folder_id, approval_status")
    .eq("id", documentId)
    .single();
  if (!doc || doc.approval_status !== "approved") {
    return { allowed: false, downloadAllowed: false };
  }

  const access = await getBuyerDataRoomAccess(doc.listing_id, buyerId);
  if (!access) return { allowed: false, downloadAllowed: false };
  if (access.status !== "approved") {
    return { allowed: false, downloadAllowed: false };
  }
  if (access.expires_at && new Date(access.expires_at) < new Date()) {
    return { allowed: false, downloadAllowed: false };
  }
  if (access.access_level === "all") {
    return { allowed: true, downloadAllowed: access.download_allowed };
  }

  const { folderIds, documentIds } = await getBuyerAllowedTargets(access.id);
  const folderMatches = doc.folder_id && folderIds.includes(doc.folder_id);
  const docMatches = documentIds.includes(documentId);
  return {
    allowed: !!(folderMatches || docMatches),
    downloadAllowed: !!(folderMatches || docMatches) && access.download_allowed,
  };
}

// ── Broker-side: activity tracking ──────────────────────────

export type DataRoomActivityEvent = {
  id: string;
  document_id: string;
  document_name: string | null;
  folder_path: string | null;
  user_id: string | null;
  buyer_name: string | null;
  buyer_email: string | null;
  event_kind: "view" | "download";
  occurred_at: string;
};

export type DataRoomActivitySummary = {
  perBuyer: Array<{
    buyer_id: string;
    buyer_name: string | null;
    buyer_email: string;
    views: number;
    downloads: number;
    distinct_documents: number;
    last_activity_at: string | null;
  }>;
  perDocument: Array<{
    document_id: string;
    document_name: string | null;
    folder_path: string | null;
    views: number;
    downloads: number;
    distinct_buyers: number;
    last_activity_at: string | null;
  }>;
  recent: DataRoomActivityEvent[];
};

export async function getListingDataRoomActivity(
  listingId: string,
  options: { recentLimit?: number } = {},
): Promise<DataRoomActivitySummary> {
  const empty: DataRoomActivitySummary = {
    perBuyer: [],
    perDocument: [],
    recent: [],
  };
  const { userId } = await requireBroker();
  const own = await verifyListingOwnership(listingId, userId);
  if (!own.ok) return empty;

  const supabase = createServiceRoleClient();
  const recentLimit = options.recentLimit ?? 50;

  const { data: events } = await supabase
    .from("document_events")
    .select("id, document_id, user_id, event_kind, occurred_at")
    .eq("listing_id", listingId)
    .order("occurred_at", { ascending: false })
    .limit(2000);
  if (!events?.length) return empty;

  const docIds = [...new Set(events.map((e) => e.document_id))];
  const buyerIds = [...new Set(events.map((e) => e.user_id).filter(Boolean) as string[])];

  const [docsRes, foldersRes, profilesRes, usersRes] = await Promise.all([
    supabase
      .from("listing_documents")
      .select("id, name, folder_id")
      .in("id", docIds),
    supabase
      .from("document_folders")
      .select("id, parent_folder_id, name")
      .eq("listing_id", listingId),
    buyerIds.length
      ? supabase.from("profiles").select("id, name").in("id", buyerIds)
      : Promise.resolve({ data: [] as { id: string; name: string | null }[] }),
    buyerIds.length
      ? supabase.from("users").select("id, email").in("id", buyerIds)
      : Promise.resolve({ data: [] as { id: string; email: string }[] }),
  ]);

  const docById = new Map(
    (docsRes.data ?? []).map((d) => [d.id, d]),
  );
  const folderById = new Map(
    (foldersRes.data ?? []).map((f) => [f.id, f]),
  );
  const profByUid = new Map((profilesRes.data ?? []).map((p) => [p.id, p.name]));
  const emailByUid = new Map((usersRes.data ?? []).map((u) => [u.id, u.email]));

  function folderPathFor(folderId: string | null): string | null {
    if (!folderId) return "Root";
    const parts: string[] = [];
    let cursor: string | null = folderId;
    while (cursor) {
      const f = folderById.get(cursor);
      if (!f) break;
      parts.unshift(f.name);
      cursor = f.parent_folder_id;
    }
    return parts.join(" / ") || null;
  }

  // Per-buyer aggregation
  const buyerAgg = new Map<
    string,
    {
      buyer_id: string;
      views: number;
      downloads: number;
      docSet: Set<string>;
      lastAt: string;
    }
  >();
  const docAgg = new Map<
    string,
    {
      document_id: string;
      views: number;
      downloads: number;
      buyerSet: Set<string>;
      lastAt: string;
    }
  >();

  for (const ev of events) {
    if (ev.user_id) {
      const b = buyerAgg.get(ev.user_id) ?? {
        buyer_id: ev.user_id,
        views: 0,
        downloads: 0,
        docSet: new Set<string>(),
        lastAt: ev.occurred_at,
      };
      if (ev.event_kind === "view") b.views += 1;
      else if (ev.event_kind === "download") b.downloads += 1;
      b.docSet.add(ev.document_id);
      if (ev.occurred_at > b.lastAt) b.lastAt = ev.occurred_at;
      buyerAgg.set(ev.user_id, b);
    }
    const d = docAgg.get(ev.document_id) ?? {
      document_id: ev.document_id,
      views: 0,
      downloads: 0,
      buyerSet: new Set<string>(),
      lastAt: ev.occurred_at,
    };
    if (ev.event_kind === "view") d.views += 1;
    else if (ev.event_kind === "download") d.downloads += 1;
    if (ev.user_id) d.buyerSet.add(ev.user_id);
    if (ev.occurred_at > d.lastAt) d.lastAt = ev.occurred_at;
    docAgg.set(ev.document_id, d);
  }

  return {
    perBuyer: Array.from(buyerAgg.values())
      .map((b) => ({
        buyer_id: b.buyer_id,
        buyer_name: profByUid.get(b.buyer_id) ?? null,
        buyer_email: emailByUid.get(b.buyer_id) ?? "",
        views: b.views,
        downloads: b.downloads,
        distinct_documents: b.docSet.size,
        last_activity_at: b.lastAt,
      }))
      .sort((a, b) =>
        (b.last_activity_at ?? "").localeCompare(a.last_activity_at ?? ""),
      ),
    perDocument: Array.from(docAgg.values())
      .map((d) => {
        const doc = docById.get(d.document_id);
        return {
          document_id: d.document_id,
          document_name: doc?.name ?? null,
          folder_path: folderPathFor(doc?.folder_id ?? null),
          views: d.views,
          downloads: d.downloads,
          distinct_buyers: d.buyerSet.size,
          last_activity_at: d.lastAt,
        };
      })
      .sort((a, b) =>
        (b.last_activity_at ?? "").localeCompare(a.last_activity_at ?? ""),
      ),
    recent: events.slice(0, recentLimit).map<DataRoomActivityEvent>((ev) => {
      const doc = docById.get(ev.document_id);
      return {
        id: ev.id,
        document_id: ev.document_id,
        document_name: doc?.name ?? null,
        folder_path: folderPathFor(doc?.folder_id ?? null),
        user_id: ev.user_id,
        buyer_name: ev.user_id ? profByUid.get(ev.user_id) ?? null : null,
        buyer_email: ev.user_id ? emailByUid.get(ev.user_id) ?? "" : "",
        event_kind: ev.event_kind,
        occurred_at: ev.occurred_at,
      };
    }),
  };
}

// ── Buyer-side: vault reads ─────────────────────────────────

export type BuyerVaultListing = {
  access: BuyerDataRoomAccess;
  listing: {
    id: string;
    title: string;
    slug: string;
    broker_id: string;
    location_text: string | null;
  };
  /** Latest file added timestamp (across files the buyer can see). */
  last_file_added_at: string | null;
  /** Number of files the buyer can see right now. */
  file_count: number;
};

/** Listings the current buyer has any access record to (any status). */
export async function getBuyerVaultListings(): Promise<BuyerVaultListing[]> {
  const { userId } = await requireBuyer();
  const supabase = createServiceRoleClient();

  const { data: accesses } = await supabase
    .from("buyer_data_room_access")
    .select("*")
    .eq("buyer_id", userId)
    .order("updated_at", { ascending: false });
  if (!accesses?.length) return [];

  const listingIds = [...new Set(accesses.map((a) => a.listing_id))];
  const { data: listings } = await supabase
    .from("listings")
    .select("id, title, slug, broker_id, location_text")
    .in("id", listingIds);
  const listingById = new Map(
    (listings ?? []).map((l) => [l.id, l]),
  );

  const out: BuyerVaultListing[] = [];
  for (const access of accesses) {
    const listing = listingById.get(access.listing_id);
    if (!listing) continue;
    let fileCount = 0;
    let lastAdded: string | null = null;
    if (access.status === "approved") {
      const filtered = await getApprovedDocumentsForBuyer(
        access as BuyerDataRoomAccess,
      );
      fileCount = filtered.length;
      for (const d of filtered) {
        if (!lastAdded || d.created_at > lastAdded) lastAdded = d.created_at;
      }
    }
    out.push({
      access: access as BuyerDataRoomAccess,
      listing,
      last_file_added_at: lastAdded,
      file_count: fileCount,
    });
  }
  return out;
}

async function getApprovedDocumentsForBuyer(
  access: BuyerDataRoomAccess,
): Promise<ListingDocument[]> {
  const supabase = createServiceRoleClient();
  const { data: docs } = await supabase
    .from("listing_documents")
    .select("*")
    .eq("listing_id", access.listing_id)
    .eq("approval_status", "approved");
  const all = (docs ?? []) as ListingDocument[];
  if (access.access_level === "all") return all;
  const { folderIds, documentIds } = await getBuyerAllowedTargets(access.id);
  const folderSet = new Set(folderIds);
  const docSet = new Set(documentIds);
  return all.filter(
    (d) =>
      docSet.has(d.id) || (d.folder_id !== null && folderSet.has(d.folder_id)),
  );
}

export type BuyerVaultListingDetail = {
  access: BuyerDataRoomAccess;
  listing: {
    id: string;
    title: string;
    slug: string;
    broker_id: string;
    location_text: string | null;
  };
  folders: DocumentFolder[];
  documents: ListingDocument[];
  /** Folder ids visible to the buyer (subset of folders). */
  visibleFolderIds: string[];
  isExpired: boolean;
  expiresAt: string | null;
  downloadAllowed: boolean;
};

/** Full vault view for one listing — folders + documents filtered to what the buyer can see. */
export async function getBuyerVaultListing(
  listingId: string,
): Promise<
  | { ok: true; data: BuyerVaultListingDetail }
  | { ok: false; error: string; reason?: "no_access" | "not_approved" | "expired" }
> {
  const { userId } = await requireBuyer();
  const supabase = createServiceRoleClient();

  const { data: access } = await supabase
    .from("buyer_data_room_access")
    .select("*")
    .eq("listing_id", listingId)
    .eq("buyer_id", userId)
    .maybeSingle();
  if (!access) {
    return { ok: false, error: "No access record for this listing.", reason: "no_access" };
  }
  const accessRow = access as BuyerDataRoomAccess;
  if (accessRow.status !== "approved") {
    return { ok: false, error: "Access not approved yet.", reason: "not_approved" };
  }
  const expired =
    accessRow.expires_at && new Date(accessRow.expires_at) < new Date();
  if (expired) {
    return { ok: false, error: "Access has expired.", reason: "expired" };
  }

  const { data: listing } = await supabase
    .from("listings")
    .select("id, title, slug, broker_id, location_text")
    .eq("id", listingId)
    .single();
  if (!listing) return { ok: false, error: "Listing not found." };

  const filteredDocs = await getApprovedDocumentsForBuyer(accessRow);

  // Determine which folders are visible. A folder is visible if:
  //   - access_level === 'all' (all listing folders)
  //   - it's explicitly granted
  //   - any descendant folder is granted (so we can render the path to it)
  //   - it contains at least one document the buyer can see
  const { data: allFolders } = await supabase
    .from("document_folders")
    .select("*")
    .eq("listing_id", listingId)
    .order("sort_order", { ascending: true });
  const folders = (allFolders ?? []) as DocumentFolder[];

  let visibleFolderIds: string[] = [];
  if (accessRow.access_level === "all") {
    visibleFolderIds = folders.map((f) => f.id);
  } else {
    const { folderIds } = await getBuyerAllowedTargets(accessRow.id);
    const grantedSet = new Set(folderIds);
    const folderContainsDocSet = new Set(
      filteredDocs
        .map((d) => d.folder_id)
        .filter((id): id is string => !!id),
    );
    const childByParent = new Map<string | null, DocumentFolder[]>();
    for (const f of folders) {
      const arr = childByParent.get(f.parent_folder_id) ?? [];
      arr.push(f);
      childByParent.set(f.parent_folder_id, arr);
    }
    const folderById = new Map(folders.map((f) => [f.id, f]));
    // Mark grants and ancestors
    const visible = new Set<string>();
    function ancestors(id: string) {
      let cursor: string | null = id;
      while (cursor) {
        if (visible.has(cursor)) break;
        visible.add(cursor);
        const f = folderById.get(cursor);
        cursor = f?.parent_folder_id ?? null;
      }
    }
    for (const id of grantedSet) ancestors(id);
    for (const id of folderContainsDocSet) ancestors(id);
    // Also include all descendants of a granted folder so the buyer can
    // navigate deeper if the broker granted a parent.
    function descendants(id: string) {
      const stack = [id];
      while (stack.length) {
        const cur = stack.pop()!;
        for (const child of childByParent.get(cur) ?? []) {
          if (!visible.has(child.id)) {
            visible.add(child.id);
            stack.push(child.id);
          }
        }
      }
    }
    for (const id of grantedSet) descendants(id);
    visibleFolderIds = Array.from(visible);
  }

  return {
    ok: true,
    data: {
      access: accessRow,
      listing,
      folders: folders.filter((f) => visibleFolderIds.includes(f.id)),
      documents: filteredDocs,
      visibleFolderIds,
      isExpired: false,
      expiresAt: accessRow.expires_at,
      downloadAllowed: accessRow.download_allowed,
    },
  };
}

// ── Folder management ───────────────────────────────────────

const DEFAULT_FOLDERS: { name: string; sort_order: number }[] = [
  { name: "Financials", sort_order: 0 },
  { name: "Lease", sort_order: 1 },
  { name: "Staff", sort_order: 2 },
  { name: "Equipment", sort_order: 3 },
  { name: "Legal", sort_order: 4 },
  { name: "Operations", sort_order: 5 },
];

/**
 * Ensure the listing has the default folder set. Idempotent — only inserts
 * folders that don't already exist by name at the root level. Safe to call
 * lazily the first time a broker opens the Virtual Data Room for a listing.
 */
export async function ensureDefaultFoldersForListing(
  listingId: string,
): Promise<Result> {
  const { userId } = await requireBroker();
  const own = await verifyListingOwnership(listingId, userId);
  if (!own.ok) return { ok: false, error: "You do not own this listing." };

  const supabase = createServiceRoleClient();
  const { data: existing } = await supabase
    .from("document_folders")
    .select("name")
    .eq("listing_id", listingId)
    .is("parent_folder_id", null);

  const have = new Set(
    (existing ?? []).map((f) => (f.name as string).toLowerCase()),
  );
  const missing = DEFAULT_FOLDERS.filter(
    (f) => !have.has(f.name.toLowerCase()),
  );
  if (missing.length === 0) return { ok: true };

  const { error } = await supabase.from("document_folders").insert(
    missing.map((f) => ({
      listing_id: listingId,
      parent_folder_id: null,
      name: f.name,
      sort_order: f.sort_order,
      created_by: userId,
    })),
  );
  if (error) return { ok: false, error: "Failed to create default folders." };
  return { ok: true };
}

export async function getListingFolders(
  listingId: string,
): Promise<DocumentFolder[]> {
  const { userId } = await requireBroker();
  const own = await verifyListingOwnership(listingId, userId);
  if (!own.ok) return [];

  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("document_folders")
    .select("*")
    .eq("listing_id", listingId)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
  return data ?? [];
}

/**
 * Returns the folder tree + all documents grouped by folder, suitable for
 * rendering the broker's data-room file browser. Documents at the root level
 * (folder_id IS NULL) are returned under a synthetic root node with id="".
 */
export async function getListingFolderTree(
  listingId: string,
): Promise<{ root: FolderTreeNode; foldersFlat: DocumentFolder[]; documents: ListingDocument[] }> {
  const { userId } = await requireBroker();
  const own = await verifyListingOwnership(listingId, userId);
  if (!own.ok) {
    return {
      root: emptyRoot(listingId).root,
      foldersFlat: [],
      documents: [],
    };
  }

  const supabase = createServiceRoleClient();
  const [foldersRes, docsRes] = await Promise.all([
    supabase
      .from("document_folders")
      .select("*")
      .eq("listing_id", listingId)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),
    supabase
      .from("listing_documents")
      .select("*")
      .eq("listing_id", listingId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
  ]);

  const folders = (foldersRes.data ?? []) as DocumentFolder[];
  const documents = (docsRes.data ?? []) as ListingDocument[];

  // Build node lookup keyed by folder id, plus a synthetic root.
  const nodesById = new Map<string, FolderTreeNode>();
  for (const f of folders) {
    nodesById.set(f.id, { ...f, children: [], documents: [] });
  }
  const root: FolderTreeNode = {
    ...emptyRoot(listingId).root,
    children: [],
    documents: [],
  };

  for (const node of nodesById.values()) {
    const parentId = node.parent_folder_id;
    if (parentId && nodesById.has(parentId)) {
      nodesById.get(parentId)!.children.push(node);
    } else {
      root.children.push(node);
    }
  }

  for (const doc of documents) {
    if (doc.folder_id && nodesById.has(doc.folder_id)) {
      nodesById.get(doc.folder_id)!.documents.push(doc);
    } else {
      root.documents.push(doc);
    }
  }

  return { root, foldersFlat: folders, documents };
}

function emptyRoot(listingId: string): { root: FolderTreeNode } {
  return {
    root: {
      id: "",
      listing_id: listingId,
      parent_folder_id: null,
      name: "Root",
      description: null,
      sort_order: 0,
      created_by: null,
      created_at: new Date(0).toISOString(),
      updated_at: new Date(0).toISOString(),
      children: [],
      documents: [],
    },
  };
}

export async function createFolder(input: {
  listingId: string;
  parentFolderId: string | null;
  name: string;
  description?: string | null;
}): Promise<Result<{ folder: DocumentFolder }>> {
  const name = input.name.trim();
  if (!name) return { ok: false, error: "Folder name is required." };
  if (name.length > 80) {
    return { ok: false, error: "Folder name must be 80 characters or fewer." };
  }

  const { userId } = await requireBroker();
  const own = await verifyListingOwnership(input.listingId, userId);
  if (!own.ok) return { ok: false, error: "You do not own this listing." };

  const supabase = createServiceRoleClient();

  if (input.parentFolderId) {
    const { data: parent } = await supabase
      .from("document_folders")
      .select("id, listing_id")
      .eq("id", input.parentFolderId)
      .single();
    if (!parent || parent.listing_id !== input.listingId) {
      return { ok: false, error: "Parent folder not found." };
    }
  }

  // Pick a sort_order after the highest existing sibling.
  const { data: siblings } = await supabase
    .from("document_folders")
    .select("sort_order")
    .eq("listing_id", input.listingId)
    .is("parent_folder_id", input.parentFolderId)
    .order("sort_order", { ascending: false })
    .limit(1);
  const nextSort = (siblings?.[0]?.sort_order ?? -1) + 1;

  const { data, error } = await supabase
    .from("document_folders")
    .insert({
      listing_id: input.listingId,
      parent_folder_id: input.parentFolderId,
      name,
      description: input.description ?? null,
      sort_order: nextSort,
      created_by: userId,
    })
    .select("*")
    .single();
  if (error || !data) {
    if (error?.code === "23505") {
      return { ok: false, error: "A folder with that name already exists here." };
    }
    return { ok: false, error: "Failed to create folder." };
  }
  return { ok: true, folder: data };
}

export async function renameFolder(input: {
  folderId: string;
  name: string;
  description?: string | null;
}): Promise<Result> {
  const name = input.name.trim();
  if (!name) return { ok: false, error: "Folder name is required." };

  const { userId } = await requireBroker();
  const supabase = createServiceRoleClient();
  const { data: folder } = await supabase
    .from("document_folders")
    .select("id, listing_id")
    .eq("id", input.folderId)
    .single();
  if (!folder) return { ok: false, error: "Folder not found." };

  const own = await verifyListingOwnership(folder.listing_id, userId);
  if (!own.ok) return { ok: false, error: "You do not own this listing." };

  const patch: Record<string, unknown> = { name };
  if (input.description !== undefined) patch.description = input.description;

  const { error } = await supabase
    .from("document_folders")
    .update(patch)
    .eq("id", input.folderId);
  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "A folder with that name already exists here." };
    }
    return { ok: false, error: "Failed to rename folder." };
  }
  return { ok: true };
}

export async function moveFolder(input: {
  folderId: string;
  newParentFolderId: string | null;
}): Promise<Result> {
  const { userId } = await requireBroker();
  const supabase = createServiceRoleClient();

  if (input.newParentFolderId === input.folderId) {
    return { ok: false, error: "A folder can't be its own parent." };
  }

  const { data: folder } = await supabase
    .from("document_folders")
    .select("id, listing_id")
    .eq("id", input.folderId)
    .single();
  if (!folder) return { ok: false, error: "Folder not found." };

  const own = await verifyListingOwnership(folder.listing_id, userId);
  if (!own.ok) return { ok: false, error: "You do not own this listing." };

  if (input.newParentFolderId) {
    const { data: parent } = await supabase
      .from("document_folders")
      .select("id, listing_id")
      .eq("id", input.newParentFolderId)
      .single();
    if (!parent || parent.listing_id !== folder.listing_id) {
      return { ok: false, error: "Destination folder not found." };
    }
    // Walk up the chain to make sure we're not creating a cycle (moving a
    // folder under one of its own descendants).
    let cursor: string | null = input.newParentFolderId;
    const seen = new Set<string>();
    while (cursor) {
      if (cursor === input.folderId) {
        return { ok: false, error: "Can't move a folder inside itself." };
      }
      if (seen.has(cursor)) break;
      seen.add(cursor);
      const upRes = await supabase
        .from("document_folders")
        .select("parent_folder_id")
        .eq("id", cursor)
        .maybeSingle();
      const upRow = upRes.data as { parent_folder_id: string | null } | null;
      cursor = upRow?.parent_folder_id ?? null;
    }
  }

  const { error } = await supabase
    .from("document_folders")
    .update({ parent_folder_id: input.newParentFolderId })
    .eq("id", input.folderId);
  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "A folder with that name already exists in the destination." };
    }
    return { ok: false, error: "Failed to move folder." };
  }
  return { ok: true };
}

export async function deleteFolder(folderId: string): Promise<Result> {
  const { userId } = await requireBroker();
  const supabase = createServiceRoleClient();

  const { data: folder } = await supabase
    .from("document_folders")
    .select("id, listing_id")
    .eq("id", folderId)
    .single();
  if (!folder) return { ok: false, error: "Folder not found." };

  const own = await verifyListingOwnership(folder.listing_id, userId);
  if (!own.ok) return { ok: false, error: "You do not own this listing." };

  // Block delete if the folder still has children or documents — broker must
  // move them out first to avoid silent data loss.
  const [{ count: childCount }, { count: docCount }] = await Promise.all([
    supabase
      .from("document_folders")
      .select("id", { count: "exact", head: true })
      .eq("parent_folder_id", folderId),
    supabase
      .from("listing_documents")
      .select("id", { count: "exact", head: true })
      .eq("folder_id", folderId),
  ]);
  if ((childCount ?? 0) > 0 || (docCount ?? 0) > 0) {
    return {
      ok: false,
      error: "Folder is not empty. Move or delete its files and subfolders first.",
    };
  }

  const { error } = await supabase
    .from("document_folders")
    .delete()
    .eq("id", folderId);
  if (error) return { ok: false, error: "Failed to delete folder." };

  // Drop any per-buyer permissions that pointed at this folder.
  await supabase
    .from("buyer_data_room_permissions")
    .delete()
    .eq("folder_id", folderId);

  return { ok: true };
}

// ── Document mutations beyond what /actions/documents.ts already provides ──

export async function updateDocument(input: {
  documentId: string;
  name?: string;
  description?: string | null;
  folderId?: string | null;
}): Promise<Result<{ document: ListingDocument }>> {
  const { userId } = await requireBroker();
  const supabase = createServiceRoleClient();

  const { data: doc } = await supabase
    .from("listing_documents")
    .select("id, listing_id")
    .eq("id", input.documentId)
    .single();
  if (!doc) return { ok: false, error: "Document not found." };

  const own = await verifyListingOwnership(doc.listing_id, userId);
  if (!own.ok) return { ok: false, error: "You do not own this listing." };

  const patch: Record<string, unknown> = {};
  if (input.name !== undefined) {
    const trimmed = input.name.trim();
    if (!trimmed) return { ok: false, error: "Document name is required." };
    patch.name = trimmed;
  }
  if (input.description !== undefined) patch.description = input.description;
  if (input.folderId !== undefined) {
    if (input.folderId) {
      const { data: targetFolder } = await supabase
        .from("document_folders")
        .select("id, listing_id")
        .eq("id", input.folderId)
        .single();
      if (!targetFolder || targetFolder.listing_id !== doc.listing_id) {
        return { ok: false, error: "Destination folder not found." };
      }
    }
    patch.folder_id = input.folderId;
  }
  if (Object.keys(patch).length === 0) {
    // Nothing to do — short-circuit and re-read.
    const { data: cur } = await supabase
      .from("listing_documents")
      .select("*")
      .eq("id", input.documentId)
      .single();
    if (!cur) return { ok: false, error: "Document not found." };
    return { ok: true, document: cur };
  }

  const { data: updated, error } = await supabase
    .from("listing_documents")
    .update(patch)
    .eq("id", input.documentId)
    .select("*")
    .single();
  if (error || !updated) {
    return { ok: false, error: "Failed to update document." };
  }
  return { ok: true, document: updated };
}

export async function moveDocuments(input: {
  documentIds: string[];
  folderId: string | null;
}): Promise<Result<{ moved: number }>> {
  if (input.documentIds.length === 0) {
    return { ok: true, moved: 0 };
  }
  const { userId } = await requireBroker();
  const supabase = createServiceRoleClient();

  const { data: docs } = await supabase
    .from("listing_documents")
    .select("id, listing_id")
    .in("id", input.documentIds);
  if (!docs?.length) return { ok: false, error: "No documents found." };

  const listingIds = [...new Set(docs.map((d) => d.listing_id))];
  if (listingIds.length !== 1) {
    return { ok: false, error: "Documents must belong to the same listing." };
  }
  const own = await verifyListingOwnership(listingIds[0], userId);
  if (!own.ok) return { ok: false, error: "You do not own this listing." };

  if (input.folderId) {
    const { data: folder } = await supabase
      .from("document_folders")
      .select("id, listing_id")
      .eq("id", input.folderId)
      .single();
    if (!folder || folder.listing_id !== listingIds[0]) {
      return { ok: false, error: "Destination folder not found." };
    }
  }

  const { error } = await supabase
    .from("listing_documents")
    .update({ folder_id: input.folderId })
    .in("id", input.documentIds);
  if (error) return { ok: false, error: "Failed to move documents." };

  return { ok: true, moved: input.documentIds.length };
}

/** Upload a document, with optional folder placement + description. */
export async function uploadListingDocumentToFolder(
  listingId: string,
  formData: FormData,
): Promise<
  | { ok: true; document: ListingDocument }
  | { ok: false; error: string }
> {
  const { userId } = await requireBroker();
  const own = await verifyListingOwnership(listingId, userId);
  if (!own.ok) return { ok: false, error: "You do not own this listing." };

  const file = formData.get("file") as File | null;
  const rawName = (formData.get("name") as string | null)?.trim() ?? "";
  const category = (formData.get("category") as string) || "other";
  const isConfidential = formData.get("is_confidential") === "true";
  const folderIdRaw = (formData.get("folder_id") as string | null)?.trim();
  const folderId = folderIdRaw && folderIdRaw.length > 0 ? folderIdRaw : null;
  const description = (formData.get("description") as string | null)?.trim() || null;

  if (!file || file.size === 0) {
    return { ok: false, error: "Please select a file." };
  }
  if (file.size > 50 * 1024 * 1024) {
    return { ok: false, error: "File must be under 50MB." };
  }
  const name = rawName || file.name.replace(/\.[^.]+$/, "");
  if (!name) return { ok: false, error: "Document name is required." };

  const supabase = createServiceRoleClient();

  if (folderId) {
    const { data: folder } = await supabase
      .from("document_folders")
      .select("id, listing_id")
      .eq("id", folderId)
      .single();
    if (!folder || folder.listing_id !== listingId) {
      return { ok: false, error: "Destination folder not found." };
    }
  }

  const ext = file.name.includes(".") ? file.name.split(".").pop() : "bin";
  const filePath = `${listingId}/${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("listing-documents")
    .upload(filePath, file, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
      cacheControl: "3600",
    });
  if (uploadError) return { ok: false, error: "Failed to upload file." };

  const { data: urlData } = await supabase.storage
    .from("listing-documents")
    .createSignedUrl(filePath, 60 * 60 * 24 * 365 * 10);
  const fileUrl = urlData?.signedUrl ?? filePath;

  const { data: doc, error: insertError } = await supabase
    .from("listing_documents")
    .insert({
      listing_id: listingId,
      folder_id: folderId,
      name,
      description,
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

  // Notify buyers with active access about new files in folders they can see.
  // Best-effort — never block the upload.
  void notifyBuyersOfNewFile(listingId, doc).catch(() => {});

  return { ok: true, document: doc };
}

async function notifyBuyersOfNewFile(
  listingId: string,
  doc: ListingDocument,
): Promise<void> {
  const supabase = createServiceRoleClient();
  const { data: listing } = await supabase
    .from("listings")
    .select("title")
    .eq("id", listingId)
    .maybeSingle();
  const title = listing?.title?.trim() || "the listing";

  const { data: accesses } = await supabase
    .from("buyer_data_room_access")
    .select("id, buyer_id, access_level")
    .eq("listing_id", listingId)
    .eq("status", "approved");
  if (!accesses?.length) return;

  for (const access of accesses) {
    let allowed = access.access_level === "all";
    if (!allowed) {
      const { folderIds, documentIds } = await getBuyerAllowedTargets(access.id);
      allowed =
        (doc.folder_id && folderIds.includes(doc.folder_id)) ||
        documentIds.includes(doc.id);
    }
    if (!allowed) continue;
    createNotification({
      userId: access.buyer_id,
      type: "new_files_added",
      title: "New file in Virtual Data Room",
      message: `A new file was added to “${title}”.`,
      link: "/account/vault",
    }).catch(() => {});
  }
}

// Type re-exports were here. Removed because "use server" files can only
// export async functions; under Turbopack the type re-exports were being
// treated as runtime exports and broke the build. Import these types
// directly from "@/lib/types/data-room" instead.
