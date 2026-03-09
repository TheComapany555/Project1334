"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import type { Product } from "@/lib/types/products";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "admin") {
    throw new Error("Unauthorized");
  }
  return { userId: session.user.id };
}

/** Get all products (admin). */
export async function getAllProducts(): Promise<Product[]> {
  await requireAdmin();
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return [];
  return (data ?? []) as Product[];
}

/** Get active products (public — for upgrade modal). */
export async function getActiveProducts(): Promise<Product[]> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("status", "active")
    .order("price", { ascending: true });
  if (error) return [];
  return (data ?? []) as Product[];
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

  const { error } = await supabase
    .from("products")
    .update(payload)
    .eq("id", id);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
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
