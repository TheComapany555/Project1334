"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { generateListingSlug } from "@/lib/slug";
import type {
  Category,
  Listing,
  ListingHighlight,
  ListingImage,
  ListingStatus,
} from "@/lib/types/listings";
import { notifyAdmins } from "@/lib/actions/notifications";

const LISTING_IMAGES_BUCKET = "listing-images";
const MAX_IMAGES_PER_LISTING = 10;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png"];

/** Coerce form value to number | null for DB numeric columns (reject "", undefined, NaN). */
function toNumeric(v: unknown): number | null {
  if (v === "" || v === undefined || v === null) return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

async function requireBroker() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "broker") {
    throw new Error("Unauthorized");
  }
  return {
    session,
    userId: session.user.id,
    agencyId: session.user.agencyId ?? null,
    agencyRole: session.user.agencyRole ?? null,
  };
}

/** Check if the broker's agency has an active subscription. Returns true for non-agency brokers. */
async function checkAgencySubscription(agencyId: string | null): Promise<boolean> {
  if (!agencyId) return true; // Solo broker (no agency) — no subscription required
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("agency_subscriptions")
    .select("id, status, grace_period_end")
    .eq("agency_id", agencyId)
    .in("status", ["active", "trialing", "past_due"])
    .order("created_at", { ascending: false })
    .limit(1)
    .single();
  if (!data) return false;
  if (data.status === "past_due" && data.grace_period_end) {
    return new Date(data.grace_period_end) > new Date();
  }
  return true;
}

export async function getCategories(): Promise<Category[]> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, slug, active, sort_order")
    .eq("active", true)
    .order("sort_order");
  if (error) return [];
  return (data ?? []) as Category[];
}

export async function getListingHighlights(): Promise<ListingHighlight[]> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("listing_highlights")
    .select("id, label, accent, active")
    .eq("active", true);
  if (error) return [];
  return (data ?? []) as ListingHighlight[];
}

export async function getListingsByBroker(): Promise<(Listing & { listing_highlights?: ListingHighlight[] })[]> {
  const { userId, agencyId, agencyRole } = await requireBroker();
  const supabase = createServiceRoleClient();

  // Agency owners see all agency listings; members see only their own
  const isOwner = !!(agencyId && agencyRole === "owner");
  let query = supabase
    .from("listings")
    .select(`
      *,
      category:categories(id, name, slug),
      listing_images(id, url, sort_order),
      broker:profiles!broker_id(name, photo_url),
      agency:agencies!agency_id(name, slug, logo_url)
    `);

  if (isOwner) {
    query = query.eq("agency_id", agencyId);
  } else {
    query = query.eq("broker_id", userId);
  }

  const { data: listings, error } = await query.order("updated_at", { ascending: false });
  if (error) return [];
  const list = (listings ?? []) as (Listing & { listing_images?: ListingImage[]; category?: Category | null; broker?: { name: string | null; photo_url: string | null } | { name: string | null; photo_url: string | null }[] })[];
  const listingIds = list.map((l) => l.id);
  const highlightsByListing: Record<string, ListingHighlight[]> = {};
  if (listingIds.length > 0) {
    const { data: mapRows } = await supabase
      .from("listing_highlight_map")
      .select("listing_id, highlight_id")
      .in("listing_id", listingIds);
    const highlightIds = [...new Set((mapRows ?? []).map((r) => r.highlight_id))];
    const { data: highlights } = await supabase
      .from("listing_highlights")
      .select("id, label, accent, active")
      .in("id", highlightIds.length ? highlightIds : ["00000000-0000-0000-0000-000000000000"]);
    const highlightMap = new Map((highlights ?? []).map((h) => [h.id, h as ListingHighlight]));
    for (const row of mapRows ?? []) {
      const h = highlightMap.get(row.highlight_id);
      if (h) {
        if (!highlightsByListing[row.listing_id]) highlightsByListing[row.listing_id] = [];
        highlightsByListing[row.listing_id].push(h);
      }
    }
  }
  return list.map((l) => {
    const rawBroker = l.broker;
    const broker = Array.isArray(rawBroker) ? rawBroker[0] ?? null : rawBroker ?? null;
    return {
      ...l,
      listing_images: l.listing_images ?? [],
      category: l.category ?? null,
      listing_highlights: highlightsByListing[l.id] ?? [],
      broker: broker ?? undefined,
    };
  });
}

export async function getListingById(id: string): Promise<Listing | null> {
  const { userId, agencyId, agencyRole } = await requireBroker();
  const supabase = createServiceRoleClient();

  let query = supabase
    .from("listings")
    .select(`
      *,
      category:categories(id, name, slug),
      listing_images(id, url, sort_order)
    `)
    .eq("id", id);

  // Agency owners can access any listing in their agency
  if (agencyId && agencyRole === "owner") {
    query = query.eq("agency_id", agencyId);
  } else {
    query = query.eq("broker_id", userId);
  }

  const { data, error } = await query.single();
  if (error || !data) return null;
  const row = data as Listing & { listing_images?: ListingImage[]; category?: Category | null };
  const { data: highlightRows } = await supabase
    .from("listing_highlight_map")
    .select("highlight_id")
    .eq("listing_id", id);
  const highlightIds = (highlightRows ?? []).map((r) => r.highlight_id);
  const { data: highlights } = await supabase
    .from("listing_highlights")
    .select("id, label, accent, active")
    .in("id", highlightIds.length ? highlightIds : ["00000000-0000-0000-0000-000000000000"]);
  return {
    ...row,
    category: row.category ?? null,
    listing_images: row.listing_images ?? [],
    listing_highlights: (highlights ?? []) as ListingHighlight[],
  } as Listing & { listing_highlights?: ListingHighlight[] };
}

export type SearchListingsParams = {
  keyword?: string | null;
  category?: string | null;
  highlight_id?: string | null;
  state?: string | null;
  suburb?: string | null;
  price_min?: number | null;
  price_max?: number | null;
  revenue_min?: number | null;
  revenue_max?: number | null;
  profit_min?: number | null;
  profit_max?: number | null;
  sort?: "newest" | "price_asc" | "price_desc";
  page?: number;
  page_size?: number;
};

export type SearchListingsResult = {
  listings: Listing[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
};

/** Public: search published listings with filters, sort, and pagination. */
export async function searchListings(params: SearchListingsParams): Promise<SearchListingsResult> {
  const supabase = createServiceRoleClient();
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, params.page_size ?? 12));
  const offset = (page - 1) * pageSize;

  let query = supabase
    .from("listings")
    .select(
      `
      *,
      broker:profiles!broker_id(name, photo_url),
      category:categories(id, name, slug),
      listing_images(id, url, sort_order),
      agency:agencies!agency_id(name, slug, logo_url)
    `,
      { count: "exact" }
    )
    .eq("status", "published")
    .is("admin_removed_at", null)
    .in("listing_tier", ["standard", "featured"]);

  if (params.keyword?.trim()) {
    const k = params.keyword.trim();
    const escaped = k.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
    const term = `%${escaped}%`;
    query = query.or(`title.ilike.${term},summary.ilike.${term},description.ilike.${term}`);
  }
  if (params.category?.trim()) {
    const { data: cat } = await supabase
      .from("categories")
      .select("id")
      .eq("slug", params.category.trim())
      .eq("active", true)
      .single();
    if (cat?.id) query = query.eq("category_id", cat.id);
  }
  if (params.highlight_id?.trim()) {
    const { data: mapRows } = await supabase
      .from("listing_highlight_map")
      .select("listing_id")
      .eq("highlight_id", params.highlight_id.trim());
    const listingIds = (mapRows ?? []).map((r) => r.listing_id);
    if (listingIds.length === 0) {
      return { listings: [], total: 0, page, page_size: pageSize, total_pages: 0 };
    }
    query = query.in("id", listingIds);
  }
  if (params.state?.trim()) query = query.eq("state", params.state.trim());
  if (params.suburb?.trim()) query = query.ilike("suburb", `%${params.suburb.trim()}%`);
  if (params.price_min != null) query = query.gte("asking_price", Number(params.price_min));
  if (params.price_max != null) query = query.lte("asking_price", Number(params.price_max));
  if (params.revenue_min != null) query = query.gte("revenue", Number(params.revenue_min));
  if (params.revenue_max != null) query = query.lte("revenue", Number(params.revenue_max));
  if (params.profit_min != null) query = query.gte("profit", Number(params.profit_min));
  if (params.profit_max != null) query = query.lte("profit", Number(params.profit_max));

  // Featured listings always rank first, then apply user-selected sort
  query = query.order("featured_until", { ascending: false, nullsFirst: false });

  const sort = params.sort ?? "newest";
  if (sort === "newest") query = query.order("published_at", { ascending: false, nullsFirst: false });
  else if (sort === "price_asc") query = query.order("asking_price", { ascending: true, nullsFirst: false });
  else if (sort === "price_desc") query = query.order("asking_price", { ascending: false, nullsFirst: false });

  const { data, error, count } = await query.range(offset, offset + pageSize - 1);
  const total = count ?? 0;
  const list = (data ?? []) as (Listing & { listing_images?: ListingImage[]; category?: Category | null; broker?: { name: string | null; photo_url: string | null } | { name: string | null; photo_url: string | null }[] })[];
  const listingIds = list.map((l) => l.id);

  const highlightsByListing: Record<string, ListingHighlight[]> = {};
  if (listingIds.length > 0) {
    const { data: mapRows } = await supabase
      .from("listing_highlight_map")
      .select("listing_id, highlight_id")
      .in("listing_id", listingIds);
    const highlightIds = [...new Set((mapRows ?? []).map((r) => r.highlight_id))];
    const { data: highlights } = await supabase
      .from("listing_highlights")
      .select("id, label, accent, active")
      .in("id", highlightIds.length ? highlightIds : ["00000000-0000-0000-0000-000000000000"]);
    const highlightMap = new Map((highlights ?? []).map((h) => [h.id, h as ListingHighlight]));
    for (const row of mapRows ?? []) {
      const h = highlightMap.get(row.highlight_id);
      if (h && !highlightsByListing[row.listing_id]) highlightsByListing[row.listing_id] = [];
      if (h) highlightsByListing[row.listing_id].push(h);
    }
  }

  const listings = list.map((l) => {
    const broker = Array.isArray(l.broker) ? l.broker[0] : l.broker;
    return {
      ...l,
      broker: broker ?? undefined,
      listing_images: l.listing_images ?? [],
      category: l.category ?? null,
      listing_highlights: highlightsByListing[l.id] ?? [],
    };
  });

  return {
    listings,
    total,
    page,
    page_size: pageSize,
    total_pages: Math.ceil(total / pageSize) || 1,
  };
}

/** Public: published listings for a broker (by broker profile id). */
export async function getPublishedListingsByBrokerId(brokerId: string): Promise<Listing[]> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("listings")
    .select(`
      *,
      category:categories(id, name, slug),
      listing_images(id, url, sort_order)
    `)
    .eq("broker_id", brokerId)
    .eq("status", "published")
    .is("admin_removed_at", null)
    .order("featured_until", { ascending: false, nullsFirst: false })
    .order("published_at", { ascending: false });
  if (error) return [];
  const list = (data ?? []) as (Listing & { listing_images?: ListingImage[]; category?: Category | null })[];
  return list.map((l) => ({
    ...l,
    listing_images: l.listing_images ?? [],
    category: l.category ?? null,
  }));
}

/** Public: published listings for an agency. */
export async function getPublishedListingsByAgencyId(agencyId: string): Promise<Listing[]> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("listings")
    .select(`
      *,
      category:categories(id, name, slug),
      listing_images(id, url, sort_order)
    `)
    .eq("agency_id", agencyId)
    .eq("status", "published")
    .is("admin_removed_at", null)
    .order("featured_until", { ascending: false, nullsFirst: false })
    .order("published_at", { ascending: false });
  if (error) return [];
  const list = (data ?? []) as (Listing & { listing_images?: ListingImage[]; category?: Category | null })[];
  return list.map((l) => ({
    ...l,
    listing_images: l.listing_images ?? [],
    category: l.category ?? null,
  }));
}

export async function getListingBySlug(slug: string): Promise<(Listing & { broker?: { slug: string; name: string | null; company: string | null; photo_url: string | null }; agency?: { name: string; slug: string | null; logo_url: string | null } | null }) | null> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("listings")
    .select(`
      *,
      broker:profiles!broker_id(slug, name, company, photo_url),
      category:categories(id, name, slug),
      listing_images(id, url, sort_order),
      agency:agencies!agency_id(name, slug, logo_url)
    `)
    .eq("slug", slug)
    .eq("status", "published")
    .is("admin_removed_at", null)
    .single();
  if (error || !data) return null;
  const row = data as Listing & {
    listing_images?: ListingImage[];
    category?: Category | null;
    broker?: { slug: string; name: string | null; company: string | null; photo_url: string | null }[];
  };
  const broker = Array.isArray(row.broker) ? row.broker[0] : row.broker;
  const { data: highlightRows } = await supabase
    .from("listing_highlight_map")
    .select("highlight_id")
    .eq("listing_id", row.id);
  const highlightIds = (highlightRows ?? []).map((r) => r.highlight_id);
  const { data: highlights } = await supabase
    .from("listing_highlights")
    .select("id, label, accent, active")
    .in("id", highlightIds.length ? highlightIds : ["00000000-0000-0000-0000-000000000000"]);
  return {
    ...row,
    broker: broker ?? undefined,
    category: row.category ?? null,
    listing_images: row.listing_images ?? [],
    listing_highlights: (highlights ?? []) as ListingHighlight[],
  };
}

export async function createListing(form: {
  title: string;
  category_id: string | null;
  location_text: string | null;
  state: string | null;
  suburb: string | null;
  postcode: string | null;
  asking_price: number | null;
  price_type: "fixed" | "poa";
  revenue: number | null;
  profit: number | null;
  lease_details: string | null;
  summary: string | null;
  description: string | null;
  highlight_ids: string[];
  status: "draft" | "published";
  listing_tier?: "basic" | "standard" | "featured";
  tier_product_id?: string | null;
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  const { userId, agencyId } = await requireBroker();
  const supabase = createServiceRoleClient();
  const slug = generateListingSlug(form.title);

  // Subscription check: agency brokers need active subscription to create listings
  const hasSubscription = await checkAgencySubscription(agencyId);
  if (!hasSubscription) {
    return { ok: false, error: "Your agency subscription is not active. Please subscribe first." };
  }

  const tier = form.listing_tier ?? "basic";
  const isFreeOrBasic = tier === "basic";

  // For paid tiers, force draft status until payment is made
  const effectiveStatus = isFreeOrBasic ? form.status : "draft";
  const published_at = effectiveStatus === "published" ? new Date().toISOString() : null;

  const { data, error } = await supabase
    .from("listings")
    .insert({
      broker_id: userId,
      agency_id: agencyId,
      slug,
      title: form.title.trim(),
      category_id: form.category_id || null,
      location_text: form.location_text?.trim() || null,
      state: form.state?.trim() || null,
      suburb: form.suburb?.trim() || null,
      postcode: form.postcode?.trim() || null,
      asking_price: toNumeric(form.asking_price),
      price_type: form.price_type,
      revenue: toNumeric(form.revenue),
      profit: toNumeric(form.profit),
      lease_details: form.lease_details?.trim() || null,
      summary: form.summary?.trim() || null,
      description: form.description?.trim() || null,
      status: effectiveStatus,
      published_at,
      listing_tier: tier,
      tier_product_id: form.tier_product_id || null,
      tier_paid_at: isFreeOrBasic && effectiveStatus === "published" ? new Date().toISOString() : null,
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };
  const listingId = data.id;
  if (form.highlight_ids?.length) {
    await supabase.from("listing_highlight_map").insert(
      form.highlight_ids.map((highlight_id) => ({ listing_id: listingId, highlight_id }))
    );
  }
  return { ok: true, id: listingId };
}

export async function updateListing(
  id: string,
  form: {
    title?: string;
    category_id?: string | null;
    location_text?: string | null;
    state?: string | null;
    suburb?: string | null;
    postcode?: string | null;
    asking_price?: number | null;
    price_type?: "fixed" | "poa";
    revenue?: number | null;
    profit?: number | null;
    lease_details?: string | null;
    summary?: string | null;
    description?: string | null;
    highlight_ids?: string[];
    listing_tier?: "basic" | "standard" | "featured";
    tier_product_id?: string | null;
  }
): Promise<{ ok: boolean; error?: string }> {
  const { userId, agencyId, agencyRole } = await requireBroker();
  const supabase = createServiceRoleClient();

  let existingQuery = supabase.from("listings").select("id").eq("id", id);
  if (agencyId && agencyRole === "owner") {
    existingQuery = existingQuery.eq("agency_id", agencyId);
  } else {
    existingQuery = existingQuery.eq("broker_id", userId);
  }
  const { data: existing } = await existingQuery.single();
  if (!existing) return { ok: false, error: "Listing not found." };
  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (form.title !== undefined) payload.title = form.title.trim();
  if (form.category_id !== undefined) payload.category_id = form.category_id || null;
  if (form.location_text !== undefined) payload.location_text = form.location_text?.trim() || null;
  if (form.state !== undefined) payload.state = form.state?.trim() || null;
  if (form.suburb !== undefined) payload.suburb = form.suburb?.trim() || null;
  if (form.postcode !== undefined) payload.postcode = form.postcode?.trim() || null;
  if (form.asking_price !== undefined) payload.asking_price = toNumeric(form.asking_price);
  if (form.price_type !== undefined) payload.price_type = form.price_type;
  if (form.revenue !== undefined) payload.revenue = toNumeric(form.revenue);
  if (form.profit !== undefined) payload.profit = toNumeric(form.profit);
  if (form.lease_details !== undefined) payload.lease_details = form.lease_details?.trim() || null;
  if (form.summary !== undefined) payload.summary = form.summary?.trim() || null;
  if (form.description !== undefined) payload.description = form.description?.trim() || null;
  if (form.listing_tier !== undefined) {
    // Only allow tier change on draft listings that haven't been paid for
    const { data: current } = await supabase
      .from("listings")
      .select("status, listing_tier, tier_paid_at")
      .eq("id", id)
      .single();
    if (current && current.status === "draft" && !current.tier_paid_at) {
      payload.listing_tier = form.listing_tier;
      payload.tier_product_id = form.tier_product_id ?? null;
    }
  }
  // Already verified ownership above via existingQuery
  const { error } = await supabase.from("listings").update(payload).eq("id", id);
  if (error) return { ok: false, error: error.message };
  if (form.highlight_ids !== undefined) {
    await supabase.from("listing_highlight_map").delete().eq("listing_id", id);
    if (form.highlight_ids.length) {
      await supabase.from("listing_highlight_map").insert(
        form.highlight_ids.map((highlight_id) => ({ listing_id: id, highlight_id }))
      );
    }
  }
  return { ok: true };
}

export async function updateListingStatus(id: string, status: ListingStatus): Promise<{ ok: boolean; error?: string }> {
  const { userId, agencyId, agencyRole } = await requireBroker();
  const supabase = createServiceRoleClient();

  let statusQuery = supabase.from("listings").select("id, status, listing_tier, tier_paid_at").eq("id", id);
  if (agencyId && agencyRole === "owner") {
    statusQuery = statusQuery.eq("agency_id", agencyId);
  } else {
    statusQuery = statusQuery.eq("broker_id", userId);
  }
  const { data: listing } = await statusQuery.single();
  if (!listing) return { ok: false, error: "Listing not found." };
  const current = listing.status as ListingStatus;
  const allowed: Record<ListingStatus, ListingStatus[]> = {
    draft: ["published", "unpublished"],
    published: ["under_offer", "unpublished"],
    under_offer: ["published", "sold"],
    sold: [],
    unpublished: ["published"],
  };
  if (!allowed[current]?.includes(status)) {
    return { ok: false, error: `Cannot change status from ${current} to ${status}.` };
  }

  // Block publishing if subscription or tier payment is missing
  if (status === "published") {
    const hasSubscription = await checkAgencySubscription(agencyId);
    if (!hasSubscription) {
      return { ok: false, error: "Your agency subscription is not active. Please subscribe first." };
    }
    const tier = (listing as { listing_tier?: string }).listing_tier ?? "basic";
    const tierPaidAt = (listing as { tier_paid_at?: string | null }).tier_paid_at;
    if (tier !== "basic" && !tierPaidAt) {
      return { ok: false, error: "Payment is required before publishing. Please complete the payment for your selected visibility level first." };
    }
  }

  const payload: { status: ListingStatus; updated_at: string; published_at?: string } = {
    status,
    updated_at: new Date().toISOString(),
  };
  if (status === "published") payload.published_at = new Date().toISOString();
  // Already verified ownership via statusQuery
  const { error } = await supabase.from("listings").update(payload).eq("id", id);
  if (error) return { ok: false, error: error.message };

  // Fetch listing title for notification
  const { data: listingInfo } = await supabase
    .from("listings")
    .select("title")
    .eq("id", id)
    .single();
  const listingTitle = listingInfo?.title ?? "a listing";

  if (status === "published") {
    notifyAdmins({
      type: "listing_published",
      title: `Listing published: "${listingTitle}"`,
      link: "/admin/listings",
    }).catch(() => {});
  }

  return { ok: true };
}

export async function deleteListing(id: string): Promise<{ ok: boolean; error?: string }> {
  const { userId, agencyId, agencyRole } = await requireBroker();
  const supabase = createServiceRoleClient();
  let delQuery = supabase.from("listings").select("id, status").eq("id", id);
  if (agencyId && agencyRole === "owner") {
    delQuery = delQuery.eq("agency_id", agencyId);
  } else {
    delQuery = delQuery.eq("broker_id", userId);
  }
  const { data } = await delQuery.single();
  if (!data) return { ok: false, error: "Listing not found." };
  const { error } = await supabase.from("listings").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function uploadListingImage(listingId: string, formData: FormData): Promise<{ ok: boolean; url?: string; id?: string; error?: string }> {
  const { userId, agencyId, agencyRole } = await requireBroker();
  const supabase = createServiceRoleClient();
  let imgListingQuery = supabase.from("listings").select("id").eq("id", listingId);
  if (agencyId && agencyRole === "owner") {
    imgListingQuery = imgListingQuery.eq("agency_id", agencyId);
  } else {
    imgListingQuery = imgListingQuery.eq("broker_id", userId);
  }
  const { data: listing } = await imgListingQuery.single();
  if (!listing) return { ok: false, error: "Listing not found." };
  const { count } = await supabase.from("listing_images").select("id", { count: "exact", head: true }).eq("listing_id", listingId);
  if ((count ?? 0) >= MAX_IMAGES_PER_LISTING) return { ok: false, error: `Maximum ${MAX_IMAGES_PER_LISTING} images per listing.` };
  const file = formData.get("file") as File | null;
  if (!file?.size) return { ok: false, error: "No file provided." };
  if (file.size > MAX_IMAGE_SIZE) return { ok: false, error: "Image must be under 5MB." };
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) return { ok: false, error: "Only JPEG, PNG, WebP and GIF are allowed." };
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${listingId}/${Date.now()}.${ext}`;
  const { error: uploadError } = await supabase.storage.from(LISTING_IMAGES_BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (uploadError) return { ok: false, error: uploadError.message };
  const { data: urlData } = supabase.storage.from(LISTING_IMAGES_BUCKET).getPublicUrl(path);
  const url = urlData.publicUrl;
  const { data: imgRow, error: insertError } = await supabase
    .from("listing_images")
    .insert({ listing_id: listingId, url, sort_order: count ?? 0 })
    .select("id")
    .single();
  if (insertError) return { ok: false, error: insertError.message };
  return { ok: true, url, id: imgRow.id };
}

export async function deleteListingImage(listingId: string, imageId: string): Promise<{ ok: boolean; error?: string }> {
  const { userId, agencyId, agencyRole } = await requireBroker();
  const supabase = createServiceRoleClient();
  let ownerQuery = supabase.from("listings").select("id").eq("id", listingId);
  if (agencyId && agencyRole === "owner") {
    ownerQuery = ownerQuery.eq("agency_id", agencyId);
  } else {
    ownerQuery = ownerQuery.eq("broker_id", userId);
  }
  const { data: listing } = await ownerQuery.single();
  if (!listing) return { ok: false, error: "Listing not found." };
  const { data: img } = await supabase
    .from("listing_images")
    .select("id, url")
    .eq("id", imageId)
    .eq("listing_id", listingId)
    .single();
  if (!img) return { ok: false, error: "Image not found." };
  const { error: delError } = await supabase.from("listing_images").delete().eq("id", imageId);
  if (delError) return { ok: false, error: delError.message };
  return { ok: true };
}

export async function reorderListingImages(listingId: string, imageIds: string[]): Promise<{ ok: boolean; error?: string }> {
  const { userId, agencyId, agencyRole } = await requireBroker();
  const supabase = createServiceRoleClient();
  let reorderQuery = supabase.from("listings").select("id").eq("id", listingId);
  if (agencyId && agencyRole === "owner") {
    reorderQuery = reorderQuery.eq("agency_id", agencyId);
  } else {
    reorderQuery = reorderQuery.eq("broker_id", userId);
  }
  const { data: listing } = await reorderQuery.single();
  if (!listing) return { ok: false, error: "Listing not found." };
  for (let i = 0; i < imageIds.length; i++) {
    await supabase.from("listing_images").update({ sort_order: i }).eq("id", imageIds[i]).eq("listing_id", listingId);
  }
  return { ok: true };
}
