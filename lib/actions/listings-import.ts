"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { generateListingSlug } from "@/lib/slug";
import { normaliseHeader, type ListingImportRow } from "@/lib/listings-import";
import { checkAgencySubscriptionAccess } from "@/lib/subscriptions/agency-access";
import { syncSubscriptionById } from "@/lib/payments/activate-subscription";

export type ImportListingsResult =
  | {
      ok: true;
      created: number;
      skipped: number;
      categoryMatched: number;
      categoryUnmatched: number;
    }
  | { ok: false; error: string };

// Defensive server-side cap (the client chunks at 100; never trust the client).
const MAX_ROWS_PER_CALL = 500;

async function requireBroker() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "broker") {
    throw new Error("Unauthorized");
  }
  return {
    userId: session.user.id,
    agencyId: session.user.agencyId ?? null,
  };
}

/**
 * Bulk-create listings from a parsed import chunk. Listings are always created
 * as DRAFTS owned by the importer (broker_id = created_by = current user), so
 * the agency owner can review, assign (Feature #6), and publish afterwards.
 * Images are not handled here — brokers add them via the listing editor.
 */
export async function importListings(
  rows: ListingImportRow[],
): Promise<ImportListingsResult> {
  const { userId, agencyId } = await requireBroker();

  if (!Array.isArray(rows) || rows.length === 0) {
    return { ok: true, created: 0, skipped: 0, categoryMatched: 0, categoryUnmatched: 0 };
  }
  if (rows.length > MAX_ROWS_PER_CALL) {
    return { ok: false, error: `Too many rows in one request (max ${MAX_ROWS_PER_CALL}).` };
  }

  const supabase = createServiceRoleClient();

  let access = await checkAgencySubscriptionAccess(supabase, agencyId);
  if (!access.allowed && access.reason === "pending" && agencyId) {
    const { data: pendingSub } = await supabase
      .from("agency_subscriptions")
      .select("id")
      .eq("agency_id", agencyId)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (pendingSub?.id) {
      const sync = await syncSubscriptionById(supabase, pendingSub.id);
      if (sync.ok) {
        access = await checkAgencySubscriptionAccess(supabase, agencyId);
      }
    }
  }
  if (!access.allowed) {
    return {
      ok: false,
      error: "Your agency subscription is not active. Please subscribe before importing listings.",
    };
  }

  // Resolve category names/slugs → ids once for the whole chunk.
  const { data: cats } = await supabase
    .from("categories")
    .select("id, name, slug")
    .eq("active", true);
  const categoryByKey = new Map<string, string>();
  for (const c of cats ?? []) {
    if (c.name) categoryByKey.set(normaliseHeader(c.name), c.id);
    if (c.slug) categoryByKey.set(normaliseHeader(c.slug), c.id);
  }

  let skipped = 0;
  let categoryMatched = 0;
  let categoryUnmatched = 0;

  const payloads = rows
    .map((r) => {
      const title = r.title?.trim();
      if (!title) {
        skipped += 1;
        return null;
      }
      let category_id: string | null = null;
      if (r.category) {
        const hit = categoryByKey.get(normaliseHeader(r.category));
        if (hit) {
          category_id = hit;
          categoryMatched += 1;
        } else {
          categoryUnmatched += 1;
        }
      }
      return {
        broker_id: userId,
        created_by: userId,
        agency_id: agencyId,
        slug: generateListingSlug(title),
        title,
        category_id,
        location_text: r.location_text ?? null,
        state: r.state ?? null,
        suburb: r.suburb ?? null,
        postcode: r.postcode ?? null,
        region: r.region ?? null,
        asking_price: r.asking_price ?? null,
        price_type: r.price_type === "poa" ? "poa" : "fixed",
        revenue: r.revenue ?? null,
        profit: r.profit ?? null,
        lease_details: r.lease_details ?? null,
        summary: r.summary ?? null,
        description: r.description ?? null,
        status: "draft" as const,
        listing_tier: "basic" as const,
      };
    })
    .filter((p): p is NonNullable<typeof p> => p !== null);

  if (payloads.length === 0) {
    return { ok: true, created: 0, skipped, categoryMatched, categoryUnmatched };
  }

  const { data: inserted, error } = await supabase
    .from("listings")
    .insert(payloads)
    .select("id");
  if (error) {
    return { ok: false, error: "Failed to import this batch. Please try again." };
  }

  return {
    ok: true,
    created: inserted?.length ?? 0,
    skipped,
    categoryMatched,
    categoryUnmatched,
  };
}
