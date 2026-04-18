"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import type { Listing } from "@/lib/types/listings";
import { isListingFeaturedAnywhere } from "@/lib/featured-dates";

async function requireBroker() {
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

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "admin") {
    throw new Error("Unauthorized");
  }
  return { userId: session.user.id };
}

const nowIso = () => new Date().toISOString();

/** Active if either scope is still featured (matches buyer-facing rules). */
function featuredOrFilter() {
  const iso = nowIso();
  // Quote ISO timestamps for PostgREST (colons in value).
  return `featured_homepage_until.gt."${iso}",featured_category_until.gt."${iso}"`;
}

/** Get active featured listings for broker. */
export async function getBrokerFeaturedListings(): Promise<Listing[]> {
  const { userId } = await requireBroker();
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from("listings")
    .select(`
      *,
      category:categories(id, name, slug),
      listing_images(id, url, sort_order)
    `)
    .eq("broker_id", userId)
    .or(featuredOrFilter())
    .order("featured_homepage_until", { ascending: false, nullsFirst: false })
    .order("featured_category_until", { ascending: false, nullsFirst: false });

  if (error) return [];
  const rows = (data ?? []) as Listing[];
  return rows.filter((l) => isListingFeaturedAnywhere(l));
}

/** Get active featured listings for agency brokers. */
export async function getAgencyFeaturedListings(): Promise<Listing[]> {
  const { agencyId, agencyRole } = await requireBroker();
  if (!agencyId || agencyRole !== "owner") {
    throw new Error("Unauthorized");
  }

  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from("listings")
    .select(`
      *,
      category:categories(id, name, slug),
      listing_images(id, url, sort_order),
      broker:profiles!broker_id(name, company)
    `)
    .eq("agency_id", agencyId)
    .or(featuredOrFilter())
    .order("featured_homepage_until", { ascending: false, nullsFirst: false })
    .order("featured_category_until", { ascending: false, nullsFirst: false });

  if (error) return [];
  const rows = (data ?? []) as Listing[];
  return rows.filter((l) => isListingFeaturedAnywhere(l));
}

function syncLegacyFeaturedFields(payload: Record<string, unknown>, row: {
  featured_homepage_until?: string | null;
  featured_category_until?: string | null;
}) {
  const now = new Date();
  const hp = row.featured_homepage_until
    ? new Date(row.featured_homepage_until).getTime()
    : 0;
  const cat = row.featured_category_until
    ? new Date(row.featured_category_until).getTime()
    : 0;
  const active = hp > now.getTime() || cat > now.getTime();
  payload.is_featured = active;
  const times = [hp, cat].filter((t) => t > 0);
  payload.featured_until =
    times.length > 0 ? new Date(Math.max(...times)).toISOString() : null;
}

/** Admin: set a listing as featured manually (homepage scope; matches broker-paid “homepage”). */
export async function adminSetFeatured(
  listingId: string,
  days: number
): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const supabase = createServiceRoleClient();

  const { data: listing } = await supabase
    .from("listings")
    .select("featured_homepage_until, featured_category_until")
    .eq("id", listingId)
    .single();

  if (!listing) return { ok: false, error: "Listing not found" };

  const now = new Date();
  const homepageBase =
    listing.featured_homepage_until &&
    new Date(listing.featured_homepage_until) > now
      ? new Date(listing.featured_homepage_until)
      : now;
  const hpUntil = new Date(
    homepageBase.getTime() + days * 24 * 60 * 60 * 1000
  ).toISOString();

  const nextRow = {
    featured_homepage_until: hpUntil,
    featured_category_until: listing.featured_category_until ?? null,
  };

  const payload: Record<string, unknown> = {
    featured_from: now.toISOString(),
    featured_package_days: days,
    featured_scope: "homepage",
    featured_homepage_until: hpUntil,
  };

  syncLegacyFeaturedFields(payload, nextRow);

  const { error } = await supabase
    .from("listings")
    .update(payload)
    .eq("id", listingId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** Admin: remove featured status from a listing. */
export async function adminRemoveFeatured(
  listingId: string
): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const supabase = createServiceRoleClient();

  const { error } = await supabase
    .from("listings")
    .update({
      is_featured: false,
      featured_from: null,
      featured_until: null,
      featured_homepage_until: null,
      featured_category_until: null,
      featured_scope: null,
      featured_package_days: null,
    })
    .eq("id", listingId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** Admin: extend active featured windows by N days (each scope that is still active). */
export async function adminExtendFeatured(
  listingId: string,
  additionalDays: number
): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const supabase = createServiceRoleClient();

  const { data: listing } = await supabase
    .from("listings")
    .select("featured_homepage_until, featured_category_until")
    .eq("id", listingId)
    .single();

  if (!listing) return { ok: false, error: "Listing not found" };

  const now = Date.now();
  const addMs = additionalDays * 24 * 60 * 60 * 1000;

  let nextHp: string | null = listing.featured_homepage_until ?? null;
  let nextCat: string | null = listing.featured_category_until ?? null;

  const hpMs = nextHp ? new Date(nextHp).getTime() : 0;
  const catMs = nextCat ? new Date(nextCat).getTime() : 0;
  const hpActive = hpMs > now;
  const catActive = catMs > now;

  if (!hpActive && !catActive) {
    return { ok: false, error: "Listing has no active featured period to extend" };
  }

  if (hpActive) {
    nextHp = new Date(hpMs + addMs).toISOString();
  }
  if (catActive) {
    nextCat = new Date(catMs + addMs).toISOString();
  }

  const payload: Record<string, unknown> = {
    featured_homepage_until: nextHp,
    featured_category_until: nextCat,
  };

  syncLegacyFeaturedFields(payload, {
    featured_homepage_until: nextHp,
    featured_category_until: nextCat,
  });

  const { error } = await supabase
    .from("listings")
    .update(payload)
    .eq("id", listingId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
