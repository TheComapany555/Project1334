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

export type AdminStats = {
  brokersActive: number;
  brokersPending: number;
  brokersDisabled: number;
  listingsPublished: number;
  listingsDraft: number;
  listingsRemoved: number;
  enquiriesTotal: number;
  enquiriesLast7Days: number;
  categoriesActive: number;
};

export async function getAdminStats(): Promise<AdminStats> {
  await requireAdmin();
  const supabase = createServiceRoleClient();

  const [
    { count: brokersActive },
    { count: brokersPending },
    { count: brokersDisabled },
    { count: listingsPublished },
    { count: listingsDraft },
    { count: listingsRemoved },
    { count: enquiriesTotal },
    { count: enquiriesLast7Days },
    { count: categoriesActive },
  ] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "broker").eq("status", "active"),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "broker").eq("status", "pending"),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "broker").eq("status", "disabled"),
    supabase.from("listings").select("id", { count: "exact", head: true }).eq("status", "published").is("admin_removed_at", null),
    supabase.from("listings").select("id", { count: "exact", head: true }).eq("status", "draft"),
    supabase.from("listings").select("id", { count: "exact", head: true }).not("admin_removed_at", "is", null),
    supabase.from("enquiries").select("id", { count: "exact", head: true }),
    supabase.from("enquiries").select("id", { count: "exact", head: true }).gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
    supabase.from("categories").select("id", { count: "exact", head: true }).eq("active", true),
  ]);

  return {
    brokersActive: brokersActive ?? 0,
    brokersPending: brokersPending ?? 0,
    brokersDisabled: brokersDisabled ?? 0,
    listingsPublished: listingsPublished ?? 0,
    listingsDraft: listingsDraft ?? 0,
    listingsRemoved: listingsRemoved ?? 0,
    enquiriesTotal: enquiriesTotal ?? 0,
    enquiriesLast7Days: enquiriesLast7Days ?? 0,
    categoriesActive: categoriesActive ?? 0,
  };
}
