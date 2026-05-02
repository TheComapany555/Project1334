"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import type {
  BuyerAlertPreference,
  BuyerEnquiryRow,
  BuyerPanelSnapshot,
  BuyerSavedListing,
  BuyerSentToMeRow,
} from "@/lib/types/buyer-panel";

const PANEL_PAGE_SIZE = 5;

async function requireBuyer() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");
  if (session.user.role !== "user") throw new Error("Forbidden");
  return {
    userId: session.user.id,
    email: (session.user.email ?? "").toLowerCase(),
  };
}

type ListingRow = {
  id: string;
  slug: string;
  title: string;
  asking_price: number | null;
  price_type: "fixed" | "poa";
  location_text: string | null;
  listing_images: { url: string; sort_order: number }[] | null;
};

function pickCover(images: ListingRow["listing_images"]): string | null {
  if (!images?.length) return null;
  return [...images].sort((a, b) => a.sort_order - b.sort_order)[0]?.url ?? null;
}

/** Snapshot used by the side panel cards (top N each). */
export async function getBuyerPanelSnapshot(): Promise<BuyerPanelSnapshot> {
  const { userId, email } = await requireBuyer();
  const supabase = createServiceRoleClient();

  // Saved listings (auto-saved on enquiry, plus manual favourites)
  const savedPromise = (async () => {
    const { data: favRows, count } = await supabase
      .from("user_favorites")
      .select("listing_id, created_at", { count: "exact" })
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(PANEL_PAGE_SIZE);
    const ids = (favRows ?? []).map((r) => r.listing_id);
    if (ids.length === 0) return { items: [] as BuyerSavedListing[], total: count ?? 0 };

    const { data: listings } = await supabase
      .from("listings")
      .select(
        "id, slug, title, asking_price, price_type, location_text, listing_images(url, sort_order)",
      )
      .in("id", ids)
      .eq("status", "published");

    const listingById = new Map((listings ?? []).map((l) => [l.id, l as unknown as ListingRow]));
    const items: BuyerSavedListing[] = (favRows ?? [])
      .map((r) => {
        const l = listingById.get(r.listing_id);
        if (!l) return null;
        return {
          id: l.id,
          slug: l.slug,
          title: l.title,
          location_text: l.location_text,
          asking_price: l.asking_price,
          price_type: l.price_type,
          cover_image_url: pickCover(l.listing_images),
          saved_at: r.created_at,
        } satisfies BuyerSavedListing;
      })
      .filter(Boolean) as BuyerSavedListing[];
    return { items, total: count ?? items.length };
  })();

  // Recent enquiries — link by user_id (logged-in submissions)
  const enquiriesPromise = (async () => {
    const { data: rows, count } = await supabase
      .from("enquiries")
      .select(
        "id, created_at, reason, message, listing:listings(id, slug, title, listing_images(url, sort_order))",
        { count: "exact" },
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(PANEL_PAGE_SIZE);

    const items: BuyerEnquiryRow[] = (rows ?? []).map((row) => {
      const listing = (row as unknown as {
        listing: ListingRow | null;
      }).listing;
      return {
        id: row.id as string,
        created_at: row.created_at as string,
        reason: (row.reason as string | null) ?? null,
        message: (row.message as string) ?? "",
        // Broker-side status tracking is not yet wired; default to "sent" for now.
        status: "sent",
        listing: listing
          ? {
              id: listing.id,
              slug: listing.slug,
              title: listing.title,
              cover_image_url: pickCover(listing.listing_images),
            }
          : null,
      };
    });

    return { items, total: count ?? items.length };
  })();

  // Listings shared with me (broker → buyer share invites by email)
  const sentToMePromise = (async () => {
    if (!email) return { items: [] as BuyerSentToMeRow[], total: 0 };
    const { data: rows, count } = await supabase
      .from("listing_share_invites")
      .select(
        "id, token, custom_message, sent_at, expires_at, opened_at, broker_name_snapshot, listing:listings(id, slug, title, asking_price, price_type, location_text, listing_images(url, sort_order))",
        { count: "exact" },
      )
      .ilike("recipient_email", email)
      .order("sent_at", { ascending: false })
      .limit(PANEL_PAGE_SIZE);

    const items: BuyerSentToMeRow[] = (rows ?? []).map((row) => {
      const listing = (row as unknown as { listing: ListingRow | null }).listing;
      return {
        invite_id: row.id as string,
        token: row.token as string,
        custom_message: (row.custom_message as string | null) ?? null,
        sent_at: row.sent_at as string,
        expires_at: row.expires_at as string,
        opened_at: (row.opened_at as string | null) ?? null,
        broker_name: (row.broker_name_snapshot as string | null) ?? null,
        listing: listing
          ? {
              id: listing.id,
              slug: listing.slug,
              title: listing.title,
              cover_image_url: pickCover(listing.listing_images),
              asking_price: listing.asking_price,
              price_type: listing.price_type,
              location_text: listing.location_text,
            }
          : null,
      };
    });

    return { items, total: count ?? items.length };
  })();

  const alertsPromise = (async () => {
    const { data: rows } = await supabase
      .from("buyer_alert_preferences")
      .select(
        "id, user_id, label, business_type, category_id, state, suburb, min_price, max_price, is_active, created_at, updated_at, category:categories(name)",
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    return (rows ?? []).map((r) => {
      const category = (r as unknown as { category?: { name: string } | null }).category;
      return {
        id: r.id as string,
        user_id: r.user_id as string,
        label: (r.label as string | null) ?? null,
        business_type: (r.business_type as string | null) ?? null,
        category_id: (r.category_id as string | null) ?? null,
        category_name: category?.name ?? null,
        state: (r.state as string | null) ?? null,
        suburb: (r.suburb as string | null) ?? null,
        min_price: (r.min_price as number | null) ?? null,
        max_price: (r.max_price as number | null) ?? null,
        is_active: !!r.is_active,
        created_at: r.created_at as string,
        updated_at: r.updated_at as string,
      } satisfies BuyerAlertPreference;
    });
  })();

  const [saved, enquiries, sentToMe, alerts] = await Promise.all([
    savedPromise,
    enquiriesPromise,
    sentToMePromise,
    alertsPromise,
  ]);

  return { saved, enquiries, sentToMe, alerts };
}
