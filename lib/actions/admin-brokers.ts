"use server";

import { createServiceRoleClient } from "@/lib/supabase/admin";
import type { AgencyStatus } from "@/lib/types/agencies";

async function requireAdmin() {
  const { getServerSession } = await import("next-auth");
  const { authOptions } = await import("@/lib/auth");
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "admin") {
    throw new Error("Unauthorized");
  }
}

export type AgencyForAdmin = {
  id: string;
  name: string;
  slug: string | null;
  email: string | null;
  status: AgencyStatus;
  broker_count: number;
  listing_count: number;
  owner_name: string | null;
  owner_email: string;
  created_at: string;
};

export type BrokerForAdmin = {
  id: string;
  email: string;
  name: string | null;
  company: string | null;
  agency_name: string | null;
  agency_role: string | null;
  status: string;
  created_at: string;
};

/** Admin: list all agencies with counts. */
export async function getAgenciesForAdmin(): Promise<AgencyForAdmin[]> {
  await requireAdmin();
  const supabase = createServiceRoleClient();

  const { data: agencies, error } = await supabase
    .from("agencies")
    .select("id, name, slug, email, status, created_at")
    .order("created_at", { ascending: false });
  if (error || !agencies?.length) return [];

  const agencyIds = agencies.map((a) => a.id);

  // Count brokers per agency
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, agency_id, agency_role, name")
    .in("agency_id", agencyIds)
    .eq("role", "broker");

  // Count listings per agency
  const { data: listings } = await supabase
    .from("listings")
    .select("id, agency_id")
    .in("agency_id", agencyIds);

  // Get owner emails
  const ownerIds = (profiles ?? [])
    .filter((p) => p.agency_role === "owner")
    .map((p) => p.id);
  const { data: ownerUsers } = await supabase
    .from("users")
    .select("id, email")
    .in("id", ownerIds.length ? ownerIds : ["00000000-0000-0000-0000-000000000000"]);
  const ownerEmailMap = new Map((ownerUsers ?? []).map((u) => [u.id, u.email]));

  return agencies.map((a) => {
    const agencyProfiles = (profiles ?? []).filter((p) => p.agency_id === a.id);
    const owner = agencyProfiles.find((p) => p.agency_role === "owner");
    return {
      id: a.id,
      name: a.name,
      slug: a.slug,
      email: a.email,
      status: a.status as AgencyStatus,
      broker_count: agencyProfiles.length,
      listing_count: (listings ?? []).filter((l) => l.agency_id === a.id).length,
      owner_name: owner?.name ?? null,
      owner_email: owner ? (ownerEmailMap.get(owner.id) ?? "") : "",
      created_at: a.created_at,
    };
  });
}

/** Admin: set agency status (pending -> active, active -> disabled, etc). */
export async function setAgencyStatus(
  agencyId: string,
  status: "active" | "disabled"
): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const supabase = createServiceRoleClient();

  const { data: agency } = await supabase
    .from("agencies")
    .select("id")
    .eq("id", agencyId)
    .single();
  if (!agency) return { ok: false, error: "Agency not found." };

  const { error } = await supabase
    .from("agencies")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", agencyId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** Admin: list all brokers (legacy, still useful for admin views). */
export async function getBrokersForAdmin(): Promise<BrokerForAdmin[]> {
  await requireAdmin();
  const supabase = createServiceRoleClient();
  const { data: profiles, error: pError } = await supabase
    .from("profiles")
    .select("id, name, company, status, agency_id, agency_role, created_at")
    .eq("role", "broker")
    .order("created_at", { ascending: false });
  if (pError || !profiles?.length) return [];

  const ids = profiles.map((p) => p.id);
  const { data: users } = await supabase
    .from("users")
    .select("id, email")
    .in("id", ids);
  const emailMap = new Map((users ?? []).map((u) => [u.id, u.email]));

  // Get agency names
  const agencyIds = [...new Set(profiles.map((p) => p.agency_id).filter(Boolean))];
  const { data: agencies } = agencyIds.length
    ? await supabase.from("agencies").select("id, name").in("id", agencyIds)
    : { data: [] };
  const agencyNameMap = new Map((agencies ?? []).map((a) => [a.id, a.name]));

  return profiles.map((p) => ({
    id: p.id,
    email: emailMap.get(p.id) ?? "",
    name: p.name ?? null,
    company: p.company ?? null,
    agency_name: p.agency_id ? (agencyNameMap.get(p.agency_id) ?? null) : null,
    agency_role: p.agency_role ?? null,
    status: p.status ?? "active",
    created_at: p.created_at,
  }));
}

/** Admin: set individual broker status (legacy). */
export async function setBrokerStatus(
  brokerId: string,
  status: "active" | "disabled"
): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const supabase = createServiceRoleClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", brokerId)
    .single();
  if (!profile || profile.role !== "broker") {
    return { ok: false, error: "Broker not found." };
  }
  const { error } = await supabase
    .from("profiles")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", brokerId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
