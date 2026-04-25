"use server";

import { createServiceRoleClient } from "@/lib/supabase/admin";
import {
  buildPaginated,
  normalizePagination,
  type Paginated,
} from "@/lib/types/pagination";

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

export type ListAdminUsersParams = {
  page?: number;
  pageSize?: number;
  q?: string | null;
  role?: string | null;
};

export async function listAdminUsers(
  params: ListAdminUsersParams = {},
): Promise<Paginated<AdminUser>> {
  await requireAdmin();
  const supabase = createServiceRoleClient();
  const { page, pageSize, offset } = normalizePagination(params);

  let q = supabase
    .from("profiles")
    .select("id, name, role, phone, company", { count: "exact" });

  if (params.role?.trim()) q = q.eq("role", params.role.trim());
  if (params.q?.trim()) {
    const k = params.q.trim().replace(/%/g, "\\%").replace(/_/g, "\\_");
    q = q.or(`name.ilike.%${k}%,company.ilike.%${k}%,phone.ilike.%${k}%`);
  }
  q = q.order("created_at", { ascending: false });

  const { data: profiles, error, count } = await q.range(offset, offset + pageSize - 1);
  if (error || !profiles?.length)
    return buildPaginated<AdminUser>([], count ?? 0, page, pageSize);

  const profileIds = profiles.map((p) => p.id);
  const { data: users } = await supabase
    .from("users")
    .select("id, email, created_at")
    .in("id", profileIds);
  const userMap = new Map((users ?? []).map((u) => [u.id, u]));

  const rows: AdminUser[] = profiles.map((p) => {
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

  return buildPaginated(rows, count ?? 0, page, pageSize);
}

/** @deprecated Use `listAdminUsers`. */
export async function getAdminUsers(): Promise<AdminUser[]> {
  const { rows } = await listAdminUsers({ page: 1, pageSize: 100 });
  return rows;
}

export type ListAdminEnquiryContactsParams = {
  page?: number;
  pageSize?: number;
  q?: string | null;
};

/**
 * Paginated enquiry contacts grouped by email.
 *
 * Note on the implementation: the underlying group-by happens in JS, so we
 * over-fetch a window of recent enquiries (capped at 5000) and slice the
 * grouped result in-memory. Adequate up to a few thousand unique contacts;
 * if it ever grows past that, replace with a Postgres view that does the
 * grouping server-side.
 */
export async function listAdminEnquiryContacts(
  params: ListAdminEnquiryContactsParams = {},
): Promise<Paginated<AdminEnquiryContact>> {
  await requireAdmin();
  const supabase = createServiceRoleClient();
  const { page, pageSize } = normalizePagination(params);

  const { data: enquiries } = await supabase
    .from("enquiries")
    .select("contact_email, contact_name, contact_phone, created_at")
    .order("created_at", { ascending: false })
    .limit(5000);

  if (!enquiries || enquiries.length === 0)
    return buildPaginated<AdminEnquiryContact>([], 0, page, pageSize);

  const grouped = new Map<
    string,
    { name: string | null; phone: string | null; count: number; lastAt: string }
  >();
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

  let all: AdminEnquiryContact[] = Array.from(grouped.entries()).map(
    ([email, d]) => ({
      email,
      name: d.name,
      phone: d.phone,
      enquiry_count: d.count,
      last_enquiry_at: d.lastAt,
    }),
  );

  if (params.q?.trim()) {
    const needle = params.q.trim().toLowerCase();
    all = all.filter(
      (c) =>
        c.email.includes(needle) ||
        (c.name?.toLowerCase().includes(needle) ?? false) ||
        (c.phone?.toLowerCase().includes(needle) ?? false),
    );
  }

  const total = all.length;
  const start = (page - 1) * pageSize;
  const slice = all.slice(start, start + pageSize);
  return buildPaginated(slice, total, page, pageSize);
}

/** @deprecated Use `listAdminEnquiryContacts`. */
export async function getAdminEnquiryContacts(): Promise<AdminEnquiryContact[]> {
  const { rows } = await listAdminEnquiryContacts({ page: 1, pageSize: 100 });
  return rows;
}
