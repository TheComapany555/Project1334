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

export type AdminUser = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  phone: string | null;
  company: string | null;
  created_at: string;
};

export type AdminEnquiryContact = {
  email: string;
  name: string | null;
  phone: string | null;
  enquiry_count: number;
  last_enquiry_at: string;
};

/** All registered users (profiles + users joined). */
export async function getAdminUsers(): Promise<AdminUser[]> {
  await requireAdmin();
  const supabase = createServiceRoleClient();

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, name, role, phone, company")
    .order("created_at", { ascending: false });

  const profileIds = (profiles ?? []).map((p) => p.id);
  if (profileIds.length === 0) return [];

  const { data: users } = await supabase
    .from("users")
    .select("id, email, created_at")
    .in("id", profileIds);

  const userMap = new Map((users ?? []).map((u) => [u.id, u]));

  return (profiles ?? []).map((p) => {
    const u = userMap.get(p.id);
    return {
      id: p.id,
      email: u?.email ?? "",
      name: p.name,
      role: p.role,
      phone: p.phone,
      company: p.company,
      created_at: u?.created_at ?? "",
    };
  });
}

/** All unique enquiry contacts (grouped by email). */
export async function getAdminEnquiryContacts(): Promise<AdminEnquiryContact[]> {
  await requireAdmin();
  const supabase = createServiceRoleClient();

  const { data: enquiries } = await supabase
    .from("enquiries")
    .select("contact_email, contact_name, contact_phone, created_at")
    .order("created_at", { ascending: false });

  if (!enquiries || enquiries.length === 0) return [];

  // Group by email
  const grouped = new Map<string, { name: string | null; phone: string | null; count: number; lastAt: string }>();
  for (const e of enquiries) {
    const email = e.contact_email.toLowerCase();
    const existing = grouped.get(email);
    if (existing) {
      existing.count++;
      if (!existing.name && e.contact_name) existing.name = e.contact_name;
      if (!existing.phone && e.contact_phone) existing.phone = e.contact_phone;
    } else {
      grouped.set(email, {
        name: e.contact_name,
        phone: e.contact_phone,
        count: 1,
        lastAt: e.created_at,
      });
    }
  }

  return Array.from(grouped.entries()).map(([email, data]) => ({
    email,
    name: data.name,
    phone: data.phone,
    enquiry_count: data.count,
    last_enquiry_at: data.lastAt,
  }));
}
