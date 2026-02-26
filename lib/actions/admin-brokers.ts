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

export type BrokerForAdmin = {
  id: string;
  email: string;
  name: string | null;
  company: string | null;
  status: string;
  created_at: string;
};

export async function getBrokersForAdmin(): Promise<BrokerForAdmin[]> {
  await requireAdmin();
  const supabase = createServiceRoleClient();
  const { data: profiles, error: pError } = await supabase
    .from("profiles")
    .select("id, name, company, status, created_at")
    .eq("role", "broker")
    .order("created_at", { ascending: false });
  if (pError || !profiles?.length) return [];
  const ids = profiles.map((p) => p.id);
  const { data: users } = await supabase
    .from("users")
    .select("id, email")
    .in("id", ids);
  const emailMap = new Map((users ?? []).map((u) => [u.id, u.email]));
  return profiles.map((p) => ({
    id: p.id,
    email: emailMap.get(p.id) ?? "",
    name: p.name ?? null,
    company: p.company ?? null,
    status: p.status ?? "active",
    created_at: p.created_at,
  }));
}

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
