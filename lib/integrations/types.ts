/**
 * Listing-source integration framework.
 *
 * A `ListingSourceAdapter` knows how to verify a set of credentials and fetch a
 * platform's listings as `NormalizedListing[]`. The generic sync action then
 * writes them via the shared `upsertExternalListing()` — so adding a new
 * platform later is "write an adapter + register it", nothing else.
 *
 * `NormalizedListing` is the internal shape both REAXML and Agentbox produce and
 * the upsert consumes. It is a structural superset of the REAXML parser output
 * (lib/reaxml.ts `ReaxmlListing`) plus a resolved `status`.
 */

import type { ListingStatus } from "@/lib/types/listings";

export type NormalizedVendor = {
  name: string | null;
  phone: string | null;
  email: string | null;
};

export type NormalizedListing = {
  /** Stable external id used for de-dup on re-sync (e.g. Agentbox listing id). */
  externalId: string | null;
  /** External agent id (informational). */
  agentId: string | null;
  /** External last-modified timestamp (ISO-ish), stored on the external ref. */
  modTime: string | null;
  title: string | null;
  description: string | null;
  /** Category/sub-category by NAME — resolved to ids against the DB at upsert. */
  categoryName: string | null;
  subcategoryName: string | null;
  priceType: "fixed" | "poa";
  askingPrice: number | null;
  revenue: number | null;
  leaseDetails: string | null;
  exclusivity: "exclusive" | "open" | null;
  locationText: string | null;
  suburb: string | null;
  state: string | null;
  postcode: string | null;
  vendor: NormalizedVendor | null;
  imageUrls: string[];
  /** Final SaleBiz status, or "skip" to not import this row. */
  status: ListingStatus | "skip";
};

export type IntegrationCredentials = {
  clientId: string;
  apiKey: string;
};

export type VerifyResult = { ok: true } | { ok: false; error: string; ipBlocked?: boolean };

export type FetchListingsResult =
  | { ok: true; listings: NormalizedListing[] }
  | { ok: false; error: string; ipBlocked?: boolean };

export type ListingSourceAdapter = {
  /** Platform key, also used as `source_platform` on listing_external_refs. */
  id: string;
  displayName: string;
  /** Lightweight call to confirm credentials work (and the IP is whitelisted). */
  verifyCredentials(creds: IntegrationCredentials): Promise<VerifyResult>;
  /** Fetch + map the platform's listings into the normalized shape. */
  fetchListings(
    creds: IntegrationCredentials,
    opts?: { publishCurrent?: boolean },
  ): Promise<FetchListingsResult>;
};
