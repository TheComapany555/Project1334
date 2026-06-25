/**
 * Listing-source adapter registry. Adding a new platform = write an adapter +
 * register it here; the generic sync action and UI need no other changes.
 */

import type { ListingSourceAdapter } from "./types";
import { agentboxAdapter } from "./agentbox";

const ADAPTERS: Record<string, ListingSourceAdapter> = {
  [agentboxAdapter.id]: agentboxAdapter,
};

export function getAdapter(platform: string): ListingSourceAdapter | null {
  return ADAPTERS[platform] ?? null;
}
