"use server";

import { createServiceRoleClient } from "@/lib/supabase/admin";
import type { Listing } from "@/lib/types/listings";

async function requireUser() {
  const { getServerSession } = await import("next-auth");
  const { authOptions } = await import("@/lib/auth");
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }
  return { userId: session.user.id };
}

export async function getUserFavorites(): Promise<{
  listings: Listing[];
  listingIds: string[];
}> {
  const { userId } = await requireUser();
  const supabase = createServiceRoleClient();

  const { data: favs } = await supabase
    .from("user_favorites")
    .select("listing_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  const listingIds = (favs ?? []).map((f) => f.listing_id);
  if (listingIds.length === 0) return { listings: [], listingIds: [] };

  const { data: listings } = await supabase
    .from("listings")
    .select(`
      *,
      category:categories(*),
      listing_images(*),
      listing_highlights:listing_highlight_map(
        ...listing_highlights(*)
      )
    `)
    .in("id", listingIds)
    .eq("status", "published");

  return { listings: listings ?? [], listingIds };
}

export async function toggleFavorite(
  listingId: string
): Promise<{ ok: true; isFavorited: boolean } | { ok: false; error: string }> {
  const { userId } = await requireUser();
  const supabase = createServiceRoleClient();

  // Check if already favorited
  const { data: existing } = await supabase
    .from("user_favorites")
    .select("id")
    .eq("user_id", userId)
    .eq("listing_id", listingId)
    .single();

  if (existing) {
    const { error } = await supabase
      .from("user_favorites")
      .delete()
      .eq("user_id", userId)
      .eq("listing_id", listingId);
    if (error) return { ok: false, error: "Failed to remove favorite." };
    return { ok: true, isFavorited: false };
  } else {
    const { error } = await supabase
      .from("user_favorites")
      .insert({ user_id: userId, listing_id: listingId });
    if (error) return { ok: false, error: "Failed to save favorite." };
    return { ok: true, isFavorited: true };
  }
}

export async function isFavorited(listingId: string): Promise<boolean> {
  const { getServerSession } = await import("next-auth");
  const { authOptions } = await import("@/lib/auth");
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return false;

  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("user_favorites")
    .select("id")
    .eq("user_id", session.user.id)
    .eq("listing_id", listingId)
    .single();
  return !!data;
}

export async function getFavoriteListingIds(): Promise<string[]> {
  const { getServerSession } = await import("next-auth");
  const { authOptions } = await import("@/lib/auth");
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return [];

  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("user_favorites")
    .select("listing_id")
    .eq("user_id", session.user.id);
  return (data ?? []).map((f) => f.listing_id);
}
