"use server";

import { createServiceRoleClient } from "@/lib/supabase/admin";
import { generateSlugFromName } from "@/lib/slug";

async function requireAdmin() {
  const { getServerSession } = await import("next-auth");
  const { authOptions } = await import("@/lib/auth");
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "admin") {
    throw new Error("Unauthorized");
  }
}

export type CategoryForAdmin = {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  sort_order: number;
};

export async function getCategoriesForAdmin(): Promise<CategoryForAdmin[]> {
  await requireAdmin();
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, slug, active, sort_order")
    .order("sort_order");
  if (error) return [];
  return (data ?? []) as CategoryForAdmin[];
}

export async function createCategory(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const name = (formData.get("name") as string)?.trim();
  if (!name) return { ok: false, error: "Name is required." };
  const slug = (formData.get("slug") as string)?.trim() || generateSlugFromName(name);
  const sort_order = parseInt((formData.get("sort_order") as string) ?? "0", 10) || 0;
  const supabase = createServiceRoleClient();
  const { data: existing } = await supabase.from("categories").select("id").eq("slug", slug).single();
  if (existing) return { ok: false, error: "A category with this slug already exists." };
  const { error } = await supabase.from("categories").insert({ name, slug, active: true, sort_order });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function updateCategory(
  id: string,
  updates: { name?: string; slug?: string; active?: boolean; sort_order?: number }
): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const supabase = createServiceRoleClient();
  if (updates.slug != null) {
    const { data: existing } = await supabase
      .from("categories")
      .select("id")
      .eq("slug", updates.slug)
      .neq("id", id)
      .single();
    if (existing) return { ok: false, error: "Slug already in use." };
  }
  const payload: Record<string, unknown> = {};
  if (updates.name !== undefined) payload.name = updates.name.trim();
  if (updates.slug !== undefined) payload.slug = updates.slug.trim();
  if (updates.active !== undefined) payload.active = updates.active;
  if (updates.sort_order !== undefined) payload.sort_order = updates.sort_order;
  if (Object.keys(payload).length === 0) return { ok: true };
  const { error } = await supabase.from("categories").update(payload).eq("id", id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
