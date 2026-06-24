import type { createServiceRoleClient } from "@/lib/supabase/admin";

type SupabaseAdmin = ReturnType<typeof createServiceRoleClient>;

export type AgencySubscriptionAccessReason =
  | "solo_broker"
  | "exempt"
  | "active"
  | "trialing"
  | "past_due"
  | "no_active_subscription"
  | "pending";

export type AgencySubscriptionAccess = {
  allowed: boolean;
  reason: AgencySubscriptionAccessReason;
};

/**
 * Unified gate for listing create/import: solo brokers pass; waived agencies pass;
 * otherwise require active, trialing, or in-grace past_due subscription.
 */
export async function checkAgencySubscriptionAccess(
  supabase: SupabaseAdmin,
  agencyId: string | null,
): Promise<AgencySubscriptionAccess> {
  if (!agencyId) {
    return { allowed: true, reason: "solo_broker" };
  }

  const { data: agency } = await supabase
    .from("agencies")
    .select("subscription_exempt")
    .eq("id", agencyId)
    .single();
  if (agency?.subscription_exempt) {
    return { allowed: true, reason: "exempt" };
  }

  const { data: activeish } = await supabase
    .from("agency_subscriptions")
    .select("status, grace_period_end")
    .eq("agency_id", agencyId)
    .in("status", ["active", "trialing", "past_due"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (activeish) {
    if (
      activeish.status === "past_due" &&
      activeish.grace_period_end &&
      new Date(activeish.grace_period_end) <= new Date()
    ) {
      return { allowed: false, reason: "no_active_subscription" };
    }
    return {
      allowed: true,
      reason: activeish.status as "active" | "trialing" | "past_due",
    };
  }

  const { data: pending } = await supabase
    .from("agency_subscriptions")
    .select("id")
    .eq("agency_id", agencyId)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (pending) {
    return { allowed: false, reason: "pending" };
  }

  return { allowed: false, reason: "no_active_subscription" };
}
