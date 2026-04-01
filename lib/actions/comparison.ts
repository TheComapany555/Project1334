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

export async function getComparisonListings(
  listingIds: string[]
): Promise<Listing[]> {
  if (listingIds.length === 0) return [];
  const supabase = createServiceRoleClient();

  const { data } = await supabase
    .from("listings")
    .select(`
      *,
      category:categories(*),
      listing_images(*),
      listing_highlights:listing_highlight_map(
        ...listing_highlights(*)
      ),
      broker:profiles!broker_id(name, photo_url, slug),
      agency:agencies(name, slug, logo_url)
    `)
    .in("id", listingIds)
    .eq("status", "published");

  return data ?? [];
}

export async function addToComparison(
  listingId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { userId } = await requireUser();
  const supabase = createServiceRoleClient();

  // Get or create default comparison list
  let { data: list } = await supabase
    .from("comparison_lists")
    .select("id")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .single();

  if (!list) {
    const { data: newList, error: createErr } = await supabase
      .from("comparison_lists")
      .insert({ user_id: userId, name: "My Comparison" })
      .select("id")
      .single();
    if (createErr || !newList) {
      return { ok: false, error: "Failed to create comparison list." };
    }
    list = newList;
  }

  // Check count (max 6 comparisons)
  const { count } = await supabase
    .from("comparison_list_items")
    .select("id", { count: "exact", head: true })
    .eq("comparison_list_id", list.id);

  if ((count ?? 0) >= 6) {
    return { ok: false, error: "Maximum 6 listings can be compared at once." };
  }

  const { error } = await supabase
    .from("comparison_list_items")
    .upsert(
      { comparison_list_id: list.id, listing_id: listingId },
      { onConflict: "comparison_list_id,listing_id" }
    );

  if (error) return { ok: false, error: "Failed to add to comparison." };
  return { ok: true };
}

export async function removeFromComparison(
  listingId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { userId } = await requireUser();
  const supabase = createServiceRoleClient();

  const { data: list } = await supabase
    .from("comparison_lists")
    .select("id")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .single();

  if (!list) return { ok: true };

  const { error } = await supabase
    .from("comparison_list_items")
    .delete()
    .eq("comparison_list_id", list.id)
    .eq("listing_id", listingId);

  if (error) return { ok: false, error: "Failed to remove from comparison." };
  return { ok: true };
}

export async function getComparisonListingIds(): Promise<string[]> {
  const { getServerSession } = await import("next-auth");
  const { authOptions } = await import("@/lib/auth");
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return [];

  const supabase = createServiceRoleClient();
  const { data: list } = await supabase
    .from("comparison_lists")
    .select("id")
    .eq("user_id", session.user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .single();

  if (!list) return [];

  const { data: items } = await supabase
    .from("comparison_list_items")
    .select("listing_id")
    .eq("comparison_list_id", list.id)
    .order("added_at", { ascending: true });

  return (items ?? []).map((i) => i.listing_id);
}

export async function clearComparison(): Promise<{ ok: true } | { ok: false; error: string }> {
  const { userId } = await requireUser();
  const supabase = createServiceRoleClient();

  const { data: list } = await supabase
    .from("comparison_lists")
    .select("id")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .single();

  if (!list) return { ok: true };

  const { error } = await supabase
    .from("comparison_list_items")
    .delete()
    .eq("comparison_list_id", list.id);

  if (error) return { ok: false, error: "Failed to clear comparison." };
  return { ok: true };
}

/** Fetch all published listings (lightweight) for comparison picker dropdowns. */
export async function getAllPublishedListingsForPicker(): Promise<
  { id: string; title: string; slug: string; location: string; image: string | null }[]
> {
  const supabase = createServiceRoleClient();

  const { data } = await supabase
    .from("listings")
    .select(`
      id, title, slug, location_text, suburb, state,
      listing_images(url, sort_order)
    `)
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(200);

  return (data ?? []).map((l) => ({
    id: l.id,
    title: l.title,
    slug: l.slug,
    location:
      l.location_text ||
      [l.suburb, l.state].filter(Boolean).join(", ") ||
      "",
    image:
      (l.listing_images as { url: string; sort_order: number }[] | null)
        ?.sort((a, b) => a.sort_order - b.sort_order)?.[0]?.url ?? null,
  }));
}
