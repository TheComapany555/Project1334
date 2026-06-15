/**
 * REAXML business-listing parser (Feature: REAXML import).
 *
 * Pure + server-safe: parses a REAXML `propertyList` document into normalised
 * listing rows. It resolves to category/sub-category *names* (not ids) and a
 * raw REAXML status — the import action ([lib/actions/reaxml-import.ts]) resolves
 * names → ids against the DB and maps the status. No DB or network access here,
 * so it's fully unit-testable (see reaxml.test.ts).
 *
 * Field mapping follows the agreed plan (docs/SaleBiz_REAXML_Implementation_Plan):
 *   headline                -> title
 *   description (+terms,+return%) -> description
 *   businessCategory.name   -> category (name)
 *   businessSubCategory.name -> sub-category (name)
 *   price                   -> asking_price / price_type (poa when no price)
 *   takings                 -> revenue
 *   businessLease/currentLeaseEndDate/furtherOptions -> lease_details (composed)
 *   exclusivity             -> exclusivity
 *   address                 -> location_text / suburb / state / postcode
 *   vendorDetails           -> vendor (private)
 *   uniqueID / agentID      -> external ref (de-dup)
 *   img url                 -> images
 *   commercialListingType   -> ignored
 */

import { XMLParser } from "fast-xml-parser";
import type { ListingStatus } from "./types/listings";

export type ReaxmlVendor = {
  name: string | null;
  phone: string | null;
  email: string | null;
};

export type ReaxmlListing = {
  /** REAXML uniqueID — stable external id used for de-dup on re-import. */
  externalId: string | null;
  /** REAXML agentID (top-level). */
  agentId: string | null;
  /** business@modTime (ISO-ish string from the feed). */
  modTime: string | null;
  /** Raw REAXML status (lowercased): current|withdrawn|sold|offmarket|leased. */
  reaxmlStatus: string | null;
  title: string | null;
  description: string | null;
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
  vendor: ReaxmlVendor | null;
  imageUrls: string[];
};

export type ParseReaxmlResult =
  | { ok: true; listings: ReaxmlListing[] }
  | { ok: false; error: string };

const TEXT_KEY = "#text";
const ATTR_PREFIX = "@_";

// ── low-level helpers ────────────────────────────────────────────────────────

/** Normalise fast-xml-parser's "1 element = object, N = array" into an array. */
function toArray<T = unknown>(v: T | T[] | undefined | null): T[] {
  if (v == null) return [];
  return Array.isArray(v) ? v : [v];
}

/** Read an element's text content (handles both `<x>v</x>` and `<x a="">v</x>`). */
function text(node: unknown): string | null {
  if (node == null) return null;
  if (typeof node === "object") {
    const t = (node as Record<string, unknown>)[TEXT_KEY];
    return t == null ? null : String(t).trim() || null;
  }
  const s = String(node).trim();
  return s.length > 0 ? s : null;
}

/** Read an attribute off an element node. */
function attr(node: unknown, name: string): string | null {
  if (node == null || typeof node !== "object") return null;
  const v = (node as Record<string, unknown>)[ATTR_PREFIX + name];
  return v == null ? null : String(v).trim() || null;
}

/** Parse a numeric value, tolerating "$", thousands separators and spaces. */
function num(raw: string | null): number | null {
  if (raw == null) return null;
  const cleaned = raw.replace(/[$,\s]/g, "");
  if (cleaned === "") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

// ── status mapping (policy lives here, applied by the import action) ─────────

/**
 * Map a REAXML status to a SaleBiz listing status.
 * `"skip"` means the listing should NOT be imported (e.g. leased — we don't
 * handle leases). `publishCurrent` controls whether a "current" listing lands
 * published or as a draft (default: draft, matching the CSV importer).
 */
export function mapReaxmlStatus(
  reaxmlStatus: string | null,
  opts: { publishCurrent?: boolean } = {},
): ListingStatus | "skip" {
  switch ((reaxmlStatus ?? "current").toLowerCase()) {
    case "current":
      return opts.publishCurrent ? "published" : "draft";
    case "sold":
      return "sold";
    case "withdrawn":
    case "offmarket":
      return "unpublished";
    case "leased":
      return "skip";
    default:
      return "draft";
  }
}

// ── parsing ──────────────────────────────────────────────────────────────────

function parseBusiness(b: Record<string, unknown>): ReaxmlListing {
  // Description = description + terms + return% (return has no SaleBiz field).
  const descParts: string[] = [];
  const desc = text(b.description);
  if (desc) descParts.push(desc);
  const terms = text(b.terms);
  if (terms) descParts.push(`Terms: ${terms}`);
  const ret = b.return;
  if (ret) {
    const rv = text(ret);
    if (rv) {
      const unit = attr(ret, "unit");
      const period = attr(ret, "period");
      descParts.push(
        `Return: ${rv}${unit === "percent" ? "%" : ""}${period ? ` (${period})` : ""}`,
      );
    }
  }

  // Primary category (REAXML allows up to 3; SaleBiz stores one + one sub).
  const cat0 = toArray(b.businessCategory)[0] as Record<string, unknown> | undefined;
  const categoryName = cat0 ? text(cat0.name) : null;
  const sub0 = cat0
    ? (toArray(cat0.businessSubCategory)[0] as Record<string, unknown> | undefined)
    : undefined;
  const subcategoryName = sub0 ? text(sub0.name) : null;

  // Price
  const askingPrice = b.price != null ? num(text(b.price)) : null;
  const priceType: "fixed" | "poa" = askingPrice && askingPrice > 0 ? "fixed" : "poa";

  // Lease info composed into a single text field.
  const leaseParts: string[] = [];
  for (const bl of toArray(b.businessLease)) {
    const amt = num(text(bl));
    if (amt != null) {
      const period = attr(bl, "period");
      leaseParts.push(`Lease: $${amt}${period ? `/${period}` : ""}`);
    }
  }
  const leaseEnd = text(b.currentLeaseEndDate);
  if (leaseEnd) leaseParts.push(`Lease ends ${leaseEnd}`);
  const further = text(b.furtherOptions);
  if (further) leaseParts.push(further);
  const leaseDetails = leaseParts.length > 0 ? leaseParts.join(". ") : null;

  // Exclusivity
  const exVal = attr(b.exclusivity, "value");
  const exclusivity =
    exVal === "exclusive" ? "exclusive" : exVal === "open" ? "open" : null;

  // Address
  let suburb: string | null = null;
  let state: string | null = null;
  let postcode: string | null = null;
  let locationText: string | null = null;
  const addr = b.address as Record<string, unknown> | undefined;
  if (addr) {
    suburb = text(addr.suburb);
    state = text(addr.state);
    postcode = text(addr.postcode);
    const streetLine = [text(addr.streetNumber), text(addr.street)]
      .filter(Boolean)
      .join(" ");
    const regionLine = [state, postcode].filter(Boolean).join(" ");
    locationText =
      [streetLine || null, suburb, regionLine || null].filter(Boolean).join(", ") ||
      null;
  }

  // Vendor (private). Take the first vendorDetails + its first telephone.
  let vendor: ReaxmlVendor | null = null;
  const v0 = toArray(b.vendorDetails)[0] as Record<string, unknown> | undefined;
  if (v0) {
    const vn = text(v0.name);
    const vp = text(toArray(v0.telephone)[0]);
    const ve = text(v0.email);
    if (vn || vp || ve) vendor = { name: vn, phone: vp, email: ve };
  }

  // Images
  const imagesNode = b.images as Record<string, unknown> | undefined;
  const imageUrls = imagesNode
    ? toArray(imagesNode.img)
        .map((img) => attr(img, "url"))
        .filter((u): u is string => !!u)
    : [];

  return {
    externalId: text(b.uniqueID),
    agentId: text(b.agentID),
    modTime: attr(b, "modTime"),
    reaxmlStatus: (attr(b, "status") ?? "").toLowerCase() || null,
    title: text(b.headline),
    description: descParts.length > 0 ? descParts.join("\n\n") : null,
    categoryName,
    subcategoryName,
    priceType,
    askingPrice,
    revenue: b.takings != null ? num(text(b.takings)) : null,
    leaseDetails,
    exclusivity,
    locationText,
    suburb,
    state: state ? state.toUpperCase() : null,
    postcode,
    vendor,
    imageUrls,
  };
}

/**
 * Parse a REAXML `propertyList` document into normalised listings.
 * Never throws — returns a discriminated result.
 */
export function parseReaxml(xml: string): ParseReaxmlResult {
  if (!xml || !xml.trim()) return { ok: false, error: "The file is empty." };

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: ATTR_PREFIX,
    textNodeName: TEXT_KEY,
    parseAttributeValue: false,
    parseTagValue: false,
    trimValues: true,
  });

  let root: Record<string, unknown>;
  try {
    root = parser.parse(xml) as Record<string, unknown>;
  } catch {
    return { ok: false, error: "This file isn't valid XML." };
  }

  const propertyList = root.propertyList as Record<string, unknown> | undefined;
  if (!propertyList) {
    return { ok: false, error: "Not a REAXML file (missing <propertyList> root)." };
  }

  const businesses = toArray(propertyList.business) as Record<string, unknown>[];
  if (businesses.length === 0) {
    return { ok: false, error: "No <business> listings found in the file." };
  }

  return { ok: true, listings: businesses.map(parseBusiness) };
}
