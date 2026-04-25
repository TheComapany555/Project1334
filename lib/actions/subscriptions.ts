"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe";
import type {
  AgencySubscription,
  SubscriptionForAdmin,
} from "@/lib/types/subscriptions";
import { notifyAgencyBrokers } from "@/lib/actions/notifications";
import {
  buildPaginated,
  normalizePagination,
  type Paginated,
} from "@/lib/types/pagination";

async function requireBroker() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "broker") {
    throw new Error("Unauthorized");
  }
  return {
    userId: session.user.id,
    agencyId: session.user.agencyId ?? null,
    agencyRole: session.user.agencyRole ?? null,
  };
}

async function requireAgencyOwner() {
  const { userId, agencyId, agencyRole } = await requireBroker();
  if (!agencyId || agencyRole !== "owner") {
    throw new Error("Unauthorized — agency owner only");
  }
  return { userId, agencyId };
}

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "admin") {
    throw new Error("Unauthorized");
  }
  return { userId: session.user.id };
}

// ── Broker/Agency-facing ──

/** Get the current agency's subscription. */
export async function getMySubscription(): Promise<AgencySubscription | null> {
  const { agencyId } = await requireBroker();
  if (!agencyId) return null;
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("agency_subscriptions")
    .select(
      `*, plan_product:products!plan_product_id(id, name, price, currency)`
    )
    .eq("agency_id", agencyId)
    .in("status", ["active", "trialing", "past_due", "pending"])
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!data) return null;

  const sub = data as AgencySubscription;

  // Apply agency-specific pricing override if one exists
  if (sub.plan_product?.id) {
    const { data: override } = await supabase
      .from("agency_pricing_overrides")
      .select("custom_price, currency")
      .eq("agency_id", agencyId)
      .eq("product_id", sub.plan_product.id)
      .single();

    if (override) {
      sub.plan_product = {
        ...sub.plan_product,
        price: override.custom_price,
        currency: override.currency ?? sub.plan_product.currency,
      };
    }
  }

  return sub;
}

/** Real-time check: does the current agency have an active subscription? */
export async function isSubscriptionActive(): Promise<boolean> {
  const { agencyId } = await requireBroker();
  if (!agencyId) return false;
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("agency_subscriptions")
    .select("id, status, grace_period_end")
    .eq("agency_id", agencyId)
    .in("status", ["active", "trialing", "past_due"])
    .limit(1)
    .single();
  if (!data) return false;
  if (data.status === "past_due" && data.grace_period_end) {
    return new Date(data.grace_period_end) > new Date();
  }
  return true;
}

/** Get subscription status for a given agency (used in layout).
 *  Prioritises active/trialing/past_due/pending subscriptions over expired/cancelled ones.
 */
export async function getAgencySubscriptionStatus(
  agencyId: string
): Promise<AgencySubscription | null> {
  const supabase = createServiceRoleClient();

  // First try to find an active-ish subscription
  const { data: active } = await supabase
    .from("agency_subscriptions")
    .select(
      `*, plan_product:products!plan_product_id(id, name, price, currency)`
    )
    .eq("agency_id", agencyId)
    .in("status", ["active", "trialing", "past_due", "pending"])
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (active) return active as AgencySubscription;

  // Fall back to the most recent subscription (expired/cancelled) for display
  const { data: latest } = await supabase
    .from("agency_subscriptions")
    .select(
      `*, plan_product:products!plan_product_id(id, name, price, currency)`
    )
    .eq("agency_id", agencyId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  return (latest as AgencySubscription) ?? null;
}

// ── Admin-facing ──

export type ListAdminSubscriptionsParams = {
  page?: number;
  pageSize?: number;
  q?: string | null;
  status?: string | null;
};

/** Paginated agency subscriptions with agency + plan + broker count. */
export async function listAdminSubscriptions(
  params: ListAdminSubscriptionsParams = {},
): Promise<Paginated<SubscriptionForAdmin>> {
  await requireAdmin();
  const supabase = createServiceRoleClient();
  const { page, pageSize, offset } = normalizePagination(params);

  let query = supabase
    .from("agency_subscriptions")
    .select(
      `*, agency:agencies!agency_id(id, name, slug, email), plan_product:products!plan_product_id(id, name, price, currency)`,
      { count: "exact" },
    );

  if (params.status?.trim() && params.status !== "all") {
    query = query.eq("status", params.status.trim());
  }
  query = query.order("created_at", { ascending: false });

  const { data, error, count } = await query.range(offset, offset + pageSize - 1);
  if (error)
    return buildPaginated<SubscriptionForAdmin>([], 0, page, pageSize);

  const subs = (data ?? []) as (AgencySubscription & {
    agency?: {
      id: string;
      name: string;
      slug: string | null;
      email: string | null;
    };
  })[];

  // Filter by agency name search post-fetch (Supabase doesn't ilike across joins easily)
  let filtered = subs;
  if (params.q?.trim()) {
    const needle = params.q.trim().toLowerCase();
    filtered = subs.filter(
      (s) =>
        (s.agency?.name?.toLowerCase().includes(needle) ?? false) ||
        (s.agency?.email?.toLowerCase().includes(needle) ?? false),
    );
  }

  // Enrich with broker counts (one parallel batch)
  const agencyIds = [...new Set(filtered.map((s) => s.agency_id))];
  const counts = await Promise.all(
    agencyIds.map(async (id) => {
      const { count: c } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("agency_id", id);
      return [id, c ?? 0] as const;
    }),
  );
  const countMap = new Map(counts);

  const rows: SubscriptionForAdmin[] = filtered.map((sub) => ({
    ...sub,
    agency_name: sub.agency?.name ?? "Unknown",
    agency_email: sub.agency?.email ?? null,
    broker_count: countMap.get(sub.agency_id) ?? 0,
  }));

  return buildPaginated(rows, count ?? 0, page, pageSize);
}

/** @deprecated Use `listAdminSubscriptions`. */
export async function getAllSubscriptions(
  statusFilter?: string,
): Promise<SubscriptionForAdmin[]> {
  const { rows } = await listAdminSubscriptions({
    page: 1,
    pageSize: 100,
    status: statusFilter ?? null,
  });
  return rows;
}

/** Admin: manually create a subscription for an agency (bypass Stripe). */
export async function adminCreateSubscription(
  agencyId: string,
  productId: string | null,
  durationDays: number = 30
): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const supabase = createServiceRoleClient();

  const now = new Date();
  const periodEnd = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

  const { error } = await supabase.from("agency_subscriptions").insert({
    agency_id: agencyId,
    plan_product_id: productId,
    status: "active",
    current_period_start: now.toISOString(),
    current_period_end: periodEnd.toISOString(),
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** Admin: cancel a subscription. */
export async function adminCancelSubscription(
  subscriptionId: string,
  cancelImmediately: boolean = false
): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const supabase = createServiceRoleClient();

  const { data: sub } = await supabase
    .from("agency_subscriptions")
    .select("id, stripe_subscription_id, agency_id")
    .eq("id", subscriptionId)
    .single();

  if (!sub) return { ok: false, error: "Subscription not found" };

  // Cancel on Stripe if linked
  if (sub.stripe_subscription_id) {
    try {
      if (cancelImmediately) {
        await stripe.subscriptions.cancel(sub.stripe_subscription_id);
      } else {
        await stripe.subscriptions.update(sub.stripe_subscription_id, {
          cancel_at_period_end: true,
        });
      }
    } catch {
      // Stripe sub may already be cancelled
    }
  }

  const payload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
    cancelled_at: new Date().toISOString(),
  };

  if (cancelImmediately) {
    payload.status = "cancelled";
  } else {
    payload.cancel_at_period_end = true;
  }

  const { error } = await supabase
    .from("agency_subscriptions")
    .update(payload)
    .eq("id", subscriptionId);

  if (error) return { ok: false, error: error.message };

  // Notify agency brokers
  notifyAgencyBrokers({
    agencyId: sub.agency_id,
    type: "subscription_cancelled",
    title: cancelImmediately
      ? "Your subscription has been cancelled"
      : "Your subscription will be cancelled at period end",
    link: "/dashboard/subscribe",
  }).catch(() => {});

  return { ok: true };
}

/** Admin: extend a subscription's period. */
export async function adminExtendSubscription(
  subscriptionId: string,
  additionalDays: number
): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const supabase = createServiceRoleClient();

  const { data: sub } = await supabase
    .from("agency_subscriptions")
    .select("id, current_period_end, status")
    .eq("id", subscriptionId)
    .single();

  if (!sub) return { ok: false, error: "Subscription not found" };

  const base = sub.current_period_end
    ? new Date(sub.current_period_end)
    : new Date();
  const newEnd = new Date(
    base.getTime() + additionalDays * 24 * 60 * 60 * 1000
  );

  const { error } = await supabase
    .from("agency_subscriptions")
    .update({
      current_period_end: newEnd.toISOString(),
      status: "active",
      updated_at: new Date().toISOString(),
    })
    .eq("id", subscriptionId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** Admin: activate a pending subscription (approve invoice request). */
export async function adminActivateSubscription(
  subscriptionId: string
): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const supabase = createServiceRoleClient();

  const { data: sub } = await supabase
    .from("agency_subscriptions")
    .select("id, status, plan_product_id, agency_id")
    .eq("id", subscriptionId)
    .single();

  if (!sub) return { ok: false, error: "Subscription not found" };
  if (sub.status !== "pending") return { ok: false, error: "Subscription is not pending" };

  const now = new Date();
  const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const { error } = await supabase
    .from("agency_subscriptions")
    .update({
      status: "active",
      current_period_start: now.toISOString(),
      current_period_end: periodEnd.toISOString(),
      updated_at: now.toISOString(),
    })
    .eq("id", subscriptionId);

  if (error) return { ok: false, error: error.message };

  // Also mark the related invoiced payment as paid
  await supabase
    .from("payments")
    .update({
      status: "paid",
      paid_at: now.toISOString(),
    })
    .eq("subscription_id", subscriptionId)
    .eq("status", "invoiced");

  // Notify agency brokers
  notifyAgencyBrokers({
    agencyId: sub.agency_id,
    type: "subscription_activated",
    title: "Your subscription has been activated",
    message: "Your agency subscription is now active for 30 days.",
    link: "/dashboard/subscribe",
  }).catch(() => {});

  return { ok: true };
}

/** Admin: reject a pending subscription (deny invoice request). */
export async function adminRejectSubscription(
  subscriptionId: string
): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const supabase = createServiceRoleClient();

  const { data: sub } = await supabase
    .from("agency_subscriptions")
    .select("id, status")
    .eq("id", subscriptionId)
    .single();

  if (!sub) return { ok: false, error: "Subscription not found" };
  if (sub.status !== "pending") return { ok: false, error: "Subscription is not pending" };

  const { error } = await supabase
    .from("agency_subscriptions")
    .update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", subscriptionId);

  if (error) return { ok: false, error: error.message };

  // Remove the related invoiced payment record
  await supabase
    .from("payments")
    .delete()
    .eq("subscription_id", subscriptionId)
    .eq("status", "invoiced");

  return { ok: true };
}

/** Admin: reactivate an expired/cancelled subscription. */
export async function adminReactivateSubscription(
  subscriptionId: string
): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const supabase = createServiceRoleClient();

  const now = new Date();
  const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const { error } = await supabase
    .from("agency_subscriptions")
    .update({
      status: "active",
      current_period_start: now.toISOString(),
      current_period_end: periodEnd.toISOString(),
      cancelled_at: null,
      cancel_at_period_end: false,
      grace_period_end: null,
      updated_at: now.toISOString(),
    })
    .eq("id", subscriptionId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
