"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServiceRoleClient } from "@/lib/supabase/admin";
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
import { resolveTaxonomy, resolveIds } from "@/lib/integrations/taxonomy";
import { upsertExternalListing } from "@/lib/integrations/upsert";
import type { NormalizedListing } from "@/lib/integrations/types";

/** Source tag stored on listing_external_refs for REAXML-imported listings. */
const SOURCE_PLATFORM = "reaxml";
/** Hard server-side cap per call regardless of what the client sends. */
const MAX_PER_CALL = 50;

async function requireBroker() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "broker") {
    throw new Error("Unauthorized");
  }
  return { userId: session.user.id, agencyId: session.user.agencyId ?? null };
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
 * De-dup, insert/update and image handling are delegated to the shared
 * `upsertExternalListing()` (also used by the Agentbox connector).
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
    const status = mapReaxmlStatus(l.reaxmlStatus, { publishCurrent });
    const normalized: NormalizedListing = { ...l, status };
    const delta = await upsertExternalListing(supabase, normalized, {
      sourcePlatform: SOURCE_PLATFORM,
      brokerId: userId,
      agencyId,
      maps,
      nowIso,
    });
    if (delta.outcome === "created") created += 1;
    else if (delta.outcome === "updated") updated += 1;
    else skipped += 1;
    imagesAdded += delta.imagesAdded;
    imageFailures += delta.imageFailures;
  }

  return { ok: true, created, updated, skipped, imagesAdded, imageFailures };
}
