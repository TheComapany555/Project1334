"use server";

import { createServiceRoleClient } from "@/lib/supabase/admin";

async function requireAdmin() {
  const { getServerSession } = await import("next-auth");
  const { authOptions } = await import("@/lib/auth");
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "admin") {
    throw new Error("Unauthorized");
  }
}

export type ListingForAdmin = {
  id: string;
  slug: string;
  title: string;
  status: string;
  admin_removed_at: string | null;
  created_at: string;
  broker?: { name: string | null; company: string | null };
};

export async function getAllListingsForAdmin(): Promise<ListingForAdmin[]> {
  await requireAdmin();
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("listings")
    .select(`
      id,
      slug,
      title,
      status,
      admin_removed_at,
      created_at,
      broker:profiles!broker_id(name, company)
    `)
    .order("created_at", { ascending: false });
  if (error) return [];
  const rows = (data ?? []) as (Omit<ListingForAdmin, "broker"> & {
    broker?: { name: string | null; company: string | null }[] | { name: string | null; company: string | null };
  })[];
  return rows.map((r) => ({
    ...r,
    broker: Array.isArray(r.broker) ? r.broker[0] : r.broker,
  }));
}

export async function adminRemoveListing(listingId: string): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const supabase = createServiceRoleClient();
  const { error } = await supabase
    .from("listings")
    .update({ admin_removed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", listingId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function adminRestoreListing(listingId: string): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const supabase = createServiceRoleClient();
  const { error } = await supabase
    .from("listings")
    .update({ admin_removed_at: null, updated_at: new Date().toISOString() })
    .eq("id", listingId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
