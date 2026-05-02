"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import type { BuyerAlertPreference } from "@/lib/types/buyer-panel";

export type BuyerAlertPreferenceInput = {
  label?: string | null;
  business_type?: string | null;
  category_id?: string | null;
  state?: string | null;
  suburb?: string | null;
  min_price?: number | null;
  max_price?: number | null;
  is_active?: boolean;
};

const MAX_ACTIVE_PREFERENCES_PER_USER = 10;

async function requireBuyer() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");
  if (session.user.role !== "user") throw new Error("Forbidden");
  return { userId: session.user.id };
}

function sanitizeText(value: string | null | undefined, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

function sanitizePrice(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n);
}

function validateInput(
  input: BuyerAlertPreferenceInput,
): { ok: true; payload: Record<string, unknown> } | { ok: false; error: string } {
  const label = sanitizeText(input.label, 80);
  const business_type = sanitizeText(input.business_type, 80);
  const state = sanitizeText(input.state, 8);
  const suburb = sanitizeText(input.suburb, 80);
  const category_id = sanitizeText(input.category_id, 64);
  const min_price = sanitizePrice(input.min_price);
  const max_price = sanitizePrice(input.max_price);

  if (
    !business_type &&
    !category_id &&
    !state &&
    !suburb &&
    min_price === null &&
    max_price === null
  ) {
    return {
      ok: false,
      error: "Add at least one filter (business type, category, location, or price).",
    };
  }
  if (min_price !== null && max_price !== null && min_price > max_price) {
    return { ok: false, error: "Minimum price must be less than or equal to maximum price." };
  }

  return {
    ok: true,
    payload: {
      label,
      business_type,
      category_id,
      state,
      suburb,
      min_price,
      max_price,
      is_active: input.is_active ?? true,
    },
  };
}

function shapeRow(
  row: Record<string, unknown>,
  categoryName: string | null,
): BuyerAlertPreference {
  return {
    id: row.id as string,
    user_id: row.user_id as string,
    label: (row.label as string | null) ?? null,
    business_type: (row.business_type as string | null) ?? null,
    category_id: (row.category_id as string | null) ?? null,
    category_name: categoryName,
    state: (row.state as string | null) ?? null,
    suburb: (row.suburb as string | null) ?? null,
    min_price: (row.min_price as number | null) ?? null,
    max_price: (row.max_price as number | null) ?? null,
    is_active: !!row.is_active,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

async function fetchCategoryName(
  supabase: ReturnType<typeof createServiceRoleClient>,
  categoryId: string | null,
): Promise<string | null> {
  if (!categoryId) return null;
  const { data } = await supabase
    .from("categories")
    .select("name")
    .eq("id", categoryId)
    .maybeSingle();
  return (data?.name as string | null) ?? null;
}

export type AlertPreferenceResult =
  | { ok: true; preference: BuyerAlertPreference }
  | { ok: false; error: string };

export async function createAlertPreference(
  input: BuyerAlertPreferenceInput,
): Promise<AlertPreferenceResult> {
  const { userId } = await requireBuyer();
  const validated = validateInput(input);
  if (!validated.ok) return validated;

  const supabase = createServiceRoleClient();
  const { count } = await supabase
    .from("buyer_alert_preferences")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  if ((count ?? 0) >= MAX_ACTIVE_PREFERENCES_PER_USER) {
    return {
      ok: false,
      error: `You can save up to ${MAX_ACTIVE_PREFERENCES_PER_USER} alert preferences. Delete one to add another.`,
    };
  }

  const { data, error } = await supabase
    .from("buyer_alert_preferences")
    .insert({ ...validated.payload, user_id: userId })
    .select(
      "id, user_id, label, business_type, category_id, state, suburb, min_price, max_price, is_active, created_at, updated_at",
    )
    .single();

  if (error || !data) {
    return { ok: false, error: error?.message ?? "Could not save preference." };
  }

  const categoryName = await fetchCategoryName(
    supabase,
    (data.category_id as string | null) ?? null,
  );
  revalidatePath("/account");
  return { ok: true, preference: shapeRow(data as Record<string, unknown>, categoryName) };
}

export async function updateAlertPreference(
  id: string,
  input: BuyerAlertPreferenceInput,
): Promise<AlertPreferenceResult> {
  const { userId } = await requireBuyer();
  if (!id) return { ok: false, error: "Missing preference id." };
  const validated = validateInput(input);
  if (!validated.ok) return validated;

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("buyer_alert_preferences")
    .update({ ...validated.payload, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", userId)
    .select(
      "id, user_id, label, business_type, category_id, state, suburb, min_price, max_price, is_active, created_at, updated_at",
    )
    .single();

  if (error || !data) {
    return { ok: false, error: error?.message ?? "Could not update preference." };
  }

  const categoryName = await fetchCategoryName(
    supabase,
    (data.category_id as string | null) ?? null,
  );
  revalidatePath("/account");
  return { ok: true, preference: shapeRow(data as Record<string, unknown>, categoryName) };
}

export async function toggleAlertPreference(
  id: string,
  isActive: boolean,
): Promise<{ ok: boolean; error?: string }> {
  const { userId } = await requireBuyer();
  if (!id) return { ok: false, error: "Missing preference id." };

  const supabase = createServiceRoleClient();
  const { error } = await supabase
    .from("buyer_alert_preferences")
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", userId);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/account");
  return { ok: true };
}

export async function deleteAlertPreference(
  id: string,
): Promise<{ ok: boolean; error?: string }> {
  const { userId } = await requireBuyer();
  if (!id) return { ok: false, error: "Missing preference id." };

  const supabase = createServiceRoleClient();
  const { error } = await supabase
    .from("buyer_alert_preferences")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/account");
  return { ok: true };
}
