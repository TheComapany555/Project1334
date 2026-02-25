"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { generateSlugFromName } from "@/lib/slug";

export type ProfileFormData = {
  name: string | null;
  company: string | null;
  phone: string | null;
  email_public: string | null;
  website: string | null;
  bio: string | null;
  slug: string | null;
  social_links: {
    linkedin?: string;
    facebook?: string;
    instagram?: string;
  } | null;
};

export type ProfilePublic = ProfileFormData & {
  id: string;
  role: string;
  logo_url: string | null;
  photo_url: string | null;
  created_at: string;
  updated_at: string;
};

async function requireBroker() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "broker") {
    throw new Error("Unauthorized");
  }
  return { session, userId: session.user.id };
}

export async function getProfileForEdit(): Promise<ProfileFormData & { photo_url: string | null; logo_url: string | null } | null> {
  const { userId } = await requireBroker();
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("name, company, phone, email_public, website, bio, slug, social_links, photo_url, logo_url")
    .eq("id", userId)
    .single();
  if (error || !data) return null;
  return {
    ...data,
    social_links: (data.social_links as ProfileFormData["social_links"]) ?? null,
  };
}

export async function getBrokerSlug(): Promise<string | null> {
  const { userId } = await requireBroker();
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase.from("profiles").select("slug").eq("id", userId).single();
  if (error || !data?.slug) return null;
  return data.slug as string;
}

export async function getProfileBySlug(slug: string): Promise<ProfilePublic | null> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, name, company, phone, email_public, website, bio, slug, social_links, logo_url, photo_url, role, created_at, updated_at")
    .eq("slug", slug)
    .eq("role", "broker")
    .single();
  if (error || !data) return null;
  return data as ProfilePublic;
}

export async function checkSlugAvailable(slug: string, excludeUserId?: string): Promise<boolean> {
  if (!slug.trim()) return false;
  const supabase = createServiceRoleClient();
  let query = supabase.from("profiles").select("id").eq("slug", slug.trim()).limit(1);
  if (excludeUserId) query = query.neq("id", excludeUserId);
  const { data } = await query;
  return !data || data.length === 0;
}

export async function updateProfile(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const { userId } = await requireBroker();
  const supabase = createServiceRoleClient();

  const name = (formData.get("name") as string)?.trim() || null;
  const company = (formData.get("company") as string)?.trim() || null;
  const phone = (formData.get("phone") as string)?.trim() || null;
  const email_public = (formData.get("email_public") as string)?.trim() || null;
  const website = (formData.get("website") as string)?.trim() || null;
  const bio = (formData.get("bio") as string)?.trim() || null;
  let slug = (formData.get("slug") as string)?.trim() || null;

  const linkedin = (formData.get("social_linkedin") as string)?.trim() || undefined;
  const facebook = (formData.get("social_facebook") as string)?.trim() || undefined;
  const instagram = (formData.get("social_instagram") as string)?.trim() || undefined;
  const social_links =
    linkedin || facebook || instagram
      ? { linkedin, facebook, instagram }
      : null;

  if (slug?.trim()) {
    const available = await checkSlugAvailable(slug.trim(), userId);
    if (!available) return { ok: false, error: "This profile URL is already taken." };
  } else if (name) {
    let base = generateSlugFromName(name);
    let candidate = base;
    let n = 0;
    while (!(await checkSlugAvailable(candidate, userId))) {
      n += 1;
      candidate = `${base}-${n}`;
    }
    slug = candidate;
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      name,
      company,
      phone,
      email_public,
      website,
      bio,
      slug,
      social_links,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export async function uploadProfilePhoto(formData: FormData): Promise<{ ok: boolean; url?: string; error?: string }> {
  const { userId } = await requireBroker();
  const file = formData.get("file") as File | null;
  if (!file?.size) return { ok: false, error: "No file provided." };
  if (file.size > MAX_SIZE) return { ok: false, error: "File must be under 5MB." };
  if (!ALLOWED_TYPES.includes(file.type)) return { ok: false, error: "Only JPEG, PNG, WebP and GIF are allowed." };

  const supabase = createServiceRoleClient();
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${userId}/avatar.${ext}`;

  const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, {
    upsert: true,
    contentType: file.type,
  });
  if (uploadError) return { ok: false, error: uploadError.message };

  const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
  const url = urlData.publicUrl;

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ photo_url: url, updated_at: new Date().toISOString() })
    .eq("id", userId);
  if (updateError) return { ok: false, error: updateError.message, url };

  return { ok: true, url };
}

export async function uploadProfileLogo(formData: FormData): Promise<{ ok: boolean; url?: string; error?: string }> {
  const { userId } = await requireBroker();
  const file = formData.get("file") as File | null;
  if (!file?.size) return { ok: false, error: "No file provided." };
  if (file.size > MAX_SIZE) return { ok: false, error: "File must be under 5MB." };
  const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"];
  if (!allowed.includes(file.type)) return { ok: false, error: "Only JPEG, PNG, WebP, GIF and SVG are allowed." };

  const supabase = createServiceRoleClient();
  const ext = file.name.split(".").pop() || "png";
  const path = `${userId}/logo.${ext}`;

  const { error: uploadError } = await supabase.storage.from("logos").upload(path, file, {
    upsert: true,
    contentType: file.type,
  });
  if (uploadError) return { ok: false, error: uploadError.message };

  const { data: urlData } = supabase.storage.from("logos").getPublicUrl(path);
  const url = urlData.publicUrl;

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ logo_url: url, updated_at: new Date().toISOString() })
    .eq("id", userId);
  if (updateError) return { ok: false, error: updateError.message, url };

  return { ok: true, url };
}
