/**
 * Shared (non-"use server") constants + types for the REAXML import flow.
 *
 * These live outside lib/actions/reaxml-import.ts because a "use server" module
 * may only export async functions — constants and types must be imported from a
 * plain module like this one (consumed by both the action and the client UI).
 */

/** Listings processed per import call. Small because each may fetch images. */
export const REAXML_IMPORT_CHUNK = 20;

export type ReaxmlPreviewRow = {
  index: number;
  status: "ready" | "skip";
  reason?: string;
  warnings: string[];
  title: string | null;
  category: string | null;
  subcategory: string | null;
  price: string;
  statusLabel: string;
  images: number;
};

export type ReaxmlPreviewResult =
  | {
      ok: true;
      total: number;
      readyCount: number;
      skippedCount: number;
      preview: ReaxmlPreviewRow[];
    }
  | { ok: false; error: string };

export type ImportReaxmlResult =
  | {
      ok: true;
      created: number;
      updated: number;
      skipped: number;
      imagesAdded: number;
      imageFailures: number;
    }
  | { ok: false; error: string };
