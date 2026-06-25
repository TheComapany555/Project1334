/**
 * Shared category / sub-category resolution for listing importers.
 *
 * Extracted from the REAXML importer so every listing-source integration
 * (REAXML, Agentbox, …) resolves category/sub-category NAMES → ids the same way.
 * Pure DB reads — no writes.
 */

import type { createServiceRoleClient } from "@/lib/supabase/admin";

type SupabaseAdmin = ReturnType<typeof createServiceRoleClient>;

export type TaxonomyMaps = {
  categoryByName: Map<string, string>;
  /** keyed by `${categoryId}::${lowercased subcategory name}` */
  subByCatAndName: Map<string, string>;
};

export async function resolveTaxonomy(supabase: SupabaseAdmin): Promise<TaxonomyMaps> {
  const categoryByName = new Map<string, string>();
  const subByCatAndName = new Map<string, string>();

  const { data: cats } = await supabase
    .from("categories")
    .select("id, name, slug")
    .eq("active", true);
  for (const c of cats ?? []) {
    if (c.name) categoryByName.set(String(c.name).trim().toLowerCase(), c.id);
    if (c.slug) categoryByName.set(String(c.slug).trim().toLowerCase(), c.id);
  }

  const { data: subs } = await supabase
    .from("subcategories")
    .select("id, category_id, name")
    .eq("active", true);
  for (const s of subs ?? []) {
    if (s.name) {
      subByCatAndName.set(`${s.category_id}::${String(s.name).trim().toLowerCase()}`, s.id);
    }
  }
  return { categoryByName, subByCatAndName };
}

export function resolveIds(
  l: { categoryName: string | null; subcategoryName: string | null },
  maps: TaxonomyMaps,
): { categoryId: string | null; subcategoryId: string | null } {
  const categoryId = l.categoryName
    ? maps.categoryByName.get(l.categoryName.trim().toLowerCase()) ?? null
    : null;
  const subcategoryId =
    categoryId && l.subcategoryName
      ? maps.subByCatAndName.get(`${categoryId}::${l.subcategoryName.trim().toLowerCase()}`) ?? null
      : null;
  return { categoryId, subcategoryId };
}
