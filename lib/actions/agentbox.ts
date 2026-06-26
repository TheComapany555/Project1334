"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { checkAgencySubscriptionAccess } from "@/lib/subscriptions/agency-access";
import { resolveTaxonomy } from "@/lib/integrations/taxonomy";
import { upsertExternalListing } from "@/lib/integrations/upsert";
import { getAdapter } from "@/lib/integrations/registry";
import {
  encryptSecret,
  decryptSecret,
  isIntegrationCryptoConfigured,
  maskCredential,
} from "@/lib/crypto/secrets";
import {
  AGENTBOX_PLATFORM,
  validateAgentboxClientId,
  type AgentboxConnectionStatus,
  type AgentboxConnectionView,
  type AgentboxSyncResult,
  type ConnectAgentboxResult,
  type SyncAgentboxResult,
} from "@/lib/agentbox-sync-shared";

/** DB-persisted subset of the connection status (no "not_connected"). */
type StoredStatus = Exclude<AgentboxConnectionStatus, "not_connected">;

type BrokerCtx = { userId: string; agencyId: string | null; isOwner: boolean };

async function requireBrokerSession(): Promise<BrokerCtx> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "broker") {
    throw new Error("Unauthorized");
  }
  return {
    userId: session.user.id,
    agencyId: session.user.agencyId ?? null,
    isOwner: session.user.agencyRole === "owner",
  };
}

type ConnectionRow = {
  status: string;
  client_id: string;
  last_synced_at: string | null;
  last_sync_result: AgentboxSyncResult | null;
  last_error: string | null;
};

function buildView(row: ConnectionRow | null, ctx: BrokerCtx): AgentboxConnectionView {
  return {
    status: (row?.status as AgentboxConnectionStatus) ?? "not_connected",
    clientIdMasked: row ? maskCredential(row.client_id) : null,
    lastSyncedAt: row?.last_synced_at ?? null,
    lastSyncResult: row?.last_sync_result ?? null,
    lastError: row?.last_error ?? null,
    configured: isIntegrationCryptoConfigured(),
    canManage: ctx.isOwner && !!ctx.agencyId,
    hasAgency: !!ctx.agencyId,
  };
}

async function loadConnectionRow(agencyId: string): Promise<ConnectionRow | null> {
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("agency_integrations")
    .select("status, client_id, last_synced_at, last_sync_result, last_error")
    .eq("agency_id", agencyId)
    .eq("platform", AGENTBOX_PLATFORM)
    .maybeSingle();
  return (data as ConnectionRow | null) ?? null;
}

/** Optional platform-wide default credentials from env (matches Stripe/Sumsub/etc). */
function getEnvAgentboxCredentials(): { clientId: string; apiKey: string } | null {
  const clientId = process.env.AGENTBOX_CLIENT_ID?.trim();
  const apiKey = process.env.AGENTBOX_API_KEY?.trim();
  if (!clientId || !apiKey) return null;
  const clientIdError = validateAgentboxClientId(clientId);
  if (clientIdError) {
    console.error("[agentbox] Invalid AGENTBOX_CLIENT_ID in env:", clientIdError);
    return null;
  }
  return { clientId, apiKey };
}

/**
 * If env provides Agentbox credentials and the agency owner hasn't entered any
 * in the UI, auto-seed the connection row from env. This makes a single-client
 * deployment work straight from .env — no manual paste — while the per-agency UI
 * still takes precedence when used. Owners only; never overwrites a UI entry.
 */
async function ensureConnectionFromEnv(ctx: BrokerCtx): Promise<void> {
  if (!ctx.agencyId || !ctx.isOwner) return;
  if (!isIntegrationCryptoConfigured()) return;
  const env = getEnvAgentboxCredentials();
  if (!env) return;

  const supabase = createServiceRoleClient();
  const { data: existing } = await supabase
    .from("agency_integrations")
    .select("id")
    .eq("agency_id", ctx.agencyId)
    .eq("platform", AGENTBOX_PLATFORM)
    .maybeSingle();
  if (existing) return; // a connection already exists — don't overwrite it

  await supabase.from("agency_integrations").insert({
    agency_id: ctx.agencyId,
    platform: AGENTBOX_PLATFORM,
    client_id: env.clientId,
    api_key_encrypted: encryptSecret(env.apiKey),
    status: "pending_ip_whitelist",
    last_error: null,
    created_by: ctx.userId,
    updated_at: new Date().toISOString(),
  });
}

/** Read-only connection view for the Integrations page. Safe for any broker. */
export async function getAgentboxConnection(): Promise<AgentboxConnectionView> {
  const ctx = await requireBrokerSession();
  if (!ctx.agencyId) return buildView(null, ctx);
  await ensureConnectionFromEnv(ctx);
  return buildView(await loadConnectionRow(ctx.agencyId), ctx);
}

/** Connect (or re-connect) the agency's Agentbox account. Agency owners only. */
export async function connectAgentbox(input: {
  clientId: string;
  apiKey: string;
}): Promise<ConnectAgentboxResult> {
  const ctx = await requireBrokerSession();
  if (!ctx.agencyId) {
    return { ok: false, error: "Agentbox connects at the agency level — your account isn't part of an agency." };
  }
  if (!ctx.isOwner) {
    return { ok: false, error: "Only the agency owner can connect Agentbox." };
  }
  if (!isIntegrationCryptoConfigured()) {
    return { ok: false, error: "Integration encryption isn't configured (set INTEGRATION_ENCRYPTION_KEY)." };
  }

  const clientId = input.clientId?.trim();
  const apiKey = input.apiKey?.trim();
  if (!clientId || !apiKey) {
    return { ok: false, error: "Both Client ID and API Key are required." };
  }
  const clientIdError = validateAgentboxClientId(clientId);
  if (clientIdError) {
    return { ok: false, error: clientIdError };
  }

  const adapter = getAdapter(AGENTBOX_PLATFORM);
  if (!adapter) return { ok: false, error: "Agentbox adapter is unavailable." };

  // Probe the credentials. This also reveals whether our IP is whitelisted yet.
  const verify = await adapter.verifyCredentials({ clientId, apiKey });
  let status: StoredStatus;
  let lastError: string | null = null;
  if (verify.ok) {
    status = "connected";
  } else if (verify.ipBlocked) {
    // Likely just the IP allowlist — store so we can re-test once whitelisted.
    status = "pending_ip_whitelist";
    lastError = verify.error;
  } else {
    // Genuine credential rejection — don't store bad keys.
    return { ok: false, error: verify.error };
  }

  const supabase = createServiceRoleClient();
  const nowIso = new Date().toISOString();
  const { error } = await supabase.from("agency_integrations").upsert(
    {
      agency_id: ctx.agencyId,
      platform: AGENTBOX_PLATFORM,
      client_id: clientId,
      api_key_encrypted: encryptSecret(apiKey),
      status,
      last_error: lastError,
      created_by: ctx.userId,
      updated_at: nowIso,
    },
    { onConflict: "agency_id,platform" },
  );
  if (error) return { ok: false, error: "Could not save the connection." };

  return { ok: true, view: buildView(await loadConnectionRow(ctx.agencyId), ctx) };
}

/** Re-test stored credentials (e.g. after IP whitelisting). Agency owners only. */
export async function testAgentboxConnection(): Promise<ConnectAgentboxResult> {
  const ctx = await requireBrokerSession();
  if (!ctx.agencyId || !ctx.isOwner) {
    return { ok: false, error: "Only the agency owner can test the connection." };
  }
  await ensureConnectionFromEnv(ctx);

  const supabase = createServiceRoleClient();
  const { data: row } = await supabase
    .from("agency_integrations")
    .select("client_id, api_key_encrypted")
    .eq("agency_id", ctx.agencyId)
    .eq("platform", AGENTBOX_PLATFORM)
    .maybeSingle();
  if (!row) return { ok: false, error: "No Agentbox connection found." };

  const adapter = getAdapter(AGENTBOX_PLATFORM);
  if (!adapter) return { ok: false, error: "Agentbox adapter is unavailable." };

  const verify = await adapter.verifyCredentials({
    clientId: row.client_id,
    apiKey: decryptSecret(row.api_key_encrypted),
  });
  const status: StoredStatus = verify.ok ? "connected" : verify.ipBlocked ? "pending_ip_whitelist" : "error";
  const lastError = verify.ok ? null : verify.error;
  await supabase
    .from("agency_integrations")
    .update({ status, last_error: lastError, updated_at: new Date().toISOString() })
    .eq("agency_id", ctx.agencyId)
    .eq("platform", AGENTBOX_PLATFORM);

  return { ok: true, view: buildView(await loadConnectionRow(ctx.agencyId), ctx) };
}

/** Remove the agency's Agentbox connection (does not touch imported listings). */
export async function disconnectAgentbox(): Promise<ConnectAgentboxResult> {
  const ctx = await requireBrokerSession();
  if (!ctx.agencyId || !ctx.isOwner) {
    return { ok: false, error: "Only the agency owner can disconnect Agentbox." };
  }
  const supabase = createServiceRoleClient();
  await supabase
    .from("agency_integrations")
    .delete()
    .eq("agency_id", ctx.agencyId)
    .eq("platform", AGENTBOX_PLATFORM);
  return { ok: true, view: buildView(null, ctx) };
}

/**
 * Pull listings from Agentbox and import them as drafts (de-duped via
 * listing_external_refs). Manual "Sync now". Agency owners only.
 */
export async function syncAgentboxListings(
  opts: { publishCurrent?: boolean } = {},
): Promise<SyncAgentboxResult> {
  const ctx = await requireBrokerSession();
  if (!ctx.agencyId) {
    return { ok: false, error: "Agentbox connects at the agency level — your account isn't part of an agency." };
  }
  if (!ctx.isOwner) {
    return { ok: false, error: "Only the agency owner can run a sync." };
  }

  const supabase = createServiceRoleClient();

  const access = await checkAgencySubscriptionAccess(supabase, ctx.agencyId);
  if (!access.allowed) {
    return {
      ok: false,
      error: "Your agency subscription is not active. Please subscribe before importing listings.",
    };
  }

  await ensureConnectionFromEnv(ctx);
  const { data: row } = await supabase
    .from("agency_integrations")
    .select("client_id, api_key_encrypted")
    .eq("agency_id", ctx.agencyId)
    .eq("platform", AGENTBOX_PLATFORM)
    .maybeSingle();
  if (!row) return { ok: false, error: "Connect Agentbox before syncing." };

  const adapter = getAdapter(AGENTBOX_PLATFORM);
  if (!adapter) return { ok: false, error: "Agentbox adapter is unavailable." };

  const fetched = await adapter.fetchListings(
    { clientId: row.client_id, apiKey: decryptSecret(row.api_key_encrypted) },
    { publishCurrent: opts.publishCurrent },
  );
  if (!fetched.ok) {
    const status: StoredStatus = fetched.ipBlocked ? "pending_ip_whitelist" : "error";
    await supabase
      .from("agency_integrations")
      .update({ status, last_error: fetched.error, updated_at: new Date().toISOString() })
      .eq("agency_id", ctx.agencyId)
      .eq("platform", AGENTBOX_PLATFORM);
    return { ok: false, error: fetched.error };
  }

  const maps = await resolveTaxonomy(supabase);
  const nowIso = new Date().toISOString();
  const result: AgentboxSyncResult = {
    total: fetched.listings.length,
    created: 0,
    updated: 0,
    skipped: 0,
    imagesAdded: 0,
    imageFailures: 0,
  };

  for (const listing of fetched.listings) {
    const delta = await upsertExternalListing(supabase, listing, {
      sourcePlatform: AGENTBOX_PLATFORM,
      brokerId: ctx.userId,
      agencyId: ctx.agencyId,
      maps,
      nowIso,
    });
    if (delta.outcome === "created") result.created += 1;
    else if (delta.outcome === "updated") result.updated += 1;
    else result.skipped += 1;
    result.imagesAdded += delta.imagesAdded;
    result.imageFailures += delta.imageFailures;
  }

  await supabase
    .from("agency_integrations")
    .update({
      status: "connected" satisfies StoredStatus,
      last_error: null,
      last_synced_at: nowIso,
      last_sync_result: result,
      updated_at: nowIso,
    })
    .eq("agency_id", ctx.agencyId)
    .eq("platform", AGENTBOX_PLATFORM);

  return { ok: true, result };
}
