/**
 * Shared definition of the bulk listing-import flow (Feature #9).
 *
 * Consumed by both the client (`ImportListingsDialog` — template download,
 * file parsing, column-mapping UI, preview) and the server (`importListings`
 * action) so the field schema can't drift between them.
 *
 * Server-safe: NO `xlsx` import here (that lives in listings-import-client.ts).
 * Images are intentionally out of scope for this version — imported listings
 * are created as drafts; brokers add images via the listing editor.
 */

export const LISTING_IMPORT_COLUMNS = [
  "title",
  "category",
  "price_type",
  "asking_price",
  "revenue",
  "profit",
  "location_text",
  "suburb",
  "state",
  "postcode",
  "region",
  "summary",
  "description",
  "lease_details",
] as const;

export type ListingImportColumn = (typeof LISTING_IMPORT_COLUMNS)[number];

/** Hard cap so a runaway file can't dump tens of thousands of rows into the DB. */
export const MAX_IMPORT_ROWS = 2000;

/**
 * Rows sent to the server per chunk. Smaller than the contact import because
 * each listing is a full insert (+ slug); keeps every call well under the
 * function-timeout window.
 */
export const IMPORT_CHUNK_SIZE = 100;

/** Realistic example shown in the downloadable template. */
export const SAMPLE_ROW: Record<ListingImportColumn, string> = {
  title: "Established Cafe in Surry Hills",
  category: "Food & Hospitality",
  price_type: "fixed",
  asking_price: "350000",
  revenue: "720000",
  profit: "180000",
  location_text: "Surry Hills, Sydney NSW",
  suburb: "Surry Hills",
  state: "NSW",
  postcode: "2010",
  region: "Sydney",
  summary: "Profitable cafe with loyal customer base and long lease.",
  description:
    "Turn-key cafe trading 6 days. Fully equipped kitchen, 40 seats, strong foot traffic. Owner retiring.",
  lease_details: "5 + 5 year lease, $4,200/month",
};

/** The clean payload the client sends to the server after parsing/normalising. */
export type ListingImportRow = {
  title: string;
  /** Raw category name or slug from the file; the server resolves it to an id. */
  category: string | null;
  price_type: "fixed" | "poa";
  asking_price: number | null;
  revenue: number | null;
  profit: number | null;
  location_text: string | null;
  suburb: string | null;
  state: string | null;
  postcode: string | null;
  region: string | null;
  summary: string | null;
  description: string | null;
  lease_details: string | null;
};

export type ListingImportRowStatus = "ready" | "skipped";

export type ListingImportPreviewRow = {
  rowNumber: number;
  status: ListingImportRowStatus;
  reason?: string;
  warnings?: string[];
  data: {
    title: string | null;
    category: string | null;
    price: string | null;
    location: string | null;
  };
};

// ── Parsing helpers ─────────────────────────────────────────────────────────

/** Lowercased, trimmed copy of a header for matching. */
export function normaliseHeader(s: unknown): string {
  return String(s ?? "").trim().toLowerCase();
}

function str(raw: Record<string, unknown>, key: ListingImportColumn): string | null {
  const v = raw[key];
  if (v == null) return null;
  const t = String(v).trim();
  return t.length > 0 ? t : null;
}

/** Parse a numeric cell, tolerating "$", thousands separators and spaces. */
export function parseImportNumber(raw: unknown): { value: number | null; bad: boolean } {
  if (raw == null) return { value: null, bad: false };
  const s = String(raw).trim();
  if (s === "") return { value: null, bad: false };
  const cleaned = s.replace(/[$,\s]/g, "");
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return { value: null, bad: true };
  return { value: n, bad: false };
}

/** "Price on application" detection — otherwise a fixed price. */
export function parsePriceType(raw: unknown): "fixed" | "poa" {
  const s = normaliseHeader(raw);
  if (
    s === "poa" ||
    s.includes("application") ||
    s.includes("enquir") ||
    s.includes("contact") ||
    s.includes("negotiable")
  ) {
    return "poa";
  }
  return "fixed";
}

function formatPriceLabel(row: ListingImportRow): string {
  if (row.price_type === "poa") return "POA";
  if (row.asking_price != null) {
    return new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
      maximumFractionDigits: 0,
    }).format(row.asking_price);
  }
  return "—";
}

/**
 * Normalise a raw mapped row into a `ListingImportRow`. Returns `null` (with a
 * reason) when the row should be skipped — i.e. it has no title.
 */
export function normaliseListingRow(
  raw: Record<string, unknown>,
): { row: ListingImportRow; warnings: string[]; preview: ListingImportPreviewRow["data"] } | { skip: string } {
  const title = str(raw, "title");
  if (!title) return { skip: "Missing title" };
  if (title.length > 200) {
    return { skip: "Title is too long (max 200 characters)" };
  }

  const warnings: string[] = [];
  const asking = parseImportNumber(raw.asking_price);
  const revenue = parseImportNumber(raw.revenue);
  const profit = parseImportNumber(raw.profit);
  if (asking.bad) warnings.push(`Asking price "${String(raw.asking_price)}" isn't a number — left blank`);
  if (revenue.bad) warnings.push(`Revenue "${String(raw.revenue)}" isn't a number — left blank`);
  if (profit.bad) warnings.push(`Profit "${String(raw.profit)}" isn't a number — left blank`);

  // If a price was given but no explicit price_type, treat it as fixed.
  const price_type = raw.price_type != null && String(raw.price_type).trim() !== ""
    ? parsePriceType(raw.price_type)
    : asking.value != null
      ? "fixed"
      : "fixed";

  const row: ListingImportRow = {
    title,
    category: str(raw, "category"),
    price_type,
    asking_price: asking.value,
    revenue: revenue.value,
    profit: profit.value,
    location_text: str(raw, "location_text"),
    suburb: str(raw, "suburb"),
    state: str(raw, "state")?.toUpperCase() ?? null,
    postcode: str(raw, "postcode"),
    region: str(raw, "region"),
    summary: str(raw, "summary"),
    description: str(raw, "description"),
    lease_details: str(raw, "lease_details"),
  };

  return {
    row,
    warnings,
    preview: {
      title: row.title,
      category: row.category,
      price: formatPriceLabel(row),
      location:
        row.location_text ??
        ([row.suburb, row.state].filter(Boolean).join(", ") || null),
    },
  };
}

// ── Column mapping (any-sheet support) ──────────────────────────────────────

export type ColumnMapping = Record<string, number | null>;

export type ListingFieldDef = {
  key: ListingImportColumn;
  label: string;
  required: boolean;
  hint?: string;
};

const FIELD_ALIASES: Record<ListingImportColumn, string[]> = {
  title: ["title", "name", "listing title", "business name", "headline", "business"],
  category: ["category", "industry", "type", "business type", "sector"],
  price_type: ["price type", "price_type", "pricing", "price basis"],
  asking_price: ["asking price", "asking_price", "price", "asking", "sale price", "amount"],
  revenue: ["revenue", "turnover", "sales", "annual revenue", "gross revenue"],
  profit: ["profit", "net profit", "ebitda", "earnings", "net"],
  location_text: ["location", "location_text", "address", "where", "area"],
  suburb: ["suburb", "city", "town", "locality"],
  state: ["state", "region/state", "province"],
  postcode: ["postcode", "post code", "zip", "zip code", "postal code"],
  region: ["region", "metro", "metro area"],
  summary: ["summary", "short description", "tagline", "subtitle", "overview"],
  description: ["description", "details", "full description", "about", "body"],
  lease_details: ["lease", "lease details", "lease_details", "lease info", "tenancy"],
};

export function buildListingFieldDefs(): ListingFieldDef[] {
  return [
    { key: "title", label: "Title", required: true, hint: "Required" },
    { key: "category", label: "Category", required: false, hint: "Matched to an existing category by name" },
    { key: "price_type", label: "Price type", required: false, hint: "fixed or POA" },
    { key: "asking_price", label: "Asking price", required: false },
    { key: "revenue", label: "Revenue", required: false },
    { key: "profit", label: "Profit", required: false },
    { key: "location_text", label: "Location", required: false },
    { key: "suburb", label: "Suburb", required: false },
    { key: "state", label: "State", required: false, hint: "NSW, VIC, QLD…" },
    { key: "postcode", label: "Postcode", required: false },
    { key: "region", label: "Region", required: false },
    { key: "summary", label: "Summary", required: false },
    { key: "description", label: "Description", required: false },
    { key: "lease_details", label: "Lease details", required: false },
  ];
}

export function autoDetectMapping(headers: string[]): ColumnMapping {
  const norm = headers.map((h) => normaliseHeader(h));
  const taken = new Set<number>();
  const mapping: ColumnMapping = {};
  for (const col of LISTING_IMPORT_COLUMNS) {
    let idx: number | null = null;
    for (const alias of FIELD_ALIASES[col]) {
      const i = norm.indexOf(alias);
      if (i >= 0 && !taken.has(i)) {
        idx = i;
        break;
      }
    }
    mapping[col] = idx;
    if (idx !== null) taken.add(idx);
  }
  return mapping;
}

export function buildRawRowFromMapping(
  dataRow: unknown[],
  mapping: ColumnMapping,
): Record<string, unknown> {
  const raw: Record<string, unknown> = {};
  for (const col of LISTING_IMPORT_COLUMNS) {
    const idx = mapping[col];
    if (idx != null && idx >= 0) raw[col] = dataRow[idx];
  }
  return raw;
}

export function unmappedHeaders(headers: string[], mapping: ColumnMapping): string[] {
  const used = new Set<number>();
  for (const v of Object.values(mapping)) {
    if (v != null && v >= 0) used.add(v);
  }
  return headers
    .map((h, i) => (used.has(i) ? null : h))
    .filter((h): h is string => !!h && h.trim().length > 0);
}
