"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { generateListingSlug } from "@/lib/slug";
import { fetchAndStoreListingImage } from "@/lib/listings/image-from-url";
import {
  parseReaxml,
  mapReaxmlStatus,
  type ReaxmlListing,
} from "@/lib/reaxml";
import {
  REAXML_IMPORT_CHUNK,
  type ReaxmlPreviewRow,
  type ReaxmlPreviewResult,
  type ImportReaxmlResult,
} from "@/lib/reaxml-import-shared";
import { checkAgencySubscriptionAccess } from "@/lib/subscriptions/agency-access";

/** Source tag stored on listing_external_refs for REAXML-imported listings. */
const SOURCE_PLATFORM = "reaxml";
/** Hard server-side cap per call regardless of what the client sends. */
const MAX_PER_CALL = 50;
/** Max images re-hosted per listing on first import. */
const MAX_IMAGES_PER_LISTING = 10;

async function requireBroker() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "broker") {
    throw new Error("Unauthorized");
  }
  return { userId: session.user.id, agencyId: session.user.agencyId ?? null };
}

type TaxonomyMaps = {
  categoryByName: Map<string, string>;
  /** keyed by `${categoryId}::${lowercased subcategory name}` */
  subByCatAndName: Map<string, string>;
};

async function resolveTaxonomy(
  supabase: ReturnType<typeof createServiceRoleClient>,
): Promise<TaxonomyMaps> {
  const categoryByName = new Map<string, string>();
  const subByCatAndName = new Map<string, string>();

  const { data: cats } = await supabase
    .from("categories")
    .select("id, name, slug")
    .eq("active", true);
  for (const c of cats ?? []) {
    if (c.name) categoryByName.set(String(c.name).trim().toLowerCase(), c.id);
    if (c.slug) categoryByName.set(String(c.slug).trim().toLowerCase(), c.id);
  }

  const { data: subs } = await supabase
    .from("subcategories")
    .select("id, category_id, name")
    .eq("active", true);
  for (const s of subs ?? []) {
    if (s.name) {
      subByCatAndName.set(`${s.category_id}::${String(s.name).trim().toLowerCase()}`, s.id);
    }
  }
  return { categoryByName, subByCatAndName };
}

function resolveIds(
  l: ReaxmlListing,
  maps: TaxonomyMaps,
): { categoryId: string | null; subcategoryId: string | null } {
  const categoryId = l.categoryName
    ? maps.categoryByName.get(l.categoryName.trim().toLowerCase()) ?? null
    : null;
  const subcategoryId =
    categoryId && l.subcategoryName
      ? maps.subByCatAndName.get(`${categoryId}::${l.subcategoryName.trim().toLowerCase()}`) ?? null
      : null;
  return { categoryId, subcategoryId };
}

function formatPrice(l: ReaxmlListing): string {
  if (l.priceType === "poa" || l.askingPrice == null) return "POA";
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(l.askingPrice);
}

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  published: "Published",
  sold: "Sold",
  unpublished: "Unpublished",
};

// ── Preview ──────────────────────────────────────────────────────────────────

/**
 * Parse + resolve a REAXML file and return a per-listing preview (no writes).
 * `publishCurrent` only affects the status label shown.
 */
export async function parseReaxmlPreview(
  xmlText: string,
  publishCurrent = false,
): Promise<ReaxmlPreviewResult> {
  await requireBroker();
  const parsed = parseReaxml(xmlText);
  if (!parsed.ok) return { ok: false, error: parsed.error };

  const supabase = createServiceRoleClient();
  const maps = await resolveTaxonomy(supabase);

  let readyCount = 0;
  let skippedCount = 0;
  const preview: ReaxmlPreviewRow[] = parsed.listings.map((l, index) => {
    const { categoryId, subcategoryId } = resolveIds(l, maps);
    const mapped = mapReaxmlStatus(l.reaxmlStatus, { publishCurrent });
    const warnings: string[] = [];

    let status: "ready" | "skip" = "ready";
    let reason: string | undefined;

    if (!l.title?.trim()) {
      status = "skip";
      reason = "Missing headline/title";
    } else if (mapped === "skip") {
      status = "skip";
      reason = "Leased listing (not imported)";
    }

    if (status === "ready") {
      if (l.categoryName && !categoryId) warnings.push(`Unknown category "${l.categoryName}"`);
      if (l.subcategoryName && !subcategoryId)
        warnings.push(`Unknown sub-category "${l.subcategoryName}"`);
      readyCount += 1;
    } else {
      skippedCount += 1;
    }

    return {
      index,
      status,
      reason,
      warnings,
      title: l.title,
      category: l.categoryName,
      subcategory: l.subcategoryName,
      price: formatPrice(l),
      statusLabel: mapped === "skip" ? "Skipped" : STATUS_LABEL[mapped] ?? mapped,
      images: l.imageUrls.length,
    };
  });

  return { ok: true, total: parsed.listings.length, readyCount, skippedCount, preview };
}

// ── Import ───────────────────────────────────────────────────────────────────

/**
 * Import a slice of a REAXML file's listings. Re-parses server-side each call
 * (cheap, keeps the server authoritative) and processes [startIndex, +count).
 * De-dups by `listing_external_refs(source_platform, external_id)`: a seen
 * external id updates the existing listing instead of creating a duplicate.
 * Images are re-hosted only for newly-created listings.
 */
export async function importReaxml(
  xmlText: string,
  opts: { startIndex?: number; count?: number; publishCurrent?: boolean } = {},
): Promise<ImportReaxmlResult> {
  const { userId, agencyId } = await requireBroker();

  const parsed = parseReaxml(xmlText);
  if (!parsed.ok) return { ok: false, error: parsed.error };

  const supabase = createServiceRoleClient();
  const access = await checkAgencySubscriptionAccess(supabase, agencyId);
  if (!access.allowed) {
    return {
      ok: false,
      error: "Your agency subscription is not active. Please subscribe before importing listings.",
    };
  }

  const maps = await resolveTaxonomy(supabase);
  const start = Math.max(0, opts.startIndex ?? 0);
  const count = Math.min(opts.count ?? REAXML_IMPORT_CHUNK, MAX_PER_CALL);
  const slice = parsed.listings.slice(start, start + count);
  const publishCurrent = opts.publishCurrent ?? false;
  const nowIso = new Date().toISOString();

  let created = 0;
  let updated = 0;
  let skipped = 0;
  let imagesAdded = 0;
  let imageFailures = 0;

  for (const l of slice) {
    const title = l.title?.trim();
    if (!title) {
      skipped += 1;
      continue;
    }
    const status = mapReaxmlStatus(l.reaxmlStatus, { publishCurrent });
    if (status === "skip") {
      skipped += 1;
      continue;
    }

    const { categoryId, subcategoryId } = resolveIds(l, maps);

    const fields = {
      broker_id: userId,
      agency_id: agencyId,
      title,
      category_id: categoryId,
      subcategory_id: subcategoryId,
      exclusivity: l.exclusivity,
      location_text: l.locationText,
      suburb: l.suburb,
      state: l.state,
      postcode: l.postcode,
      asking_price: l.askingPrice,
      price_type: l.priceType,
      revenue: l.revenue,
      lease_details: l.leaseDetails,
      description: l.description,
      status,
      published_at: status === "published" ? nowIso : null,
    };

    // De-dup by external id (REAXML uniqueID).
    let existingListingId: string | null = null;
    if (l.externalId) {
      const { data: ref } = await supabase
        .from("listing_external_refs")
        .select("listing_id")
        .eq("source_platform", SOURCE_PLATFORM)
        .eq("external_id", l.externalId)
        .maybeSingle();
      if (ref?.listing_id) {
        const { data: owned } = await supabase
          .from("listings")
          .select("id")
          .eq("id", ref.listing_id)
          .eq("broker_id", userId)
          .maybeSingle();
        if (owned?.id) {
          existingListingId = owned.id;
        } else {
          // Ref exists but the listing isn't this broker's — don't overwrite.
          skipped += 1;
          continue;
        }
      }
    }

    let listingId: string;
    let isNew = false;

    if (existingListingId) {
      const { error: updErr } = await supabase
        .from("listings")
        .update({ ...fields, updated_at: nowIso })
        .eq("id", existingListingId);
      if (updErr) {
        skipped += 1;
        continue;
      }
      listingId = existingListingId;
      updated += 1;
    } else {
      const { data: ins, error: insErr } = await supabase
        .from("listings")
        .insert({
          ...fields,
          created_by: userId,
          slug: generateListingSlug(title),
          listing_tier: "basic",
        })
        .select("id")
        .single();
      if (insErr || !ins) {
        skipped += 1;
        continue;
      }
      listingId = ins.id;
      isNew = true;
      created += 1;
    }

    // External ref (idempotent upsert).
    if (l.externalId) {
      await supabase
        .from("listing_external_refs")
        .upsert(
          {
            listing_id: listingId,
            source_platform: SOURCE_PLATFORM,
            external_id: l.externalId,
            external_agent_id: l.agentId,
            external_modified_at: l.modTime,
            updated_at: nowIso,
          },
          { onConflict: "source_platform,external_id" },
        );
    }

    // Vendor details (private). Replace any existing for this listing.
    await supabase.from("listing_vendor_details").delete().eq("listing_id", listingId);
    if (l.vendor && (l.vendor.name || l.vendor.phone || l.vendor.email)) {
      await supabase.from("listing_vendor_details").insert({
        listing_id: listingId,
        name: l.vendor.name,
        phone: l.vendor.phone,
        email: l.vendor.email,
      });
    }

    // Images: only fetch for newly-created listings (avoid re-download/dupes).
    if (isNew && l.imageUrls.length > 0) {
      const urls = l.imageUrls.slice(0, MAX_IMAGES_PER_LISTING);
      for (let i = 0; i < urls.length; i++) {
        const res = await fetchAndStoreListingImage(listingId, urls[i], i);
        if (res.ok) imagesAdded += 1;
        else imageFailures += 1;
      }
    }
  }

  return { ok: true, created, updated, skipped, imagesAdded, imageFailures };
}
