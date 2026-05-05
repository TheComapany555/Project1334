"use server";

import { createServiceRoleClient } from "@/lib/supabase/admin";
import {
  buildPaginated,
  normalizePagination,
  type Paginated,
} from "@/lib/types/pagination";
import { generateListingSlug } from "@/lib/slug";

async function requireAdmin() {
  const { getServerSession } = await import("next-auth");
  const { authOptions } = await import("@/lib/auth");
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "admin") {
    throw new Error("Unauthorized");
  }
}

export type ListingForAdmin = {
  id: string;
  slug: string;
  title: string;
  status: string;
  admin_removed_at: string | null;
  is_featured: boolean;
  featured_until: string | null;
  featured_homepage_until: string | null;
  featured_category_until: string | null;
  created_at: string;
  broker?: { name: string | null; company: string | null };
};

export type ListAdminListingsParams = {
  page?: number;
  pageSize?: number;
  q?: string | null;
  status?: string | null;
  /** "visible" | "removed" */
  visibility?: string | null;
  /** "yes" | "no" — featured anywhere */
  featured?: string | null;
};

export async function listAdminListings(
  params: ListAdminListingsParams = {},
): Promise<Paginated<ListingForAdmin>> {
  await requireAdmin();
  const supabase = createServiceRoleClient();
  const { page, pageSize, offset } = normalizePagination(params);

  let query = supabase
    .from("listings")
    .select(
      `
      id,
      slug,
      title,
      status,
      admin_removed_at,
      is_featured,
      featured_until,
      featured_homepage_until,
      featured_category_until,
      created_at,
      broker:profiles!broker_id(name, company)
    `,
      { count: "exact" },
    );

  if (params.status?.trim()) {
    query = query.eq("status", params.status.trim());
  }
  if (params.visibility === "visible") {
    query = query.is("admin_removed_at", null);
  } else if (params.visibility === "removed") {
    query = query.not("admin_removed_at", "is", null);
  }
  if (params.featured === "yes") {
    const nowIso = new Date().toISOString();
    query = query.or(
      `featured_until.gte.${nowIso},featured_homepage_until.gte.${nowIso},featured_category_until.gte.${nowIso}`,
    );
  } else if (params.featured === "no") {
    const nowIso = new Date().toISOString();
    // Listings with all featured columns null OR all in the past
    query = query
      .or(`featured_until.is.null,featured_until.lt.${nowIso}`)
      .or(`featured_homepage_until.is.null,featured_homepage_until.lt.${nowIso}`)
      .or(`featured_category_until.is.null,featured_category_until.lt.${nowIso}`);
  }
  if (params.q?.trim()) {
    const k = params.q.trim().replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
    query = query.ilike("title", `%${k}%`);
  }

  query = query.order("created_at", { ascending: false });

  const { data, error, count } = await query.range(offset, offset + pageSize - 1);
  if (error) return buildPaginated<ListingForAdmin>([], 0, page, pageSize);

  const rows = (data ?? []) as (Omit<ListingForAdmin, "broker"> & {
    broker?:
      | { name: string | null; company: string | null }[]
      | { name: string | null; company: string | null };
  })[];
  const flat = rows.map((r) => ({
    ...r,
    broker: Array.isArray(r.broker) ? r.broker[0] : r.broker,
  }));
  return buildPaginated(flat, count ?? 0, page, pageSize);
}

/** @deprecated Use `listAdminListings` instead. Kept as a capped fallback. */
export async function getAllListingsForAdmin(): Promise<ListingForAdmin[]> {
  const { rows } = await listAdminListings({ page: 1, pageSize: 100 });
  return rows;
}

/**
 * Fetch a listing by slug without status/removal filters — admin only.
 */
export async function getListingBySlugAdmin(slug: string) {
  await requireAdmin();
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("listings")
    .select(`
      *,
      broker:profiles!broker_id(slug, name, company, photo_url),
      category:categories(id, name, slug),
      listing_images(id, url, sort_order),
      listing_highlights:listing_highlight_map(listing_highlights(id, label, accent, active))
    `)
    .eq("slug", slug)
    .single();
  if (error || !data) return null;
  const row = data as any;
  const broker = Array.isArray(row.broker) ? row.broker[0] : row.broker;
  return {
    ...row,
    broker: broker ?? undefined,
    listing_highlights: (row.listing_highlights ?? []).map((m: any) => m.listing_highlights).filter(Boolean),
  };
}

/** Admin: fetch a listing by ID for editing (no ownership check). */
export async function getListingByIdAdmin(id: string) {
  await requireAdmin();
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("listings")
    .select(`
      *,
      broker:profiles!broker_id(id, slug, name, company, photo_url),
      category:categories(id, name, slug),
      listing_images(id, url, sort_order),
      listing_highlights:listing_highlight_map(listing_highlights(id, label, accent, active))
    `)
    .eq("id", id)
    .single();
  if (error || !data) return null;

  const row = data as any;
  const broker = Array.isArray(row.broker) ? row.broker[0] : row.broker;

  return {
    ...row,
    broker: broker ?? undefined,
    listing_highlights: (row.listing_highlights ?? []).map((m: any) => m.listing_highlights).filter(Boolean),
  };
}

/** Admin: update any listing (no ownership check). */
export async function adminUpdateListing(
  id: string,
  fields: {
    title?: string;
    category_id?: string | null;
    location_text?: string;
    state?: string;
    suburb?: string;
    postcode?: string;
    price_type?: string;
    asking_price?: number | null;
    revenue?: number | null;
    profit?: number | null;
    lease_details?: string;
    summary?: string;
    description?: string;
    status?: string;
    listing_tier?: string;
    tier_product_id?: string | null;
  },
  highlightIds?: string[]
): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const supabase = createServiceRoleClient();

  const { data: current } = await supabase.from("listings").select("title").eq("id", id).single();

  const payload: Record<string, unknown> = {
    ...fields,
    updated_at: new Date().toISOString(),
  };
  if (fields.title !== undefined) {
    const trimmed = fields.title.trim();
    payload.title = trimmed;
    const prev = current?.title?.trim() ?? "";
    if (trimmed !== prev) {
      payload.slug = generateListingSlug(trimmed);
    }
  }

  const { error } = await supabase.from("listings").update(payload).eq("id", id);

  if (error) return { ok: false, error: error.message };

  // Update highlights if provided
  if (highlightIds !== undefined) {
    await supabase.from("listing_highlight_map").delete().eq("listing_id", id);
    if (highlightIds.length > 0) {
      await supabase.from("listing_highlight_map").insert(
        highlightIds.map((hid) => ({ listing_id: id, highlight_id: hid }))
      );
    }
  }

  return { ok: true };
}

export async function adminRemoveListing(listingId: string): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const supabase = createServiceRoleClient();
  const { error } = await supabase
    .from("listings")
    .update({ admin_removed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", listingId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function adminRestoreListing(listingId: string): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const supabase = createServiceRoleClient();
  const { error } = await supabase
    .from("listings")
    .update({ admin_removed_at: null, updated_at: new Date().toISOString() })
    .eq("id", listingId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
