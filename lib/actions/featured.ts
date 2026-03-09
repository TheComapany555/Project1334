"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import type { Listing } from "@/lib/types/listings";

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
    .gt("featured_until", new Date().toISOString())
    .order("featured_until", { ascending: false });

  if (error) return [];
  return (data ?? []) as Listing[];
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
    .gt("featured_until", new Date().toISOString())
    .order("featured_until", { ascending: false });

  if (error) return [];
  return (data ?? []) as Listing[];
}

/** Admin: set a listing as featured manually. */
export async function adminSetFeatured(
  listingId: string,
  days: number
): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const supabase = createServiceRoleClient();

  const now = new Date();
  const featuredUntil = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  const { error } = await supabase
    .from("listings")
    .update({
      is_featured: true,
      featured_from: now.toISOString(),
      featured_until: featuredUntil.toISOString(),
      featured_package_days: days,
    })
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
      featured_package_days: null,
    })
    .eq("id", listingId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** Admin: extend featured period by N days. */
export async function adminExtendFeatured(
  listingId: string,
  additionalDays: number
): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const supabase = createServiceRoleClient();

  const { data: listing } = await supabase
    .from("listings")
    .select("featured_until")
    .eq("id", listingId)
    .single();

  if (!listing) return { ok: false, error: "Listing not found" };

  // Extend from current featured_until or from now if expired
  const base = listing.featured_until
    ? new Date(
        Math.max(
          new Date(listing.featured_until).getTime(),
          Date.now()
        )
      )
    : new Date();

  const newUntil = new Date(
    base.getTime() + additionalDays * 24 * 60 * 60 * 1000
  );

  const { error } = await supabase
    .from("listings")
    .update({
      is_featured: true,
      featured_until: newUntil.toISOString(),
      featured_from: listing.featured_until ? undefined : new Date().toISOString(),
    })
    .eq("id", listingId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
