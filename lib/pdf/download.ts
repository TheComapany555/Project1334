// Client-only helper: render a PDF Document and trigger a browser download.
// `@react-pdf/renderer` ships with a `pdf()` factory that streams to a Blob
// in the browser without a server round-trip.

import { pdf, type DocumentProps } from "@react-pdf/renderer";

/**
 * Renders the given React-PDF document to a Blob and triggers a download.
 * Returns the resulting file name so the caller can surface it in a toast.
 */
export async function downloadPdf(
  document: React.ReactElement<DocumentProps>,
  filename: string,
): Promise<string> {
  const blob = await pdf(document).toBlob();
  const url = URL.createObjectURL(blob);
  try {
    const a = window.document.createElement("a");
    a.href = url;
    a.download = filename;
    window.document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    // Defer revoke so the click handler has time to fetch the blob.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return filename;
}

/** Build a safe-for-filesystem PDF filename. */
export function pdfFilename(parts: { title: string; subject?: string; suffix?: string }): string {
  const slug = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60);
  const date = new Date().toISOString().slice(0, 10);
  const segments = [slug(parts.title), parts.subject ? slug(parts.subject) : null, parts.suffix ?? date]
    .filter(Boolean)
    .join("_");
  return `${segments}.pdf`;
}
