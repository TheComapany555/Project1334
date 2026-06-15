/**
 * Fetch a remote image by URL, optimise it, store it in the listing-images
 * bucket, and insert a `listing_images` row. Server-only.
 *
 * Used by the REAXML importer (and reusable by the future Agentbox/Reapit
 * integration) to re-host external image URLs rather than hot-linking them.
 *
 * Safety: only http(s); blocks obvious private/loopback hosts (basic SSRF
 * guard — DNS-rebinding is out of scope); caps size; times out; never throws.
 */

import { createServiceRoleClient } from "@/lib/supabase/admin";
import { optimizeImage } from "@/lib/image-optimizer";

const BUCKET = "listing-images";
const MAX_BYTES = 10 * 1024 * 1024; // 10MB
const FETCH_TIMEOUT_MS = 15_000;
const OPTIMIZED_MAX_WIDTH = 1600;
const OPTIMIZED_QUALITY = 80;

/** Reject loopback / link-local / RFC-1918 literal hosts. */
function isBlockedHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (host === "localhost" || host === "0.0.0.0" || host === "::1" || host.endsWith(".local")) {
    return true;
  }
  if (/^(10|127)\./.test(host)) return true;
  if (/^192\.168\./.test(host)) return true;
  if (/^169\.254\./.test(host)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(host)) return true;
  return false;
}

export type StoreImageResult = { ok: true; url: string } | { ok: false; error: string };

export async function fetchAndStoreListingImage(
  listingId: string,
  rawUrl: string,
  sortOrder: number,
): Promise<StoreImageResult> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return { ok: false, error: "Invalid URL" };
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { ok: false, error: "Unsupported URL scheme" };
  }
  if (isBlockedHost(parsed.hostname)) {
    return { ok: false, error: "Blocked host" };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(parsed.toString(), {
      signal: controller.signal,
      redirect: "follow",
    });
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };

    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.startsWith("image/")) return { ok: false, error: "Not an image" };
    const declaredLen = Number(res.headers.get("content-length") ?? "0");
    if (declaredLen && declaredLen > MAX_BYTES) return { ok: false, error: "Image too large" };

    const arrayBuffer = await res.arrayBuffer();
    if (arrayBuffer.byteLength > MAX_BYTES) return { ok: false, error: "Image too large" };

    const { buffer, contentType: outType } = await optimizeImage(Buffer.from(arrayBuffer), {
      maxWidth: OPTIMIZED_MAX_WIDTH,
      quality: OPTIMIZED_QUALITY,
    });

    const supabase = createServiceRoleClient();
    const path = `${listingId}/${Date.now()}-${sortOrder}.jpg`;
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, buffer, { contentType: outType, upsert: false });
    if (uploadError) return { ok: false, error: uploadError.message };

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    const publicUrl = data.publicUrl;
    const { error: insertError } = await supabase
      .from("listing_images")
      .insert({ listing_id: listingId, url: publicUrl, sort_order: sortOrder });
    if (insertError) return { ok: false, error: insertError.message };

    return { ok: true, url: publicUrl };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Image fetch failed" };
  } finally {
    clearTimeout(timer);
  }
}
