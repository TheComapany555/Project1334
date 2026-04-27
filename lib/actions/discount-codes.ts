"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { resolveProductPrice } from "@/lib/actions/products";
import type {
  DiscountCode,
  DiscountValidationResult,
} from "@/lib/types/discount-codes";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "admin") {
    throw new Error("Unauthorized");
  }
  return { userId: session.user.id };
}

function normalizeCode(raw: string): string {
  return raw.trim().toUpperCase();
}

// ── Admin CRUD ───────────────────────────────────────────────────────────────

export async function listDiscountCodes(): Promise<DiscountCode[]> {
  await requireAdmin();
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("discount_codes")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return [];
  return (data ?? []) as DiscountCode[];
}

export async function getDiscountCodeById(
  id: string
): Promise<DiscountCode | null> {
  await requireAdmin();
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("discount_codes")
    .select("*")
    .eq("id", id)
    .single();
  if (error || !data) return null;
  return data as DiscountCode;
}

export type DiscountCodeInput = {
  code: string;
  description?: string | null;
  percent_off: number;
  max_uses?: number | null;
  valid_until?: string | null;
  active?: boolean;
};

export async function createDiscountCode(
  form: DiscountCodeInput
): Promise<{ ok: boolean; id?: string; error?: string }> {
  const { userId } = await requireAdmin();
  const supabase = createServiceRoleClient();

  const code = normalizeCode(form.code);
  if (!/^[A-Z0-9_-]{2,32}$/.test(code)) {
    return {
      ok: false,
      error: "Code must be 2-32 chars, letters/digits/underscore/dash only.",
    };
  }
  if (
    !Number.isInteger(form.percent_off) ||
    form.percent_off < 1 ||
    form.percent_off > 100
  ) {
    return { ok: false, error: "Percent off must be between 1 and 100." };
  }
  if (
    form.max_uses != null &&
    (!Number.isInteger(form.max_uses) || form.max_uses < 1)
  ) {
    return { ok: false, error: "Max uses must be a positive integer or empty." };
  }

  const { data, error } = await supabase
    .from("discount_codes")
    .insert({
      code,
      description: form.description?.trim() || null,
      percent_off: form.percent_off,
      max_uses: form.max_uses ?? null,
      valid_until: form.valid_until ?? null,
      active: form.active ?? true,
      created_by: userId,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "A code with this name already exists." };
    }
    return { ok: false, error: error.message };
  }
  return { ok: true, id: data.id };
}

export async function updateDiscountCode(
  id: string,
  form: Partial<DiscountCodeInput>
): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const supabase = createServiceRoleClient();

  // Read current row so we can detect percent_off changes (Stripe coupons are
  // immutable, so if the percent changes we must clear the cached Stripe ID
  // so the next redemption mints a fresh coupon).
  const { data: existing } = await supabase
    .from("discount_codes")
    .select("percent_off")
    .eq("id", id)
    .single();

  const payload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (form.code !== undefined) {
    const code = normalizeCode(form.code);
    if (!/^[A-Z0-9_-]{2,32}$/.test(code)) {
      return {
        ok: false,
        error: "Code must be 2-32 chars, letters/digits/underscore/dash only.",
      };
    }
    payload.code = code;
  }
  if (form.description !== undefined)
    payload.description = form.description?.trim() || null;
  if (form.percent_off !== undefined) {
    if (
      !Number.isInteger(form.percent_off) ||
      form.percent_off < 1 ||
      form.percent_off > 100
    ) {
      return { ok: false, error: "Percent off must be between 1 and 100." };
    }
    payload.percent_off = form.percent_off;
    if (existing && existing.percent_off !== form.percent_off) {
      payload.stripe_coupon_id = null;
    }
  }
  if (form.max_uses !== undefined) {
    if (
      form.max_uses != null &&
      (!Number.isInteger(form.max_uses) || form.max_uses < 1)
    ) {
      return { ok: false, error: "Max uses must be a positive integer or empty." };
    }
    payload.max_uses = form.max_uses;
  }
  if (form.valid_until !== undefined) payload.valid_until = form.valid_until;
  if (form.active !== undefined) payload.active = form.active;

  const { error } = await supabase
    .from("discount_codes")
    .update(payload)
    .eq("id", id);

  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "A code with this name already exists." };
    }
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

export async function toggleDiscountCodeActive(
  id: string
): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const supabase = createServiceRoleClient();
  const { data: row } = await supabase
    .from("discount_codes")
    .select("active")
    .eq("id", id)
    .single();
  if (!row) return { ok: false, error: "Code not found" };

  const { error } = await supabase
    .from("discount_codes")
    .update({ active: !row.active, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function deleteDiscountCode(
  id: string
): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const supabase = createServiceRoleClient();
  const { error } = await supabase.from("discount_codes").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// ── Validation (used at checkout) ────────────────────────────────────────────

/**
 * Validate a discount code against a given product (and the current user's
 * agency-resolved price). Returns the original / discount / final amounts and
 * a `is_free` flag the checkout can use to short-circuit Stripe.
 */
export async function validateDiscountCode(params: {
  code: string;
  productId: string;
  agencyId: string | null;
}): Promise<DiscountValidationResult> {
  const supabase = createServiceRoleClient();
  const code = normalizeCode(params.code);
  if (!code) return { ok: false, error: "Enter a code." };

  const { data: row } = await supabase
    .from("discount_codes")
    .select("*")
    .eq("code", code)
    .single();

  if (!row) return { ok: false, error: "Invalid code." };
  if (!row.active) return { ok: false, error: "This code is no longer active." };

  const now = new Date();
  if (row.valid_from && new Date(row.valid_from) > now) {
    return { ok: false, error: "This code is not yet valid." };
  }
  if (row.valid_until && new Date(row.valid_until) < now) {
    return { ok: false, error: "This code has expired." };
  }
  if (row.max_uses != null && row.used_count >= row.max_uses) {
    return { ok: false, error: "This code has reached its usage limit." };
  }

  const resolved = await resolveProductPrice(params.productId, params.agencyId);
  if (!resolved) return { ok: false, error: "Product not found." };

  const original = resolved.price;
  // Round so 33% of $9.99 doesn't leave fractional cents.
  const discount = Math.min(
    original,
    Math.round((original * row.percent_off) / 100)
  );
  const final = original - discount;

  return {
    ok: true,
    code: { id: row.id, code: row.code, percent_off: row.percent_off },
    original_amount: original,
    discount_amount: discount,
    final_amount: final,
    currency: resolved.currency,
    is_free: final <= 0,
  };
}

/**
 * Atomically increment used_count. Called from the API after a payment is
 * successfully recorded (free flow) or PaymentIntent created (paid flow).
 *
 * Note: this is best-effort. A race could let used_count exceed max_uses by
 * a small margin. For onboarding promos that's acceptable; tighten later via
 * a Postgres function if needed.
 */
export async function incrementDiscountCodeUsage(
  discountCodeId: string
): Promise<void> {
  const supabase = createServiceRoleClient();
  const { data: row } = await supabase
    .from("discount_codes")
    .select("used_count")
    .eq("id", discountCodeId)
    .single();
  if (!row) return;
  await supabase
    .from("discount_codes")
    .update({
      used_count: (row.used_count ?? 0) + 1,
      updated_at: new Date().toISOString(),
    })
    .eq("id", discountCodeId);
}
