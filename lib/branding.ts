import { getSiteUrl } from "@/lib/site-url";

/** Salebiz brand logo (SVG) — Vercel Blob; use for headers, sidebars, favicon metadata */
export const SALEBIZ_LOGO_URL =
  "https://g44yi0ry58orcc8h.public.blob.vercel-storage.com/SaleBiz%20logo%202%20SVG.svg";

/**
 * Raster logo for EMAIL ONLY.
 *
 * Gmail, Outlook and Apple Mail all refuse to render `image/svg+xml` in a
 * message body, so {@link SALEBIZ_LOGO_URL} shows as a broken image there.
 * Email clients need PNG/JPEG/GIF. Served from our own origin so the asset
 * lives with the app and stays under our control.
 *
 * Absolute by necessity: a mail client has no page to resolve a relative URL
 * against. In local dev this points at localhost, so the logo will not load in
 * a real inbox until the app is deployed — that is expected, not a bug.
 */
export const SALEBIZ_EMAIL_LOGO_URL = `${getSiteUrl()}/Salebiz.png`;

/** Intrinsic size of Salebiz.png, used to reserve space and avoid reflow. */
export const SALEBIZ_EMAIL_LOGO_ASPECT = 2891 / 357;
