/**
 * Buyer alert matching engine. Runs as a background job (GitHub Actions cron),
 * not as a request handler — no "use server" directive so it can also be
 * invoked from a plain tsx script outside the Next.js runtime.
 */

import { Resend } from "resend";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { buyerAlertMatchEmail } from "@/lib/email-templates";

const resend = new Resend(process.env.RESEND_API_KEY);
const EMAIL_FROM = process.env.EMAIL_FROM ?? "noreply@salebiz.com.au";
const APP_URL = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

const DEFAULT_LOOKBACK_HOURS = 25; // > 24h to absorb missed cron runs

export type MatchingRunSummary = {
  ok: true;
  startedAt: string;
  finishedAt: string;
  lookbackHours: number;
  listingsChecked: number;
  preferencesChecked: number;
  newMatches: number;
  emailsSent: number;
  errors: string[];
};

type ListingRow = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  description: string | null;
  category_id: string | null;
  state: string | null;
  suburb: string | null;
  asking_price: number | null;
  price_type: "fixed" | "poa";
  location_text: string | null;
  published_at: string;
};

type PreferenceRow = {
  id: string;
  user_id: string;
  label: string | null;
  business_type: string | null;
  category_id: string | null;
  category_name: string | null;
  state: string | null;
  suburb: string | null;
  min_price: number | null;
  max_price: number | null;
  is_active: boolean;
};

type BuyerRow = {
  id: string;
  email: string;
  name: string | null;
};

/**
 * Hourly job: check listings published in the lookback window against every
 * active buyer alert preference. For each new (buyer × listing) match, insert a
 * dedup row, drop an in-app notification, and send an email.
 *
 * Idempotent — the (user_id, listing_id) UNIQUE constraint on
 * `buyer_alert_matches` guarantees we never double-notify if the cron runs
 * twice or overlaps a missed window.
 */
export async function runBuyerAlertMatching(options?: {
  lookbackHours?: number;
}): Promise<MatchingRunSummary> {
  const startedAt = new Date();
  const lookbackHours = options?.lookbackHours ?? DEFAULT_LOOKBACK_HOURS;
  const cutoff = new Date(startedAt.getTime() - lookbackHours * 60 * 60 * 1000);
  const summary: MatchingRunSummary = {
    ok: true,
    startedAt: startedAt.toISOString(),
    finishedAt: startedAt.toISOString(), // overwritten at end
    lookbackHours,
    listingsChecked: 0,
    preferencesChecked: 0,
    newMatches: 0,
    emailsSent: 0,
    errors: [],
  };

  const supabase = createServiceRoleClient();

  const [{ data: listings }, { data: prefs }] = await Promise.all([
    supabase
      .from("listings")
      .select(
        "id, slug, title, summary, description, category_id, state, suburb, asking_price, price_type, location_text, published_at",
      )
      .eq("status", "published")
      .gte("published_at", cutoff.toISOString())
      .order("published_at", { ascending: true }),
    supabase
      .from("buyer_alert_preferences")
      .select(
        "id, user_id, label, business_type, category_id, state, suburb, min_price, max_price, is_active, category:categories(name)",
      )
      .eq("is_active", true),
  ]);

  const listingRows = (listings ?? []) as unknown as ListingRow[];
  const preferenceRows = (prefs ?? []).map((p) => {
    const cat = (p as unknown as { category?: { name: string } | null }).category;
    return {
      id: p.id as string,
      user_id: p.user_id as string,
      label: (p.label as string | null) ?? null,
      business_type: (p.business_type as string | null) ?? null,
      category_id: (p.category_id as string | null) ?? null,
      category_name: cat?.name ?? null,
      state: (p.state as string | null) ?? null,
      suburb: (p.suburb as string | null) ?? null,
      min_price: (p.min_price as number | null) ?? null,
      max_price: (p.max_price as number | null) ?? null,
      is_active: !!p.is_active,
    } satisfies PreferenceRow;
  });

  summary.listingsChecked = listingRows.length;
  summary.preferencesChecked = preferenceRows.length;

  if (listingRows.length === 0 || preferenceRows.length === 0) {
    summary.finishedAt = new Date().toISOString();
    return summary;
  }

  // Cache buyer info to avoid N queries
  const buyerIds = Array.from(new Set(preferenceRows.map((p) => p.user_id)));
  const { data: buyers } = await supabase
    .from("users")
    .select("id, email")
    .in("id", buyerIds);
  const { data: buyerProfiles } = await supabase
    .from("profiles")
    .select("id, name, role")
    .in("id", buyerIds);
  const profileById = new Map(
    (buyerProfiles ?? []).map((p) => [
      p.id as string,
      { name: (p.name as string | null) ?? null, role: (p.role as string) ?? "user" },
    ]),
  );
  const buyerById = new Map<string, BuyerRow>(
    (buyers ?? [])
      .map((u) => {
        const profile = profileById.get(u.id as string);
        // Only buyers (role="user") get listing alerts.
        if (!profile || profile.role !== "user") return null;
        return [
          u.id as string,
          { id: u.id as string, email: u.email as string, name: profile.name },
        ] as const;
      })
      .filter((x): x is readonly [string, BuyerRow] => x !== null),
  );

  // Compute candidate (user_id × listing_id) pairs in memory
  type Candidate = { listing: ListingRow; preference: PreferenceRow };
  const bestPerPair = new Map<string, Candidate>(); // key = `${user_id}:${listing_id}`

  for (const listing of listingRows) {
    for (const pref of preferenceRows) {
      if (!buyerById.has(pref.user_id)) continue;
      if (!matchesPreference(listing, pref)) continue;
      const key = `${pref.user_id}:${listing.id}`;
      // First-found wins (preferences are arbitrary; we just need one to attribute the match to)
      if (!bestPerPair.has(key)) {
        bestPerPair.set(key, { listing, preference: pref });
      }
    }
  }

  if (bestPerPair.size === 0) {
    summary.finishedAt = new Date().toISOString();
    return summary;
  }

  // Filter out (user_id, listing_id) pairs already in buyer_alert_matches
  const pairUserIds = Array.from(new Set(Array.from(bestPerPair.values()).map((c) => c.preference.user_id)));
  const pairListingIds = Array.from(new Set(Array.from(bestPerPair.values()).map((c) => c.listing.id)));

  const { data: existingMatches } = await supabase
    .from("buyer_alert_matches")
    .select("user_id, listing_id")
    .in("user_id", pairUserIds)
    .in("listing_id", pairListingIds);
  const existingKeySet = new Set(
    (existingMatches ?? []).map((m) => `${m.user_id}:${m.listing_id}`),
  );

  // Process each new match
  for (const [key, { listing, preference }] of bestPerPair) {
    if (existingKeySet.has(key)) continue;

    const buyer = buyerById.get(preference.user_id);
    if (!buyer) continue;

    try {
      // 1) In-app notification
      const listingPath = `/listing/${listing.slug}`;
      const matchedFor = describeMatch(preference);
      const { data: notif } = await supabase
        .from("notifications")
        .insert({
          user_id: buyer.id,
          type: "listing_alert_match",
          title: `New match: ${listing.title}`,
          message: matchedFor || "Matches one of your alerts.",
          link: listingPath,
        })
        .select("id")
        .single();

      // 2) Insert dedup match row (race-safe via UNIQUE constraint)
      const { error: matchInsertError } = await supabase
        .from("buyer_alert_matches")
        .insert({
          user_id: buyer.id,
          preference_id: preference.id,
          listing_id: listing.id,
          notification_id: notif?.id ?? null,
        });
      if (matchInsertError) {
        // 23505 = unique violation: another worker beat us to it. Safe to skip.
        if (!matchInsertError.message?.toLowerCase().includes("duplicate")) {
          summary.errors.push(`match insert (${buyer.id}/${listing.id}): ${matchInsertError.message}`);
        }
        continue;
      }
      summary.newMatches += 1;

      // 3) Email
      const emailSent = await sendMatchEmail(buyer, preference, listing, matchedFor);
      if (emailSent) {
        summary.emailsSent += 1;
        await supabase
          .from("buyer_alert_matches")
          .update({ email_sent_at: new Date().toISOString() })
          .eq("user_id", buyer.id)
          .eq("listing_id", listing.id);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      summary.errors.push(`process (${buyer.id}/${listing.id}): ${msg}`);
    }
  }

  summary.finishedAt = new Date().toISOString();
  return summary;
}

function matchesPreference(listing: ListingRow, pref: PreferenceRow): boolean {
  // Category — strict
  if (pref.category_id && pref.category_id !== listing.category_id) return false;

  // State — strict, case-insensitive
  if (pref.state) {
    if (!listing.state || listing.state.toLowerCase() !== pref.state.toLowerCase()) {
      return false;
    }
  }

  // Suburb — partial, case-insensitive
  if (pref.suburb) {
    const target = pref.suburb.trim().toLowerCase();
    const candidate = (listing.suburb ?? listing.location_text ?? "").toLowerCase();
    if (!candidate.includes(target)) return false;
  }

  // Business type — keyword search across title/summary/description
  if (pref.business_type) {
    const target = pref.business_type.trim().toLowerCase();
    if (target.length > 0) {
      const haystack = [listing.title, listing.summary, listing.description]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(target)) return false;
    }
  }

  // Price — only enforce on listings with a known asking_price.
  // POA listings always pass the price filter so buyers don't miss them.
  if (listing.price_type === "fixed" && listing.asking_price != null) {
    if (pref.min_price != null && listing.asking_price < pref.min_price) return false;
    if (pref.max_price != null && listing.asking_price > pref.max_price) return false;
  }

  return true;
}

function describeMatch(pref: PreferenceRow): string {
  const parts: string[] = [];
  if (pref.business_type) parts.push(pref.business_type);
  if (pref.category_name) parts.push(pref.category_name);
  const loc = [pref.suburb, pref.state].filter(Boolean).join(", ");
  if (loc) parts.push(`in ${loc}`);
  if (pref.min_price != null && pref.max_price != null) {
    parts.push(`${formatShort(pref.min_price)}–${formatShort(pref.max_price)}`);
  } else if (pref.max_price != null) {
    parts.push(`up to ${formatShort(pref.max_price)}`);
  } else if (pref.min_price != null) {
    parts.push(`from ${formatShort(pref.min_price)}`);
  }
  return parts.join(" ");
}

async function sendMatchEmail(
  buyer: BuyerRow,
  preference: PreferenceRow,
  listing: ListingRow,
  matchedFor: string,
): Promise<boolean> {
  if (!process.env.RESEND_API_KEY) return false;
  const listingUrl = `${APP_URL}/listing/${listing.slug}`;
  const manageAlertsUrl = `${APP_URL}/account#alerts`;
  const price = formatPriceLabel(listing);

  try {
    await resend.emails.send({
      from: EMAIL_FROM,
      to: buyer.email,
      subject: `New match: ${listing.title}`,
      html: buyerAlertMatchEmail({
        buyerName: buyer.name,
        alertLabel: preference.label,
        listingTitle: listing.title,
        listingUrl,
        price,
        location: listing.location_text,
        matchedFor,
        manageAlertsUrl,
      }),
    });
    return true;
  } catch (err) {
    console.error("[alert-match] email failed:", err);
    return false;
  }
}

function formatPriceLabel(listing: ListingRow): string | null {
  if (listing.price_type === "poa") return "Price on application";
  if (listing.asking_price == null) return null;
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(listing.asking_price);
}

function formatShort(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}k`;
  return `$${n}`;
}
