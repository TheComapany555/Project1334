/**
 * Agentbox (Reapit Sales) listing-source adapter.
 *
 * Ties the HTTP client + mapper into the generic `ListingSourceAdapter`. When
 * `AGENTBOX_USE_FIXTURES=1` it returns recorded fixtures instead of calling the
 * (IP-restricted) sandbox — so the whole connect → sync → drafts flow works
 * before our IP is whitelisted.
 */

import type { ListingSourceAdapter, NormalizedListing } from "../types";
import { mapAgentboxListing } from "./map";
import { fetchAgentboxListingItems, verifyAgentboxCredentials } from "./client";
import { sampleAgentboxListings } from "./__fixtures__/listings.sample";

function fixturesEnabled(): boolean {
  return process.env.AGENTBOX_USE_FIXTURES === "1";
}

export const agentboxAdapter: ListingSourceAdapter = {
  id: "agentbox",
  displayName: "Agentbox (Reapit Sales)",

  async verifyCredentials(creds) {
    if (fixturesEnabled()) return { ok: true };
    return verifyAgentboxCredentials(creds);
  },

  async fetchListings(creds, opts) {
    if (fixturesEnabled()) {
      const listings: NormalizedListing[] = sampleAgentboxListings.map((r) =>
        mapAgentboxListing(r, opts),
      );
      return { ok: true, listings };
    }
    const res = await fetchAgentboxListingItems(creds);
    if (!res.ok) return { ok: false, error: res.error, ipBlocked: res.ipBlocked };
    const listings: NormalizedListing[] = res.items.map((r) => mapAgentboxListing(r, opts));
    return { ok: true, listings };
  },
};
