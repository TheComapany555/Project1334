/**
 * Shared (non-"use server") constants + types for the Agentbox connector.
 *
 * Live outside lib/actions/agentbox.ts because a "use server" module may only
 * export async functions — constants/types must be imported from a plain module
 * (consumed by both the action and the client UI).
 */

export const AGENTBOX_PLATFORM = "agentbox" as const;

/** "not_connected" is view-only (no DB row); the rest mirror the DB CHECK. */
export type AgentboxConnectionStatus =
  | "not_connected"
  | "connected"
  | "pending_ip_whitelist"
  | "error"
  | "disconnected";

export type AgentboxSyncResult = {
  total: number;
  created: number;
  updated: number;
  skipped: number;
  imagesAdded: number;
  imageFailures: number;
};

export type AgentboxConnectionView = {
  status: AgentboxConnectionStatus;
  clientIdMasked: string | null;
  lastSyncedAt: string | null;
  lastSyncResult: AgentboxSyncResult | null;
  lastError: string | null;
  /** INTEGRATION_ENCRYPTION_KEY is set (required to store credentials). */
  configured: boolean;
  /** Current user is the agency owner (only owners connect/sync). */
  canManage: boolean;
  /** The connection is per-agency — false for solo brokers without an agency. */
  hasAgency: boolean;
};

export type ConnectAgentboxResult =
  | { ok: true; view: AgentboxConnectionView }
  | { ok: false; error: string };

export type SyncAgentboxResult =
  | { ok: true; result: AgentboxSyncResult }
  | { ok: false; error: string };
