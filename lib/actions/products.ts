"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import type { FeaturedScope, Product } from "@/lib/types/products";
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

export type AdminProductRow = Product & {
  category?: { id: string; name: string } | null;
};

export type ListAdminProductsParams = {
  page?: number;
  pageSize?: number;
  q?: string | null;
  status?: string | null;
  productType?: string | null;
};

export async function listAdminProducts(
  params: ListAdminProductsParams = {},
): Promise<Paginated<AdminProductRow>> {
  await requireAdmin();
  const supabase = createServiceRoleClient();
  const { page, pageSize, offset } = normalizePagination(params);

  let q = supabase
    .from("products")
    .select("*, category:categories(id, name)", { count: "exact" });

  if (params.status?.trim()) q = q.eq("status", params.status.trim());
  if (params.productType?.trim())
    q = q.eq("product_type", params.productType.trim());
  if (params.q?.trim()) {
    const k = params.q.trim().replace(/%/g, "\\%").replace(/_/g, "\\_");
    q = q.ilike("name", `%${k}%`);
  }
  q = q.order("created_at", { ascending: false });

  const { data, error, count } = await q.range(offset, offset + pageSize - 1);
  if (error) return buildPaginated<AdminProductRow>([], 0, page, pageSize);

  const rows = (data ?? []).map((p) => {
    const cat = Array.isArray((p as { category?: unknown }).category)
      ? ((p as { category: { id: string; name: string }[] }).category[0] ?? null)
      : ((p as { category: { id: string; name: string } | null }).category ?? null);
    return { ...(p as Product), category: cat };
  });
  return buildPaginated(rows, count ?? 0, page, pageSize);
}

/** @deprecated Use `listAdminProducts`. */
export async function getAllProducts(): Promise<AdminProductRow[]> {
  const { rows } = await listAdminProducts({ page: 1, pageSize: 200 });
  return rows;
}

/** Get active products. Optionally filter by product_type.
 *  Automatically applies agency pricing overrides for the current user's agency. */
export async function getActiveProducts(
  productType?: string
): Promise<Product[]> {
  const supabase = createServiceRoleClient();
  let query = supabase
    .from("products")
    .select("*")
    .eq("status", "active")
    .order("price", { ascending: true });
  if (productType) {
    query = query.eq("product_type", productType);
  }
  const { data, error } = await query;
  if (error) return [];
  const products = (data ?? []) as Product[];

  // Try to get the current user's agency for pricing overrides
  let agencyId: string | null = null;
  try {
    const session = await getServerSession(authOptions);
    agencyId = (session?.user as { agencyId?: string })?.agencyId ?? null;
  } catch {
    // Not in an authenticated context — use default prices
  }

  if (agencyId) {
    const { data: overrides } = await supabase
      .from("agency_pricing_overrides")
      .select("product_id, custom_price, currency")
      .eq("agency_id", agencyId);

    if (overrides && overrides.length > 0) {
      const overrideMap = new Map(
        overrides.map((o) => [o.product_id, o])
      );
      return products.map((p) => {
        const override = overrideMap.get(p.id);
        if (override) {
          return {
            ...p,
            price: override.custom_price,
            currency: override.currency ?? p.currency,
          };
        }
        return p;
      });
    }
  }

  return products;
}

/** Resolve the actual price for a product + agency (checks custom pricing). */
export async function resolveProductPrice(
  productId: string,
  agencyId: string | null
): Promise<{ price: number; currency: string } | null> {
  const supabase = createServiceRoleClient();

  const { data: product } = await supabase
    .from("products")
    .select("price, currency")
    .eq("id", productId)
    .single();
  if (!product) return null;

  if (agencyId) {
    const { data: override } = await supabase
      .from("agency_pricing_overrides")
      .select("custom_price, currency")
      .eq("agency_id", agencyId)
      .eq("product_id", productId)
      .single();
    if (override) {
      return { price: override.custom_price, currency: override.currency ?? product.currency };
    }
  }

  return { price: product.price, currency: product.currency };
}

/** Get a single product by ID. */
export async function getProductById(id: string): Promise<Product | null> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .single();
  if (error || !data) return null;
  return data as Product;
}

/** Create a new product. */
export async function createProduct(form: {
  name: string;
  description: string | null;
  price: number;
  currency: string;
  duration_days: number | null;
  product_type?: string;
  category_id?: string | null;
  scope?: FeaturedScope | null;
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  await requireAdmin();
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from("products")
    .insert({
      name: form.name.trim(),
      description: form.description?.trim() || null,
      price: form.price,
      currency: form.currency || "aud",
      duration_days: form.duration_days,
      product_type: form.product_type || "featured",
      category_id: form.category_id ?? null,
      scope: form.scope ?? null,
      status: "active",
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };
  return { ok: true, id: data.id };
}

/** Update a product. */
export async function updateProduct(
  id: string,
  form: {
    name?: string;
    description?: string | null;
    price?: number;
    currency?: string;
    duration_days?: number | null;
    product_type?: string;
    category_id?: string | null;
    scope?: FeaturedScope | null;
  }
): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const supabase = createServiceRoleClient();

  const payload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (form.name !== undefined) payload.name = form.name.trim();
  if (form.description !== undefined)
    payload.description = form.description?.trim() || null;
  if (form.price !== undefined) payload.price = form.price;
  if (form.currency !== undefined) payload.currency = form.currency;
  if (form.duration_days !== undefined)
    payload.duration_days = form.duration_days;
  if (form.product_type !== undefined)
    payload.product_type = form.product_type;
  if (form.category_id !== undefined) payload.category_id = form.category_id;
  if (form.scope !== undefined) payload.scope = form.scope;

  const { error } = await supabase
    .from("products")
    .update(payload)
    .eq("id", id);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/**
 * Get featured product variants applicable to a listing.
 * Returns the broker self-serve options, grouped by scope:
 * - homepage: products with scope='homepage' and category_id IS NULL
 * - category: products scoped to the listing's category (scope='category')
 * - both: products with scope='both' (homepage + category bundle)
 *
 * Falls back gracefully: if no per-category product exists for the listing's
 * category, the homepage prices act as the implicit baseline (broker only sees
 * the homepage option in that case).
 */
export async function getFeaturedOptionsForListing(
  listingCategoryId: string | null
): Promise<{
  homepage: Product[];
  category: Product[];
  both: Product[];
}> {
  const supabase = createServiceRoleClient();

  const { data } = await supabase
    .from("products")
    .select("*")
    .eq("status", "active")
    .eq("product_type", "featured")
    .order("duration_days", { ascending: true });

  const all = (data ?? []) as Product[];

  return {
    homepage: all.filter(
      (p) => (p.scope === "homepage" || p.scope === null) && !p.category_id
    ),
    category: listingCategoryId
      ? all.filter(
          (p) => p.scope === "category" && p.category_id === listingCategoryId
        )
      : [],
    both: all.filter(
      (p) =>
        p.scope === "both" &&
        (!p.category_id || p.category_id === listingCategoryId)
    ),
  };
}

/** Toggle product status (active ↔ inactive). */
export async function toggleProductStatus(
  id: string
): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const supabase = createServiceRoleClient();

  const { data: product } = await supabase
    .from("products")
    .select("status")
    .eq("id", id)
    .single();

  if (!product) return { ok: false, error: "Product not found" };

  const newStatus = product.status === "active" ? "inactive" : "active";
  const { error } = await supabase
    .from("products")
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
