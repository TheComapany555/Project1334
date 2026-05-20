import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";

/**
 * Email open-tracking pixel.
 *
 * `sendCrmEmail` embeds <img src="…/api/track/email/open?t=<token>"> in the
 * outbound HTML. When the buyer's mail client fetches the image, this route:
 *   1. Looks up the matching `crm_activities` row by tracking_token.
 *   2. Stamps `opened_at` once (first-open wins) and bumps `open_count`.
 *   3. Returns a 1×1 transparent GIF with `Cache-Control: no-store` so
 *      proxies don't serve a cached version and miss subsequent re-opens.
 *
 * No auth: the request comes from the buyer's mail client over the open
 * internet. The token is the only credential — opaque, unguessable, and
 * scoped to a single email.
 *
 * Caveats brokers should know about (we surface this in the UI):
 *   - Many spam filters pre-load images server-side, producing false positives.
 *   - Privacy-respecting clients (Apple Mail Privacy Protection, Gmail's
 *     image proxy) may show "opened" even when the human hasn't read it.
 */

// 1×1 transparent GIF (43 bytes).
const PIXEL = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64",
);

function pixelResponse() {
  return new NextResponse(new Uint8Array(PIXEL), {
    status: 200,
    headers: {
      "Content-Type": "image/gif",
      "Content-Length": PIXEL.length.toString(),
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}

export async function GET(request: Request) {
  // Always serve the pixel — even on errors — so we never reveal the result
  // back to the buyer's client and never block the email's render.
  try {
    const url = new URL(request.url);
    const token = url.searchParams.get("t")?.trim();
    if (!token || token.length > 64) return pixelResponse();

    const supabase = createServiceRoleClient();
    // First-open wins: only stamp `opened_at` if it's still NULL. Bump
    // `open_count` on every fetch so brokers can spot re-engagement.
    const { data: existing } = await supabase
      .from("crm_activities")
      .select("id, opened_at, open_count")
      .eq("tracking_token", token)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("crm_activities")
        .update({
          opened_at: existing.opened_at ?? new Date().toISOString(),
          open_count: (existing.open_count ?? 0) + 1,
        })
        .eq("id", existing.id);
    }
  } catch (err) {
    // Never let an error bubble — buyer's client just sees the pixel.
    console.error("[track/email/open] error:", err);
  }
  return pixelResponse();
}
