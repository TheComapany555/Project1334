/**
 * Client-side helpers for the bulk listing-import flow (Feature #9).
 * Lives outside lib/actions/ because it imports `xlsx` (a sizeable client-only
 * library) — we never want the server bundle pulling this in.
 */

import * as XLSX from "xlsx";
import type { ParsedFile } from "@/lib/contacts-import-client";
import {
  IMPORT_CHUNK_SIZE,
  LISTING_IMPORT_COLUMNS,
  MAX_IMPORT_ROWS,
  SAMPLE_ROW,
  buildRawRowFromMapping,
  normaliseListingRow,
  type ColumnMapping,
  type ListingImportPreviewRow,
  type ListingImportRow,
} from "@/lib/listings-import";

const TEMPLATE_FILE_NAME = "salebiz-listings-template.xlsx";
const SHEET_NAME = "Listings";

export type { ParsedFile };

/** Trigger a browser download of the listings template `.xlsx`. */
export function downloadListingsTemplate(): void {
  const headerRow: string[] = [...LISTING_IMPORT_COLUMNS];
  const sampleRow = LISTING_IMPORT_COLUMNS.map((c) => SAMPLE_ROW[c]);

  const ws = XLSX.utils.aoa_to_sheet([headerRow, sampleRow]);
  ws["!cols"] = headerRow.map((h) => ({
    wch: h === "description" || h === "summary" || h === "location_text" ? 40 : Math.max(14, h.length + 4),
  }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, SHEET_NAME);
  XLSX.writeFile(wb, TEMPLATE_FILE_NAME);
}

export type ParseFileResult =
  | { ok: true; parsed: ParsedFile }
  | { ok: false; error: string };

/** Parse an uploaded spreadsheet (.xlsx / .csv) into a raw row matrix. */
export async function parseListingsFile(file: File): Promise<ParseFileResult> {
  let workbook: XLSX.WorkBook;
  try {
    const buffer = await file.arrayBuffer();
    workbook = XLSX.read(buffer, { type: "array" });
  } catch {
    return { ok: false, error: "Couldn't read that file. Upload a valid .xlsx or .csv spreadsheet." };
  }

  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) return { ok: false, error: "The file doesn't have any sheets." };
  const sheet = workbook.Sheets[firstSheetName];

  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    blankrows: false,
    raw: false,
    defval: "",
  });
  if (matrix.length === 0) return { ok: false, error: "The file is empty." };

  const rawHeaders = (matrix[0] ?? []).map((c) => String(c ?? "").trim());
  let lastNonEmpty = -1;
  rawHeaders.forEach((h, i) => {
    if (h.length > 0) lastNonEmpty = i;
  });
  const headers = rawHeaders.slice(0, lastNonEmpty + 1);
  if (headers.length === 0) {
    return { ok: false, error: "The first row looks blank — add column headers and re-upload." };
  }

  let dataRows = matrix.slice(1).map((row) => (Array.isArray(row) ? row.slice(0, headers.length) : []));
  dataRows = dataRows.filter((row) => row.some((v) => v != null && String(v).trim() !== ""));
  if (dataRows.length === 0) {
    return { ok: false, error: "The file has headers but no data rows. Add at least one listing and re-upload." };
  }

  let truncated = false;
  if (dataRows.length > MAX_IMPORT_ROWS) {
    dataRows = dataRows.slice(0, MAX_IMPORT_ROWS);
    truncated = true;
  }

  return { ok: true, parsed: { headers, dataRows, truncated } };
}

export type NormalizeResult = {
  rows: ListingImportRow[];
  preview: ListingImportPreviewRow[];
};

/** Apply a confirmed mapping to a parsed file → clean rows + per-row preview. */
export function normalizeListings(parsed: ParsedFile, mapping: ColumnMapping): NormalizeResult {
  const rows: ListingImportRow[] = [];
  const preview: ListingImportPreviewRow[] = [];

  parsed.dataRows.forEach((rowArr, i) => {
    const rowNumber = i + 2; // row 1 is the header
    const rawRow = buildRawRowFromMapping(rowArr, mapping);

    const allEmpty = Object.values(rawRow).every((v) => v == null || String(v).trim() === "");
    if (allEmpty) return;

    const result = normaliseListingRow(rawRow);
    if ("skip" in result) {
      preview.push({
        rowNumber,
        status: "skipped",
        reason: result.skip,
        data: {
          title: rawRow.title ? String(rawRow.title) : null,
          category: null,
          price: null,
          location: null,
        },
      });
      return;
    }
    rows.push(result.row);
    preview.push({
      rowNumber,
      status: "ready",
      warnings: result.warnings.length ? result.warnings : undefined,
      data: result.preview,
    });
  });

  return { rows, preview };
}

/** Split rows into chunks for progressive server-side import. */
export function* chunkRows(rows: ListingImportRow[]): Generator<ListingImportRow[]> {
  for (let i = 0; i < rows.length; i += IMPORT_CHUNK_SIZE) {
    yield rows.slice(i, i + IMPORT_CHUNK_SIZE);
  }
}

export { MAX_IMPORT_ROWS };
