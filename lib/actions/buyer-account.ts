"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { optimizeLogo } from "@/lib/image-optimizer";

export type BuyerFundingStatus =
  | "self_funded"
  | "pre_approved"
  | "seeking_finance"
  | "unspecified";
export type BuyerTimeframe =
  | "lt_3m"
  | "3_6m"
  | "6_12m"
  | "gt_12m"
  | "unspecified";

export type BuyerPreferences = {
  budget_min: number | null;
  budget_max: number | null;
  preferred_industries: string[];
  preferred_locations: string[];
  funding_status: BuyerFundingStatus | null;
  timeframe: BuyerTimeframe | null;
  location_text: string | null;
};

export type BuyerAccount = {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  photo_url: string | null;
  email_verified_at: string | null;
  created_at: string | null;
  last_active_at: string | null;
  preferences: BuyerPreferences;
  stats: {
    saved_listings: number;
    enquiries: number;
    nda_signed: number;
  };
};

/**
 * Bump a buyer's `profiles.last_active_at`. Safe to fire-and-forget — never
 * throws and never blocks the caller's primary action.
 *
 * Called from any buyer-initiated write (enquiry, NDA sign, favourite toggle,
 * doc view in M2). Powers the "Last active" surface on the broker CRM panel.
 */
export async function bumpBuyerActivity(userId: string | null | undefined): Promise<void> {
  if (!userId) return;
  const supabase = createServiceRoleClient();
  await supabase
    .from("profiles")
    .update({ last_active_at: new Date().toISOString() })
    .eq("id", userId)
    .eq("role", "user")
    .then(() => undefined, () => undefined);
}

const ALLOWED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_PHOTO_SIZE = 5 * 1024 * 1024; // 5MB

async function requireBuyer() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }
  if (session.user.role !== "user") {
    throw new Error("Forbidden");
  }
  return { userId: session.user.id, email: session.user.email ?? "" };
}

export async function getBuyerAccount(): Promise<BuyerAccount> {
  const { userId } = await requireBuyer();
  const supabase = createServiceRoleClient();

  const [profileRes, userRes, favCountRes, enqCountRes, ndaCountRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, name, phone, photo_url, created_at, last_active_at, budget_min, budget_max, preferred_industries, preferred_locations, funding_status, timeframe, location_text")
      .eq("id", userId)
      .maybeSingle(),
    supabase
      .from("users")
      .select("id, email, email_verified_at, created_at")
      .eq("id", userId)
      .maybeSingle(),
    supabase
      .from("user_favorites")
      .select("listing_id", { count: "exact", head: true })
      .eq("user_id", userId),
    supabase
      .from("enquiries")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
    supabase
      .from("nda_signatures")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
  ]);

  const profile = profileRes.data;
  const user = userRes.data;
  if (!user) throw new Error("Account not found");

  return {
    id: user.id,
    email: user.email,
    name: profile?.name ?? null,
    phone: profile?.phone ?? null,
    photo_url: profile?.photo_url ?? null,
    email_verified_at: user.email_verified_at ?? null,
    created_at: profile?.created_at ?? user.created_at ?? null,
    last_active_at: profile?.last_active_at ?? null,
    preferences: {
      budget_min: profile?.budget_min ?? null,
      budget_max: profile?.budget_max ?? null,
      preferred_industries: profile?.preferred_industries ?? [],
      preferred_locations: profile?.preferred_locations ?? [],
      funding_status: (profile?.funding_status as BuyerFundingStatus | null) ?? null,
      timeframe: (profile?.timeframe as BuyerTimeframe | null) ?? null,
      location_text: profile?.location_text ?? null,
    },
    stats: {
      saved_listings: favCountRes.count ?? 0,
      enquiries: enqCountRes.count ?? 0,
      nda_signed: ndaCountRes.count ?? 0,
    },
  };
}

export async function updateBuyerAccount(input: {
  name?: string;
  phone?: string | null;
  // Investment preferences (M1.1):
  budget_min?: number | null;
  budget_max?: number | null;
  preferred_industries?: string[] | null;
  preferred_locations?: string[] | null;
  funding_status?: BuyerFundingStatus | null;
  timeframe?: BuyerTimeframe | null;
  location_text?: string | null;
}): Promise<{ ok: boolean; error?: string }> {
  const { userId } = await requireBuyer();
  const supabase = createServiceRoleClient();

  const updates: Record<string, unknown> = {};

  if (input.name !== undefined) {
    const name = input.name.trim();
    if (name.length < 2 || name.length > 120) {
      return { ok: false, error: "Name must be 2 to 120 characters." };
    }
    updates.name = name;
  }

  if (input.phone !== undefined) {
    const raw = (input.phone ?? "").trim();
    if (raw === "") {
      updates.phone = null;
    } else {
      if (raw.length > 32) return { ok: false, error: "Phone is too long." };
      // Lightweight sanity check; full E.164 validation lives in the form layer.
      if (!/^[+\d\s().-]{5,32}$/.test(raw)) {
        return { ok: false, error: "Phone number contains invalid characters." };
      }
      updates.phone = raw;
    }
  }

  if (input.budget_min !== undefined) {
    if (input.budget_min !== null && (!Number.isFinite(input.budget_min) || input.budget_min < 0)) {
      return { ok: false, error: "Minimum budget must be a non-negative number." };
    }
    updates.budget_min = input.budget_min;
  }
  if (input.budget_max !== undefined) {
    if (input.budget_max !== null && (!Number.isFinite(input.budget_max) || input.budget_max < 0)) {
      return { ok: false, error: "Maximum budget must be a non-negative number." };
    }
    updates.budget_max = input.budget_max;
  }
  if (
    typeof updates.budget_min === "number" &&
    typeof updates.budget_max === "number" &&
    updates.budget_min > updates.budget_max
  ) {
    return { ok: false, error: "Minimum budget must be less than or equal to maximum." };
  }

  if (input.preferred_industries !== undefined) {
    updates.preferred_industries = input.preferred_industries
      ? input.preferred_industries.map((s) => s.trim()).filter(Boolean).slice(0, 20)
      : null;
  }
  if (input.preferred_locations !== undefined) {
    updates.preferred_locations = input.preferred_locations
      ? input.preferred_locations.map((s) => s.trim()).filter(Boolean).slice(0, 20)
      : null;
  }
  if (input.funding_status !== undefined) {
    if (
      input.funding_status !== null &&
      !["self_funded", "pre_approved", "seeking_finance", "unspecified"].includes(input.funding_status)
    ) {
      return { ok: false, error: "Invalid funding status." };
    }
    updates.funding_status = input.funding_status;
  }
  if (input.timeframe !== undefined) {
    if (
      input.timeframe !== null &&
      !["lt_3m", "3_6m", "6_12m", "gt_12m", "unspecified"].includes(input.timeframe)
    ) {
      return { ok: false, error: "Invalid timeframe." };
    }
    updates.timeframe = input.timeframe;
  }
  if (input.location_text !== undefined) {
    const t = (input.location_text ?? "").trim();
    if (t.length > 200) return { ok: false, error: "Location is too long." };
    updates.location_text = t || null;
  }

  if (Object.keys(updates).length === 0) {
    return { ok: false, error: "No changes to save." };
  }
  updates.updated_at = new Date().toISOString();

  const { error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", userId)
    .eq("role", "user");

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function uploadBuyerPhoto(
  formData: FormData,
): Promise<{ ok: boolean; url?: string; error?: string }> {
  const { userId } = await requireBuyer();
  const file = formData.get("file") as File | null;
  if (!file?.size) return { ok: false, error: "No file provided." };
  if (file.size > MAX_PHOTO_SIZE)
    return { ok: false, error: "Photo must be under 5MB." };
  if (!ALLOWED_PHOTO_TYPES.includes(file.type))
    return { ok: false, error: "Only JPEG, PNG, WebP and GIF are allowed." };

  const supabase = createServiceRoleClient();

  // Clear existing avatars to avoid stale CDN entries
  const { data: oldFiles } = await supabase.storage.from("avatars").list(userId);
  if (oldFiles?.length) {
    await supabase.storage
      .from("avatars")
      .remove(oldFiles.map((f) => `${userId}/${f.name}`));
  }

  const arrayBuffer = await file.arrayBuffer();
  const { buffer: optimized, contentType } = await optimizeLogo(
    Buffer.from(arrayBuffer),
    { maxWidth: 400 },
  );

  const path = `${userId}/avatar-${Date.now()}.jpg`;

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(path, optimized, { contentType });
  if (uploadError) return { ok: false, error: uploadError.message };

  const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
  const url = urlData.publicUrl;

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ photo_url: url, updated_at: new Date().toISOString() })
    .eq("id", userId)
    .eq("role", "user");
  if (updateError) return { ok: false, error: updateError.message, url };

  return { ok: true, url };
}

export async function removeBuyerPhoto(): Promise<{ ok: boolean; error?: string }> {
  const { userId } = await requireBuyer();
  const supabase = createServiceRoleClient();

  const { data: oldFiles } = await supabase.storage.from("avatars").list(userId);
  if (oldFiles?.length) {
    await supabase.storage
      .from("avatars")
      .remove(oldFiles.map((f) => `${userId}/${f.name}`));
  }

  const { error } = await supabase
    .from("profiles")
    .update({ photo_url: null, updated_at: new Date().toISOString() })
    .eq("id", userId)
    .eq("role", "user");
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
