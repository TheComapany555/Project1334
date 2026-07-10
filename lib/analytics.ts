"use client";

import { sendGAEvent } from "@next/third-parties/google";

/**
 * Send a custom GA4 event from client components, e.g.
 * `trackEvent("enquiry_submitted", { listing_id: id })`.
 * No-ops when analytics is not configured (dev / preview without the env var).
 */
export function trackEvent(
  name: string,
  params?: Record<string, string | number | boolean>
) {
  if (!process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID) return;
  sendGAEvent("event", name, params ?? {});
}
