"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import type { Advertisement } from "@/lib/types/advertising";
import {
  buildPaginated,
  normalizePagination,
  type Paginated,
} from "@/lib/types/pagination";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "admin") {
    throw new Error("Unauthorized");
  }
  return { userId: session.user.id };
}

const AD_IMAGES_BUCKET = "ad-images";
const MAX_AD_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_AD_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

/** Upload an ad image to storage and return the public URL. */
export async function uploadAdImage(
  formData: FormData
): Promise<{ ok: boolean; url?: string; error?: string }> {
  await requireAdmin();
  const supabase = createServiceRoleClient();

  const file = formData.get("file") as File | null;
  if (!file?.size) return { ok: false, error: "No file provided." };
  if (file.size > MAX_AD_IMAGE_SIZE)
    return { ok: false, error: "Image must be under 5 MB." };
  if (!ALLOWED_AD_IMAGE_TYPES.includes(file.type))
    return { ok: false, error: "Only JPEG, PNG, WebP and GIF are allowed." };

  const ext = file.name.split(".").pop() || "jpg";
  const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(AD_IMAGES_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (uploadError) return { ok: false, error: uploadError.message };

  const { data: urlData } = supabase.storage
    .from(AD_IMAGES_BUCKET)
    .getPublicUrl(path);

  return { ok: true, url: urlData.publicUrl };
}

export type ListAdminAdsParams = {
  page?: number;
  pageSize?: number;
  q?: string | null;
  status?: string | null;
  placement?: string | null;
};

export async function listAdminAds(
  params: ListAdminAdsParams = {},
): Promise<Paginated<Advertisement>> {
  await requireAdmin();
  const supabase = createServiceRoleClient();
  const { page, pageSize, offset } = normalizePagination(params);

  let q = supabase
    .from("advertisements")
    .select("*", { count: "exact" });

  if (params.status?.trim()) q = q.eq("status", params.status.trim());
  if (params.placement?.trim()) q = q.eq("placement", params.placement.trim());
  if (params.q?.trim()) {
    const k = params.q.trim().replace(/%/g, "\\%").replace(/_/g, "\\_");
    q = q.ilike("title", `%${k}%`);
  }
  q = q.order("sort_order").order("created_at", { ascending: false });

  const { data, error, count } = await q.range(offset, offset + pageSize - 1);
  if (error) return buildPaginated<Advertisement>([], 0, page, pageSize);
  return buildPaginated((data ?? []) as Advertisement[], count ?? 0, page, pageSize);
}

/** @deprecated Use `listAdminAds`. */
export async function getAllAdsForAdmin(): Promise<Advertisement[]> {
  const { rows } = await listAdminAds({ page: 1, pageSize: 200 });
  return rows;
}

/** Get a single ad by ID (admin). */
export async function getAdById(id: string): Promise<Advertisement | null> {
  await requireAdmin();
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("advertisements")
    .select("*")
    .eq("id", id)
    .single();
  if (error || !data) return null;
  return data as Advertisement;
}

/** Create a new ad. */
export async function createAd(form: {
  title: string;
  description: string | null;
  image_url: string | null;
  html_content: string | null;
  link_url: string | null;
  placement: string;
  start_date: string;
  end_date: string | null;
  sort_order: number;
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  await requireAdmin();
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from("advertisements")
    .insert({
      title: form.title.trim(),
      description: form.description?.trim() || null,
      image_url: form.image_url?.trim() || null,
      html_content: form.html_content?.trim() || null,
      link_url: form.link_url?.trim() || null,
      placement: form.placement,
      status: "active",
      start_date: form.start_date,
      end_date: form.end_date || null,
      sort_order: form.sort_order,
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };
  return { ok: true, id: data.id };
}

/** Update an existing ad. */
export async function updateAd(
  id: string,
  form: {
    title?: string;
    description?: string | null;
    image_url?: string | null;
    html_content?: string | null;
    link_url?: string | null;
    placement?: string;
    start_date?: string;
    end_date?: string | null;
    sort_order?: number;
  }
): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const supabase = createServiceRoleClient();

  const payload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (form.title !== undefined) payload.title = form.title.trim();
  if (form.description !== undefined)
    payload.description = form.description?.trim() || null;
  if (form.image_url !== undefined)
    payload.image_url = form.image_url?.trim() || null;
  if (form.html_content !== undefined)
    payload.html_content = form.html_content?.trim() || null;
  if (form.link_url !== undefined)
    payload.link_url = form.link_url?.trim() || null;
  if (form.placement !== undefined) payload.placement = form.placement;
  if (form.start_date !== undefined) payload.start_date = form.start_date;
  if (form.end_date !== undefined) payload.end_date = form.end_date || null;
  if (form.sort_order !== undefined) payload.sort_order = form.sort_order;

  const { error } = await supabase
    .from("advertisements")
    .update(payload)
    .eq("id", id);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** Toggle ad status (active ↔ inactive). */
export async function toggleAdStatus(
  id: string
): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const supabase = createServiceRoleClient();

  const { data: ad } = await supabase
    .from("advertisements")
    .select("status")
    .eq("id", id)
    .single();

  if (!ad) return { ok: false, error: "Ad not found" };

  const newStatus = ad.status === "active" ? "inactive" : "active";
  const { error } = await supabase
    .from("advertisements")
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** Delete an ad permanently. */
export async function deleteAd(
  id: string
): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const supabase = createServiceRoleClient();
  const { error } = await supabase
    .from("advertisements")
    .delete()
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
