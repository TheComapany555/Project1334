"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import type { AgencyPricingOverride } from "@/lib/types/agency-pricing";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "admin") {
    throw new Error("Unauthorized");
  }
}

/** Get all pricing overrides for a specific agency. */
export async function getAgencyPricingOverrides(
  agencyId: string
): Promise<AgencyPricingOverride[]> {
  await requireAdmin();
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("agency_pricing_overrides")
    .select(`
      *,
      product:products(id, name, price, currency, product_type)
    `)
    .eq("agency_id", agencyId)
    .order("created_at", { ascending: false });
  if (error) return [];
  return (data ?? []) as AgencyPricingOverride[];
}

/** Set or update a pricing override for an agency + product. */
export async function upsertAgencyPricing(form: {
  agency_id: string;
  product_id: string;
  custom_price: number; // in cents
  currency?: string;
  notes?: string | null;
}): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const supabase = createServiceRoleClient();

  if (form.custom_price < 0) {
    return { ok: false, error: "Price cannot be negative." };
  }

  const { error } = await supabase
    .from("agency_pricing_overrides")
    .upsert(
      {
        agency_id: form.agency_id,
        product_id: form.product_id,
        custom_price: form.custom_price,
        currency: form.currency ?? "aud",
        notes: form.notes?.trim() || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "agency_id,product_id" }
    );

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** Remove a pricing override (revert to default price). */
export async function deleteAgencyPricing(
  overrideId: string
): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const supabase = createServiceRoleClient();
  const { error } = await supabase
    .from("agency_pricing_overrides")
    .delete()
    .eq("id", overrideId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** Remove all pricing overrides for an agency. */
export async function deleteAllAgencyPricing(
  agencyId: string
): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const supabase = createServiceRoleClient();
  const { error } = await supabase
    .from("agency_pricing_overrides")
    .delete()
    .eq("agency_id", agencyId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
