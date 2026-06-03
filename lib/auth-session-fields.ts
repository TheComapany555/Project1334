// Shared helpers for building a user's session/JWT identity fields and for
// authorizing "manage as broker" (impersonation). Kept free of any next-auth
// import so both lib/auth.ts (the jwt callback) and lib/actions/impersonation.ts
// can import it without a circular dependency.

import { createServiceRoleClient } from "@/lib/supabase/admin";
import type { AgencyRole } from "@/lib/types/agencies";
import type { SubscriptionStatus } from "@/lib/types/subscriptions";

export type SessionUserFields = {
  id: string;
  role: "broker" | "admin" | "user";
  emailVerified: Date | null;
  agencyId: string | null;
  agencyRole: AgencyRole | null;
  agencyName: string | null;
  subscriptionStatus: SubscriptionStatus | null;
};

/**
 * Load the identity fields that the NextAuth token/session carries for a user.
 * Used when swapping the effective identity for impersonation (and to restore
 * the real actor on exit). Returns null when the user or their profile is gone.
 */
export async function loadSessionFieldsForUser(
  userId: string,
): Promise<SessionUserFields | null> {
  const supabase = createServiceRoleClient();

  const { data: user } = await supabase
    .from("users")
    .select("id, email_verified_at")
    .eq("id", userId)
    .maybeSingle();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, agency_id, agency_role")
    .eq("id", userId)
    .maybeSingle();
  if (!profile) return null;

  let agencyName: string | null = null;
  let subscriptionStatus: SubscriptionStatus | null = null;

  if (profile.agency_id) {
    const { data: agency } = await supabase
      .from("agencies")
      .select("name")
      .eq("id", profile.agency_id)
      .maybeSingle();
    agencyName = agency?.name ?? null;

    const { data: sub } = await supabase
      .from("agency_subscriptions")
      .select("status, grace_period_end")
      .eq("agency_id", profile.agency_id)
      .in("status", ["active", "trialing", "past_due", "pending"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (sub) {
      subscriptionStatus = sub.status as SubscriptionStatus;
      if (
        sub.status === "past_due" &&
        sub.grace_period_end &&
        new Date(sub.grace_period_end) < new Date()
      ) {
        subscriptionStatus = "expired";
      }
    }
  }

  return {
    id: user.id,
    role: (profile.role as "broker" | "admin" | "user") ?? "broker",
    emailVerified: user.email_verified_at ? new Date(user.email_verified_at) : null,
    agencyId: profile.agency_id ?? null,
    agencyRole: (profile.agency_role as AgencyRole) ?? null,
    agencyName,
    subscriptionStatus,
  };
}

/** Display name for the "you are managing X" banner / audit metadata. */
export async function getUserDisplayName(userId: string): Promise<string | null> {
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("profiles")
    .select("name")
    .eq("id", userId)
    .maybeSingle();
  return data?.name ?? null;
}

/**
 * Authorize whether `actorId` may impersonate ("manage as") `targetId`.
 *
 * Rules:
 *   - A platform admin may manage any broker.
 *   - An agency OWNER may manage a broker in their own agency (not themselves).
 *   - Only broker accounts can be managed (never admins or buyers).
 *
 * The actor's role is re-read from the DB (never trusted from the client) so a
 * stale or forged token cannot widen privileges.
 */
export async function canActorImpersonate(
  actorId: string,
  targetId: string,
): Promise<boolean> {
  if (!actorId || !targetId || actorId === targetId) return false;

  const supabase = createServiceRoleClient();

  const { data: actor } = await supabase
    .from("profiles")
    .select("role, agency_id, agency_role")
    .eq("id", actorId)
    .maybeSingle();
  if (!actor) return false;

  const { data: target } = await supabase
    .from("profiles")
    .select("role, agency_id")
    .eq("id", targetId)
    .maybeSingle();
  if (!target || target.role !== "broker") return false;

  if (actor.role === "admin") return true;

  if (
    actor.role === "broker" &&
    actor.agency_role === "owner" &&
    actor.agency_id &&
    target.agency_id === actor.agency_id
  ) {
    return true;
  }

  return false;
}
