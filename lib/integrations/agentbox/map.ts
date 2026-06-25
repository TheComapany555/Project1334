/**
 * Agentbox (Reapit Sales) listing → SaleBiz NormalizedListing mapper.
 *
 * PURE + unit-testable (see map.test.ts) — no DB or network. The connector
 * ([lib/actions/agentbox.ts]) resolves category/sub-category names → ids and
 * upserts via the shared `upsertExternalListing()`.
 *
 * ⚠️ Field names are modelled on the documented Agentbox listing resource but
 * the live sandbox is IP-restricted (see docs/SaleBiz_KYB_and_Agentbox_Status…).
 * Once our IP is whitelisted, VERIFY the field paths against a real response and
 * adjust the accessors below — they are intentionally isolated here so that is a
 * one-file change. Multiple likely spellings are tolerated where cheap.
 */

import type { ListingStatus } from "@/lib/types/listings";
import type { NormalizedListing, NormalizedVendor } from "../types";

/** Permissive shape of an Agentbox listing object (verify against live docs). */
export type AgentboxRawListing = {
  id?: string | number;
  type?: string;
  marketingStatus?: string;
  status?: string;
  mainHeadline?: string;
  headline?: string;
  description?: string;
  displayPrice?: string;
  searchPrice?: string | number;
  price?: string | number;
  annualTurnover?: string | number;
  takings?: string | number;
  modified?: string;
  modifiedDate?: string;
  agentId?: string | number;
  listingAgent?: { id?: string | number; name?: string };
  property?: {
    type?: string;
    category?: string;
    subCategory?: string;
    subcategory?: string;
    address?: AgentboxAddress;
  };
  address?: AgentboxAddress;
  vendor?: { name?: string; phone?: string; mobile?: string; email?: string } | null;
  images?: { items?: AgentboxImage[] } | AgentboxImage[] | null;
};

type AgentboxAddress = {
  streetAddress?: string;
  streetNumber?: string;
  street?: string;
  suburb?: string;
  state?: string;
  postcode?: string;
  displayAddress?: string;
};

type AgentboxImage = { url?: string; href?: string };

// ── helpers ────────────────────────────────────────────────────────────────

function str(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s.length > 0 ? s : null;
}

function numv(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const cleaned = String(v).replace(/[$,\s]/g, "");
  if (cleaned === "") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

/**
 * Map an Agentbox marketing status → a SaleBiz listing status.
 * "skip" means do not import (e.g. leased — SaleBiz doesn't model leases).
 * `publishCurrent` controls whether an available listing lands published or as a
 * draft (default: draft, matching the REAXML/CSV importers).
 */
export function mapAgentboxStatus(
  raw: string | null | undefined,
  opts: { publishCurrent?: boolean } = {},
): ListingStatus | "skip" {
  switch ((raw ?? "available").toString().trim().toLowerCase().replace(/[\s_-]+/g, "")) {
    case "available":
    case "current":
    case "active":
    case "listing":
      return opts.publishCurrent ? "published" : "draft";
    case "conditional":
    case "underoffer":
    case "undercontract":
    case "pending":
      return "under_offer";
    case "sold":
    case "settled":
    case "exchanged":
      return "sold";
    case "withdrawn":
    case "offmarket":
    case "archived":
    case "inactive":
      return "unpublished";
    case "leased":
      return "skip";
    default:
      return "draft";
  }
}

function mapImages(images: AgentboxRawListing["images"]): string[] {
  if (!images) return [];
  const items = Array.isArray(images) ? images : images.items ?? [];
  return items
    .map((img) => str(img?.url) ?? str(img?.href))
    .filter((u): u is string => !!u);
}

function mapVendor(raw: AgentboxRawListing["vendor"]): NormalizedVendor | null {
  if (!raw) return null;
  const name = str(raw.name);
  const phone = str(raw.phone) ?? str(raw.mobile);
  const email = str(raw.email);
  if (!name && !phone && !email) return null;
  return { name, phone, email };
}

function mapAddress(addr: AgentboxAddress | undefined): {
  locationText: string | null;
  suburb: string | null;
  state: string | null;
  postcode: string | null;
} {
  if (!addr) return { locationText: null, suburb: null, state: null, postcode: null };
  const suburb = str(addr.suburb);
  const state = str(addr.state);
  const postcode = str(addr.postcode);
  const streetLine =
    str(addr.streetAddress) ??
    ([str(addr.streetNumber), str(addr.street)].filter(Boolean).join(" ") || null);
  const regionLine = [state, postcode].filter(Boolean).join(" ") || null;
  const locationText =
    str(addr.displayAddress) ??
    ([streetLine, suburb, regionLine].filter(Boolean).join(", ") || null);
  return { locationText, suburb, state: state ? state.toUpperCase() : null, postcode };
}

// ── mapper ───────────────────────────────────────────────────────────────────

export function mapAgentboxListing(
  raw: AgentboxRawListing,
  opts: { publishCurrent?: boolean } = {},
): NormalizedListing {
  const askingPrice = numv(raw.searchPrice) ?? numv(raw.price);
  const priceType: "fixed" | "poa" = askingPrice && askingPrice > 0 ? "fixed" : "poa";
  const addr = mapAddress(raw.property?.address ?? raw.address);

  return {
    externalId: str(raw.id),
    agentId: str(raw.listingAgent?.id) ?? str(raw.agentId),
    modTime: str(raw.modified) ?? str(raw.modifiedDate),
    title: str(raw.mainHeadline) ?? str(raw.headline),
    description: str(raw.description),
    categoryName: str(raw.property?.category),
    subcategoryName: str(raw.property?.subCategory) ?? str(raw.property?.subcategory),
    priceType,
    askingPrice,
    revenue: numv(raw.annualTurnover) ?? numv(raw.takings),
    leaseDetails: null,
    exclusivity: null,
    locationText: addr.locationText,
    suburb: addr.suburb,
    state: addr.state,
    postcode: addr.postcode,
    vendor: mapVendor(raw.vendor),
    imageUrls: mapImages(raw.images),
    status: mapAgentboxStatus(raw.marketingStatus ?? raw.status, opts),
  };
}
