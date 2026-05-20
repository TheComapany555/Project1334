/**
 * Client-side helpers for the contact-import flow.
 *
 * Responsibilities:
 *   1. Generate the downloadable sample file (xlsx) so the broker has a
 *      reference shape and a zero-friction path when starting from scratch.
 *   2. Parse an uploaded file (xlsx or csv) into raw `{ headers, dataRows }`.
 *      We do NOT validate against a fixed template here — the dialog runs a
 *      column-mapping step against whatever shape the broker uploads.
 *   3. Normalise a parsed file + a column mapping into the clean
 *      `ContactImportRow[]` payload + a preview the UI renders.
 *   4. Chunk the payload so the dialog can call the server action repeatedly
 *      with a progress bar instead of one giant blocking call.
 *
 * Lives outside of `lib/actions/` because it imports `xlsx` (a sizeable
 * client-only library) — we never want the server bundle pulling this in.
 */

import * as XLSX from "xlsx";
import {
  IMPORT_CHUNK_SIZE,
  IMPORT_TEMPLATE_COLUMNS,
  MAX_IMPORT_ROWS,
  SAMPLE_ROW,
  buildRawRowFromMapping,
  normaliseRow,
  parseConsent,
  parseTags,
  type ColumnMapping,
  type ContactImportRow,
  type ImportColumn,
  type ImportCustomField,
  type ImportPreviewRow,
} from "@/lib/contacts-import-template";

const TEMPLATE_FILE_NAME = "salebiz-contacts-template.xlsx";
const SHEET_NAME = "Contacts";

/**
 * Build a plausible sample value for a custom field so the broker can see
 * what format we expect for each type.
 */
function sampleForCustomField(field: ImportCustomField): string {
  switch (field.field_type) {
    case "text":
      return "Example value";
    case "number":
      return "1000";
    case "boolean":
      return "yes";
    case "select":
      return field.options?.[0]?.label ?? "Option A";
    case "date":
      return "2026-05-20";
  }
}

/**
 * Trigger a browser download of the template `.xlsx` file.
 *
 * The template is one of several entry points — brokers can also upload
 * any spreadsheet shape and map columns in the dialog. The template just
 * gives them a zero-mapping happy path.
 */
export function downloadContactsTemplate(
  customFields: ImportCustomField[] = [],
): void {
  const standardHeaders: string[] = [...IMPORT_TEMPLATE_COLUMNS];
  const customHeaders = customFields.map((f) => f.label || f.key);
  const headerRow = [...standardHeaders, ...customHeaders];

  const sampleStandard: string[] = IMPORT_TEMPLATE_COLUMNS.map(
    (c) => SAMPLE_ROW[c],
  );
  const sampleCustom = customFields.map((f) => sampleForCustomField(f));
  const sampleRow = [...sampleStandard, ...sampleCustom];

  const ws = XLSX.utils.aoa_to_sheet([headerRow, sampleRow]);
  ws["!cols"] = headerRow.map((h) => ({
    wch:
      h === "notes" || h === "interest" || h.length > 24
        ? 36
        : Math.max(16, h.length + 4),
  }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, SHEET_NAME);
  XLSX.writeFile(wb, TEMPLATE_FILE_NAME);
}

/** Output of `parseContactsFile` — raw spreadsheet shape, pre-mapping. */
export type ParsedFile = {
  /** Header row, original text + order (cleaned of `null`/`undefined`). */
  headers: string[];
  /** Up to `MAX_IMPORT_ROWS` data rows; same column order as `headers`. */
  dataRows: unknown[][];
  /** True if we trimmed rows beyond `MAX_IMPORT_ROWS`. */
  truncated: boolean;
};

export type ParseFileResult =
  | { ok: true; parsed: ParsedFile }
  | { ok: false; error: string };

/**
 * Parse an uploaded spreadsheet (.xlsx / .csv) into a raw row matrix.
 *
 * Intentionally does NOT validate against a template — the dialog runs a
 * column-mapping step next. Trailing blank rows are dropped; row order is
 * preserved so the preview's `Row N` matches the broker's spreadsheet.
 */
export async function parseContactsFile(file: File): Promise<ParseFileResult> {
  let workbook: XLSX.WorkBook;
  try {
    const buffer = await file.arrayBuffer();
    workbook = XLSX.read(buffer, { type: "array" });
  } catch {
    return {
      ok: false,
      error:
        "Couldn't read that file. Upload a valid .xlsx or .csv spreadsheet.",
    };
  }

  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    return { ok: false, error: "The file doesn't have any sheets." };
  }
  const sheet = workbook.Sheets[firstSheetName];

  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    blankrows: false,
    raw: false,
    defval: "",
  });

  if (matrix.length === 0) {
    return { ok: false, error: "The file is empty." };
  }

  const rawHeaders = (matrix[0] ?? []).map((c) => String(c ?? "").trim());
  // Drop trailing empty header cells so we don't render columns for them.
  let lastNonEmpty = -1;
  rawHeaders.forEach((h, i) => {
    if (h.length > 0) lastNonEmpty = i;
  });
  const headers = rawHeaders.slice(0, lastNonEmpty + 1);

  if (headers.length === 0) {
    return {
      ok: false,
      error: "The first row of the sheet looks blank — add column headers and re-upload.",
    };
  }

  let dataRows = matrix.slice(1).map((row) =>
    Array.isArray(row) ? row.slice(0, headers.length) : [],
  );
  // Drop trailing rows where every mapped cell is blank.
  dataRows = dataRows.filter((row) =>
    row.some((v) => v != null && String(v).trim() !== ""),
  );

  if (dataRows.length === 0) {
    return {
      ok: false,
      error:
        "The file has headers but no data rows. Add at least one contact and re-upload.",
    };
  }

  let truncated = false;
  if (dataRows.length > MAX_IMPORT_ROWS) {
    dataRows = dataRows.slice(0, MAX_IMPORT_ROWS);
    truncated = true;
  }

  return { ok: true, parsed: { headers, dataRows, truncated } };
}

export type NormalizeResult = {
  rows: ContactImportRow[];
  preview: ImportPreviewRow[];
};

/**
 * Apply a broker-confirmed column mapping to a parsed file and produce:
 *   - `rows`     — clean payload ready to send to the server.
 *   - `preview`  — per-row UI verdicts (new / update / skipped + warnings).
 *
 * Duplicates *within the file* (same email twice) are resolved last-wins
 * with a reason on the earlier row, matching the previous strict-template
 * behaviour. Email-less / invalid-email rows are skipped.
 */
export function normalizeContacts(
  parsed: ParsedFile,
  mapping: ColumnMapping,
  customFields: ImportCustomField[],
  existingEmails: Set<string>,
): NormalizeResult {
  const rows: ContactImportRow[] = [];
  const preview: ImportPreviewRow[] = [];
  const seenInFile = new Map<string, number>();

  parsed.dataRows.forEach((rowArr, i) => {
    // +2 because row 1 is the header in spreadsheet land
    const rowNumber = i + 2;

    const rawRow = buildRawRowFromMapping(rowArr, mapping, customFields);

    // Skip silent blank rows (the broker may have left holes in their export).
    const allEmpty = Object.values(rawRow).every(
      (v) => v == null || String(v).trim() === "",
    );
    if (allEmpty) return;

    const normalised = normaliseRow(rawRow, customFields);
    if (!normalised) {
      preview.push({
        rowNumber,
        status: "skipped",
        reason: "Missing or invalid email",
        data: {
          email: rawRow.email ? String(rawRow.email) : null,
        },
      });
      return;
    }
    const { row, warnings } = normalised;
    const cfCount = Object.keys(row.custom_fields).length;

    const seenAt = seenInFile.get(row.email);
    if (seenAt) {
      preview.push({
        rowNumber,
        status: existingEmails.has(row.email) ? "update" : "new",
        reason: `Replaces earlier row ${seenAt} (same email)`,
        data: {
          ...standardPreviewData(row),
          custom_field_count: cfCount,
          custom_field_warnings: warnings.length ? warnings : undefined,
        },
      });
      const earlierIdx = rows.findIndex((r) => r.email === row.email);
      if (earlierIdx >= 0) rows[earlierIdx] = row;
      else rows.push(row);
      seenInFile.set(row.email, rowNumber);
      return;
    }
    seenInFile.set(row.email, rowNumber);

    rows.push(row);
    preview.push({
      rowNumber,
      status: existingEmails.has(row.email) ? "update" : "new",
      data: {
        ...standardPreviewData(row),
        custom_field_count: cfCount,
        custom_field_warnings: warnings.length ? warnings : undefined,
      },
    });
  });

  return { rows, preview };
}

function standardPreviewData(row: ContactImportRow) {
  return {
    email: row.email,
    name: row.name,
    phone: row.phone,
    company: row.company,
    interest: row.interest,
    notes: row.notes,
    tags: row.tags,
    consent_marketing: row.consent_marketing,
  };
}

/**
 * Split the rows payload into chunks for progressive server-side import.
 * Yields slices the dialog can send one at a time, updating its progress
 * bar as each chunk's promise resolves.
 */
export function* chunkRows(
  rows: ContactImportRow[],
): Generator<ContactImportRow[]> {
  for (let i = 0; i < rows.length; i += IMPORT_CHUNK_SIZE) {
    yield rows.slice(i, i + IMPORT_CHUNK_SIZE);
  }
}

/** Convenience: number-formatted row counts for the summary line. */
export function summariseRows(rows: ContactImportRow[]) {
  return {
    total: rows.length,
    withTags: rows.filter((r) => r.tags.length > 0).length,
    withConsent: rows.filter((r) => r.consent_marketing).length,
    withCustomFields: rows.filter(
      (r) => Object.keys(r.custom_fields).length > 0,
    ).length,
  };
}

export { parseConsent, parseTags };

// Re-export from template so the dialog only has one import line.
export {
  IMPORT_CHUNK_SIZE,
  IMPORT_TEMPLATE_COLUMNS,
  MAX_IMPORT_ROWS,
  type ImportColumn,
};
