/**
 * Shared definition of the contact-import flow.
 *
 * Both the client (`ImportContactsDialog` — generates the sample file +
 * parses uploaded files + drives the column-mapping UI) and the server
 * (`importContacts` action) consume this so the field schema can't drift
 * between the two.
 *
 * Sheet policy: we accept *any* spreadsheet shape. The broker picks which
 * uploaded column maps to which CRM field via a mapping step. The standard
 * template is still offered as a one-click download — uploads that already
 * match the template are auto-mapped end-to-end. Rows missing `email`
 * (or whose mapped email cell is invalid) are skipped.
 */

export const IMPORT_TEMPLATE_COLUMNS = [
  "name",
  "email",
  "phone",
  "company",
  "interest",
  "notes",
  "tags",
  "consent_marketing",
] as const;

export type ImportColumn = (typeof IMPORT_TEMPLATE_COLUMNS)[number];

/** Hard cap so a runaway file can't dump 100k rows into the DB. */
export const MAX_IMPORT_ROWS = 5000;

/**
 * Rows sent to the server per chunk. Splitting the upload into chunks gives
 * the broker a progress bar and keeps each server call short enough that
 * Vercel's function-timeout window is never a concern.
 */
export const IMPORT_CHUNK_SIZE = 500;

/** Realistic example shown in the downloadable sample file. */
export const SAMPLE_ROW: Record<ImportColumn, string> = {
  name: "Jane Smith",
  email: "jane.smith@example.com",
  phone: "0412 345 678",
  company: "Smith Holdings Pty Ltd",
  interest: "Cafe in Sydney under $400k",
  notes: "Met at trade show, finance pre-approved",
  tags: "hot lead, finance ready",
  consent_marketing: "yes",
};

/** A custom field as the import flow needs to know it (subset of CrmCustomField). */
export type ImportCustomField = {
  id: string;
  key: string;
  label: string;
  field_type: "text" | "number" | "boolean" | "select" | "date";
  /** For `field_type = 'select'`. */
  options?: { value: string; label: string }[] | null;
};

/** Shape sent from the client to the server after parsing/normalising. */
export type ContactImportRow = {
  name: string | null;
  email: string;
  phone: string | null;
  company: string | null;
  interest: string | null;
  notes: string | null;
  tags: string[];
  consent_marketing: boolean;
  /**
   * Map of custom-field id → JSON-friendly value (string for text/select/date,
   * number for number, boolean for boolean). Omitted keys mean the broker
   * left that cell blank (no upsert for that field).
   */
  custom_fields: Record<string, string | number | boolean>;
};

/** Per-row preview verdict shown to the broker before commit. */
export type ImportRowStatus = "new" | "update" | "skipped";

export type ImportPreviewRow = {
  rowNumber: number;
  status: ImportRowStatus;
  reason?: string;
  data: {
    email?: string | null;
    name?: string | null;
    phone?: string | null;
    company?: string | null;
    interest?: string | null;
    notes?: string | null;
    tags?: string[];
    consent_marketing?: boolean;
    /** Count of custom-field cells the broker filled in (for the preview chip). */
    custom_field_count?: number;
    /** Per-field warnings (e.g. select value didn't match any option). */
    custom_field_warnings?: string[];
  };
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Truthy-ish parsing for boolean cells (consent + custom booleans). */
export function parseConsent(raw: unknown): boolean {
  if (raw === true) return true;
  if (raw === false) return false;
  if (raw == null) return false;
  const s = String(raw).trim().toLowerCase();
  return s === "yes" || s === "y" || s === "true" || s === "1";
}

/** Split + clean a tags cell. */
export function parseTags(raw: unknown): string[] {
  if (!raw) return [];
  const s = String(raw);
  return [
    ...new Set(
      s
        .split(/[,;\n]/)
        .map((t) => t.trim())
        .filter(Boolean),
    ),
  ];
}

/** Lowercased, trimmed copy of a header for matching. */
export function normaliseHeader(s: unknown): string {
  return String(s ?? "").trim().toLowerCase();
}

/**
 * The header label we expose to the broker for a custom field. We prefer
 * the human-friendly label but fall back to the machine key, both
 * lowercased so header matching is case-insensitive.
 */
export function customFieldKey(field: ImportCustomField): string {
  return normaliseHeader(field.label || field.key);
}

/**
 * Parse a single custom-field cell into the right JSON type. Returns
 * `{ value, warning? }`. Empty cell → value=null (skip-this-field).
 */
export function parseCustomFieldValue(
  raw: unknown,
  field: ImportCustomField,
): { value: string | number | boolean | null; warning?: string } {
  if (raw == null) return { value: null };
  const s = String(raw).trim();
  if (s === "") return { value: null };

  switch (field.field_type) {
    case "text":
      return { value: s };
    case "number": {
      const n = Number(s.replace(/,/g, ""));
      if (!Number.isFinite(n)) {
        return {
          value: null,
          warning: `"${field.label}": "${s}" isn't a number`,
        };
      }
      return { value: n };
    }
    case "boolean":
      return { value: parseConsent(s) };
    case "select": {
      const opts = field.options ?? [];
      const lower = s.toLowerCase();
      const hit = opts.find(
        (o) =>
          o.value.toLowerCase() === lower || o.label.toLowerCase() === lower,
      );
      if (!hit) {
        return {
          value: null,
          warning: `"${field.label}": "${s}" isn't one of [${opts
            .map((o) => o.label)
            .join(", ")}]`,
        };
      }
      return { value: hit.value };
    }
    case "date": {
      // Accept ISO (2026-05-20) or AU DD/MM/YYYY.
      let iso: string | null = null;
      if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
        const d = new Date(s);
        if (!Number.isNaN(d.getTime())) iso = d.toISOString().slice(0, 10);
      } else {
        const m = /^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/.exec(s);
        if (m) {
          const [, dd, mm, yy] = m;
          const yyyy = yy.length === 2 ? 2000 + Number(yy) : Number(yy);
          const d = new Date(yyyy, Number(mm) - 1, Number(dd));
          if (!Number.isNaN(d.getTime())) iso = d.toISOString().slice(0, 10);
        }
      }
      if (!iso) {
        return {
          value: null,
          warning: `"${field.label}": "${s}" isn't a date (use YYYY-MM-DD or DD/MM/YYYY)`,
        };
      }
      return { value: iso };
    }
  }
}

/**
 * Normalise one raw row (header → cell map) into a `ContactImportRow`.
 * Returns `null` if the row should be skipped (no/invalid email),
 * otherwise the row plus any per-row warnings to surface in the preview.
 */
export function normaliseRow(
  raw: Record<string, unknown>,
  customFields: ImportCustomField[] = [],
): { row: ContactImportRow; warnings: string[] } | null {
  const email = String(raw.email ?? "").trim().toLowerCase();
  if (!email || !EMAIL_RE.test(email)) return null;

  const str = (k: ImportColumn): string | null => {
    const v = raw[k];
    if (v == null) return null;
    const t = String(v).trim();
    return t.length > 0 ? t : null;
  };

  const customFieldValues: Record<string, string | number | boolean> = {};
  const warnings: string[] = [];
  for (const f of customFields) {
    const key = customFieldKey(f);
    const cell = raw[key];
    const { value, warning } = parseCustomFieldValue(cell, f);
    if (value !== null) customFieldValues[f.id] = value;
    if (warning) warnings.push(warning);
  }

  const row: ContactImportRow = {
    name: str("name"),
    email,
    phone: str("phone"),
    company: str("company"),
    interest: str("interest"),
    notes: str("notes"),
    tags: parseTags(raw.tags),
    consent_marketing: parseConsent(raw.consent_marketing),
    custom_fields: customFieldValues,
  };

  return { row, warnings };
}

// ─── Flexible column mapping (any-sheet support) ───────────────────────────

/**
 * The set of "fields" a broker can map a spreadsheet column into. Standard
 * fields share their column name; custom fields use a `cf:<id>` prefix.
 */
export type MappingFieldKey = ImportColumn | `cf:${string}`;

/**
 * The mapping itself: field-key → zero-based column index in the uploaded
 * sheet, or `null` if the broker chose to skip that field.
 */
export type ColumnMapping = Record<string, number | null>;

/** UI-friendly description of a target field shown in the mapping step. */
export type FieldDef = {
  /** Stable key — same key used in the `ColumnMapping`. */
  key: MappingFieldKey;
  /** Header shown to the broker (e.g. "Email", "City (Custom)"). */
  label: string;
  /** True for fields without which we can't import the row. Email only. */
  required: boolean;
  /** Optional hint shown under the field label. */
  hint?: string;
  /** Present iff `key` is a `cf:` custom-field key. */
  customField?: ImportCustomField;
};

/**
 * Synonyms we try when auto-mapping uploaded headers to standard fields.
 * Aliases are matched case-insensitively against trimmed header text.
 * Order matters: earlier aliases take priority.
 */
const FIELD_ALIASES: Record<ImportColumn, string[]> = {
  name: [
    "name",
    "full name",
    "contact name",
    "lead name",
    "customer name",
    "client name",
    "buyer name",
    "first name",
  ],
  email: [
    "email",
    "email address",
    "e-mail",
    "e-mail address",
    "mail",
    "primary email",
    "work email",
  ],
  phone: [
    "phone",
    "phone number",
    "mobile",
    "mobile number",
    "mobile phone",
    "tel",
    "telephone",
    "cell",
    "cell phone",
    "contact number",
    "work phone",
  ],
  company: [
    "company",
    "company name",
    "organization",
    "organisation",
    "business",
    "business name",
    "employer",
    "account",
    "account name",
  ],
  interest: [
    "interest",
    "lead interest",
    "looking for",
    "interested in",
    "buying interest",
    "industry interest",
  ],
  notes: [
    "notes",
    "comments",
    "description",
    "lead notes",
    "details",
    "remarks",
    "memo",
  ],
  tags: [
    "tags",
    "labels",
    "categories",
    "category",
    "segments",
    "lists",
  ],
  consent_marketing: [
    "consent",
    "consent marketing",
    "consent_marketing",
    "marketing consent",
    "opt-in",
    "opt in",
    "opted in",
    "opted-in",
    "subscribed",
    "subscribe",
    "email opt-in",
    "newsletter",
  ],
};

/** Build the list of fields the broker maps columns into, in display order. */
export function buildFieldDefs(
  customFields: ImportCustomField[] = [],
): FieldDef[] {
  const standard: FieldDef[] = [
    { key: "email", label: "Email", required: true, hint: "Required" },
    { key: "name", label: "Name", required: false },
    { key: "phone", label: "Phone", required: false },
    { key: "company", label: "Company", required: false },
    { key: "interest", label: "Interest", required: false },
    { key: "notes", label: "Notes", required: false },
    {
      key: "tags",
      label: "Tags",
      required: false,
      hint: "Comma- or semicolon-separated",
    },
    {
      key: "consent_marketing",
      label: "Marketing consent",
      required: false,
      hint: "Truthy: yes / true / 1",
    },
  ];
  const custom: FieldDef[] = customFields.map((f) => ({
    key: `cf:${f.id}` as const,
    label: f.label || f.key,
    required: false,
    hint: `Custom · ${f.field_type}`,
    customField: f,
  }));
  return [...standard, ...custom];
}

/**
 * Try to figure out a sensible default mapping from the uploaded headers
 * alone. Standard fields match against `FIELD_ALIASES`; custom fields match
 * against the field's label first, then its machine key. Any field we can't
 * confidently match is left as `null` (skipped) — the broker can fix it in
 * the mapping UI.
 */
export function autoDetectMapping(
  headers: string[],
  customFields: ImportCustomField[] = [],
): ColumnMapping {
  const norm = headers.map((h) => normaliseHeader(h));
  const taken = new Set<number>();
  const mapping: ColumnMapping = {};

  const findIndex = (candidates: string[]): number | null => {
    for (const c of candidates) {
      const idx = norm.indexOf(c);
      if (idx >= 0 && !taken.has(idx)) return idx;
    }
    return null;
  };

  for (const col of IMPORT_TEMPLATE_COLUMNS) {
    const idx = findIndex(FIELD_ALIASES[col]);
    mapping[col] = idx;
    if (idx !== null) taken.add(idx);
  }

  for (const cf of customFields) {
    const candidates = [normaliseHeader(cf.label), normaliseHeader(cf.key)]
      .filter(Boolean);
    const idx = findIndex(candidates);
    mapping[`cf:${cf.id}`] = idx;
    if (idx !== null) taken.add(idx);
  }

  return mapping;
}

/**
 * Turn a single raw row + mapping into the same `{ raw: header→cell }` shape
 * that `normaliseRow` already understands, so the rest of the parse pipeline
 * is unchanged. Custom-field cells are stored under the same `customFieldKey`
 * keys that `normaliseRow` looks for.
 */
export function buildRawRowFromMapping(
  dataRow: unknown[],
  mapping: ColumnMapping,
  customFields: ImportCustomField[] = [],
): Record<string, unknown> {
  const raw: Record<string, unknown> = {};
  for (const col of IMPORT_TEMPLATE_COLUMNS) {
    const idx = mapping[col];
    if (idx != null && idx >= 0) raw[col] = dataRow[idx];
  }
  for (const cf of customFields) {
    const idx = mapping[`cf:${cf.id}`];
    if (idx != null && idx >= 0) raw[customFieldKey(cf)] = dataRow[idx];
  }
  return raw;
}

/** Which headers from the upload are still unmapped (preview helper). */
export function unmappedHeaders(
  headers: string[],
  mapping: ColumnMapping,
): string[] {
  const usedIdx = new Set<number>();
  for (const v of Object.values(mapping)) {
    if (v != null && v >= 0) usedIdx.add(v);
  }
  return headers.map((h, i) => (usedIdx.has(i) ? null : h)).filter(
    (h): h is string => !!h && h.trim().length > 0,
  );
}
