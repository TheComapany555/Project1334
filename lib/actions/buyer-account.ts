"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { optimizeLogo } from "@/lib/image-optimizer";

export type BuyerAccount = {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  photo_url: string | null;
  email_verified_at: string | null;
  created_at: string | null;
  stats: {
    saved_listings: number;
    enquiries: number;
    nda_signed: number;
  };
};

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
      .select("id, name, phone, photo_url, created_at")
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
}): Promise<{ ok: boolean; error?: string }> {
  const { userId } = await requireBuyer();
  const supabase = createServiceRoleClient();

  const updates: Record<string, string | null> = {};

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
