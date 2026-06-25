/**
 * Shared "upsert one external listing" used by every listing-source integration
 * (REAXML, Agentbox, …). Extracted verbatim from the REAXML importer so the
 * behaviour — de-dup by external ref, insert/update as drafts, re-host images
 * for NEW listings only, replace private vendor details — is identical across
 * sources and tested in one place.
 *
 * De-dups by `listing_external_refs(source_platform, external_id)`: a seen
 * external id updates the existing listing (if it belongs to this broker) rather
 * than creating a duplicate; a ref pointing at another broker's listing is
 * skipped (never overwritten).
 */

import type { createServiceRoleClient } from "@/lib/supabase/admin";
import { generateListingSlug } from "@/lib/slug";
import { fetchAndStoreListingImage } from "@/lib/listings/image-from-url";
import { resolveIds, type TaxonomyMaps } from "./taxonomy";
import type { NormalizedListing } from "./types";

type SupabaseAdmin = ReturnType<typeof createServiceRoleClient>;

/** Max images re-hosted per listing on first import. */
const MAX_IMAGES_PER_LISTING = 10;

export type UpsertOutcome = "created" | "updated" | "skipped";

export type UpsertDelta = {
  outcome: UpsertOutcome;
  imagesAdded: number;
  imageFailures: number;
};

export type UpsertContext = {
  /** Stored on listing_external_refs.source_platform (e.g. 'reaxml', 'agentbox'). */
  sourcePlatform: string;
  /** Owner/assignee for the listing row. */
  brokerId: string;
  agencyId: string | null;
  maps: TaxonomyMaps;
  nowIso: string;
};

export async function upsertExternalListing(
  supabase: SupabaseAdmin,
  listing: NormalizedListing,
  ctx: UpsertContext,
): Promise<UpsertDelta> {
  const skipped: UpsertDelta = { outcome: "skipped", imagesAdded: 0, imageFailures: 0 };

  const title = listing.title?.trim();
  if (!title) return skipped;
  if (listing.status === "skip") return skipped;

  const { categoryId, subcategoryId } = resolveIds(listing, ctx.maps);

  const fields = {
    broker_id: ctx.brokerId,
    agency_id: ctx.agencyId,
    title,
    category_id: categoryId,
    subcategory_id: subcategoryId,
    exclusivity: listing.exclusivity,
    location_text: listing.locationText,
    suburb: listing.suburb,
    state: listing.state,
    postcode: listing.postcode,
    asking_price: listing.askingPrice,
    price_type: listing.priceType,
    revenue: listing.revenue,
    lease_details: listing.leaseDetails,
    description: listing.description,
    status: listing.status,
    published_at: listing.status === "published" ? ctx.nowIso : null,
  };

  // De-dup by external id.
  let existingListingId: string | null = null;
  if (listing.externalId) {
    const { data: ref } = await supabase
      .from("listing_external_refs")
      .select("listing_id")
      .eq("source_platform", ctx.sourcePlatform)
      .eq("external_id", listing.externalId)
      .maybeSingle();
    if (ref?.listing_id) {
      const { data: owned } = await supabase
        .from("listings")
        .select("id")
        .eq("id", ref.listing_id)
        .eq("broker_id", ctx.brokerId)
        .maybeSingle();
      if (owned?.id) {
        existingListingId = owned.id;
      } else {
        // Ref exists but the listing isn't this broker's — don't overwrite.
        return skipped;
      }
    }
  }

  let listingId: string;
  let isNew = false;

  if (existingListingId) {
    const { error: updErr } = await supabase
      .from("listings")
      .update({ ...fields, updated_at: ctx.nowIso })
      .eq("id", existingListingId);
    if (updErr) return skipped;
    listingId = existingListingId;
  } else {
    const { data: ins, error: insErr } = await supabase
      .from("listings")
      .insert({
        ...fields,
        created_by: ctx.brokerId,
        slug: generateListingSlug(title),
        listing_tier: "basic",
      })
      .select("id")
      .single();
    if (insErr || !ins) return skipped;
    listingId = ins.id;
    isNew = true;
  }

  // External ref (idempotent upsert).
  if (listing.externalId) {
    await supabase.from("listing_external_refs").upsert(
      {
        listing_id: listingId,
        source_platform: ctx.sourcePlatform,
        external_id: listing.externalId,
        external_agent_id: listing.agentId,
        external_modified_at: listing.modTime,
        updated_at: ctx.nowIso,
      },
      { onConflict: "source_platform,external_id" },
    );
  }

  // Vendor details (private). Replace any existing for this listing.
  await supabase.from("listing_vendor_details").delete().eq("listing_id", listingId);
  if (listing.vendor && (listing.vendor.name || listing.vendor.phone || listing.vendor.email)) {
    await supabase.from("listing_vendor_details").insert({
      listing_id: listingId,
      name: listing.vendor.name,
      phone: listing.vendor.phone,
      email: listing.vendor.email,
    });
  }

  // Images: only fetch for newly-created listings (avoid re-download/dupes).
  let imagesAdded = 0;
  let imageFailures = 0;
  if (isNew && listing.imageUrls.length > 0) {
    const urls = listing.imageUrls.slice(0, MAX_IMAGES_PER_LISTING);
    for (let i = 0; i < urls.length; i++) {
      const res = await fetchAndStoreListingImage(listingId, urls[i], i);
      if (res.ok) imagesAdded += 1;
      else imageFailures += 1;
    }
  }

  return { outcome: isNew ? "created" : "updated", imagesAdded, imageFailures };
}
