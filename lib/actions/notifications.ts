"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import type { Notification, NotificationType } from "@/lib/types/notifications";

async function requireAuth() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");
  return { userId: session.user.id, role: session.user.role };
}

// ── Read ──

/** Get notifications for the current user. */
export async function getMyNotifications(
  limit: number = 20,
  offset: number = 0
): Promise<Notification[]> {
  const { userId } = await requireAuth();
  const supabase = createServiceRoleClient();

  const { data } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  return (data ?? []) as Notification[];
}

/** Get unread notification count for the current user. */
export async function getUnreadCount(): Promise<number> {
  const { userId } = await requireAuth();
  const supabase = createServiceRoleClient();

  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_read", false);

  return count ?? 0;
}

// ── Update ──

/** Mark a single notification as read. */
export async function markAsRead(
  notificationId: string
): Promise<{ ok: boolean }> {
  const { userId } = await requireAuth();
  const supabase = createServiceRoleClient();

  await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", notificationId)
    .eq("user_id", userId);

  return { ok: true };
}

/** Mark all notifications as read for the current user. */
export async function markAllAsRead(): Promise<{ ok: boolean }> {
  const { userId } = await requireAuth();
  const supabase = createServiceRoleClient();

  await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", userId)
    .eq("is_read", false);

  return { ok: true };
}

// ── Create (server-side helper — used internally, not called from client) ──

/** Create a notification for a specific user. */
export async function createNotification(params: {
  userId: string;
  type: NotificationType;
  title: string;
  message?: string;
  link?: string;
}): Promise<void> {
  const supabase = createServiceRoleClient();

  await supabase.from("notifications").insert({
    user_id: params.userId,
    type: params.type,
    title: params.title,
    message: params.message ?? null,
    link: params.link ?? null,
  });
}

/** Create a notification for all admin users. */
export async function notifyAdmins(params: {
  type: NotificationType;
  title: string;
  message?: string;
  link?: string;
}): Promise<void> {
  const supabase = createServiceRoleClient();

  const { data: admins } = await supabase
    .from("profiles")
    .select("id")
    .eq("role", "admin");

  if (!admins?.length) return;

  const rows = admins.map((admin) => ({
    user_id: admin.id,
    type: params.type,
    title: params.title,
    message: params.message ?? null,
    link: params.link ?? null,
  }));

  await supabase.from("notifications").insert(rows);
}

/** Create a notification for all brokers in an agency. */
export async function notifyAgencyBrokers(params: {
  agencyId: string;
  type: NotificationType;
  title: string;
  message?: string;
  link?: string;
  excludeUserId?: string;
}): Promise<void> {
  const supabase = createServiceRoleClient();

  const { data: brokers } = await supabase
    .from("profiles")
    .select("id")
    .eq("agency_id", params.agencyId);

  if (!brokers?.length) return;

  const rows = brokers
    .filter((b) => b.id !== params.excludeUserId)
    .map((broker) => ({
      user_id: broker.id,
      type: params.type,
      title: params.title,
      message: params.message ?? null,
      link: params.link ?? null,
    }));

  if (rows.length > 0) {
    await supabase.from("notifications").insert(rows);
  }
}
