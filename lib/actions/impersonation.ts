"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { canActorImpersonate } from "@/lib/auth-session-fields";

/**
 * "Manage as broker" (impersonation).
 *
 * This action authorizes the request and records an audit entry. The actual
 * identity swap on the session token is performed by the NextAuth `jwt`
 * callback when the client calls `useSession().update({ impersonate: brokerId })`
 * — that callback independently re-authorizes, so this action is the
 * user-facing entry point (clean error messages + audit), not the security
 * boundary on its own.
 */
export async function startImpersonation(
  brokerId: string,
): Promise<{ ok: boolean; error?: string; brokerName?: string | null }> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { ok: false, error: "You are not signed in." };

  // If already managing someone, the real actor is the impersonator, not the
  // currently-managed broker — authorize against the real actor.
  const realActorId = session.user.impersonator?.id ?? session.user.id;

  const allowed = await canActorImpersonate(realActorId, brokerId);
  if (!allowed) {
    return { ok: false, error: "You don't have permission to manage this broker." };
  }

  const supabase = createServiceRoleClient();
  const { data: broker } = await supabase
    .from("profiles")
    .select("name, agency_id")
    .eq("id", brokerId)
    .maybeSingle();

  const { error } = await supabase.from("admin_audit_log").insert({
    admin_id: realActorId,
    action: "impersonate_start",
    target_user_id: brokerId,
    target_agency_id: broker?.agency_id ?? null,
    metadata: { via: session.user.impersonator ? "switch" : "direct" },
  });
  if (error) {
    // Audit is mandatory for impersonation — refuse rather than act untraceably.
    console.error(`[impersonation] Failed to write audit log: ${error.message}`);
    return {
      ok: false,
      error:
        "Could not start a managed session (audit log unavailable). " +
        "If this persists, ensure migration 20260528000001_admin_account_creation.sql is applied.",
    };
  }

  return { ok: true, brokerName: broker?.name ?? null };
}

/** Record the end of a managed session. The token is restored by the jwt callback. */
export async function stopImpersonation(): Promise<{ ok: boolean; error?: string }> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { ok: false, error: "You are not signed in." };
  if (!session.user.impersonator) return { ok: true };

  const supabase = createServiceRoleClient();
  await supabase.from("admin_audit_log").insert({
    admin_id: session.user.impersonator.id,
    action: "impersonate_stop",
    target_user_id: session.user.id,
    target_agency_id: session.user.agencyId ?? null,
    metadata: null,
  });

  return { ok: true };
}
