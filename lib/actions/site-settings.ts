"use server";

import { revalidatePath } from "next/cache";
import { createServiceRoleClient } from "@/lib/supabase/admin";

async function requireAdmin() {
  const { getServerSession } = await import("next-auth");
  const { authOptions } = await import("@/lib/auth");
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "admin") {
    throw new Error("Unauthorized");
  }
}

/**
 * True when "listings coming soon" mode is on: every public/buyer-facing
 * listing surface renders a Coming Soon card instead of real listings.
 * Fails open (false) if the site_settings migration hasn't been applied yet,
 * so deploying ahead of the migration can't break the site.
 */
export async function getListingsComingSoon(): Promise<boolean> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("site_settings")
    .select("listings_coming_soon")
    .eq("id", true)
    .maybeSingle();
  if (error || !data) return false;
  return data.listings_coming_soon === true;
}

/** Admin-only read used by /admin/settings (includes last-changed time). */
export async function getListingsComingSoonDetails(): Promise<{
  enabled: boolean;
  updatedAt: string | null;
}> {
  await requireAdmin();
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("site_settings")
    .select("listings_coming_soon, updated_at")
    .eq("id", true)
    .maybeSingle();
  return {
    enabled: data?.listings_coming_soon === true,
    updatedAt: data?.updated_at ?? null,
  };
}

export async function setListingsComingSoon(
  enabled: boolean,
): Promise<
  { ok: true; updatedAt: string | null } | { ok: false; error: string }
> {
  await requireAdmin();
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("site_settings")
    .upsert({ id: true, listings_coming_soon: enabled }, { onConflict: "id" })
    .select("updated_at")
    .single();
  if (error) {
    return {
      ok: false,
      error:
        "Could not save the setting — check that the site_settings migration has been applied.",
    };
  }
  // Public listing pages are ISR-cached — bust them so the flip is instant.
  revalidatePath("/", "layout");
  revalidatePath("/sitemap.xml");
  return { ok: true, updatedAt: data?.updated_at ?? null };
}
