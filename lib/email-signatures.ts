// Feature #4: server-side resolver — loads broker + agency data and renders
// the final signature HTML. The pure render helpers live in
// `lib/email-signatures-render.ts` (client-safe). This module adds the DB
// loading layer and the high-level `getBrokerSignature` consumed at every
// outbound-email call site.

import { createServiceRoleClient } from "@/lib/supabase/admin";
import {
  buildAutoSignatureHtml,
  buildAutoSignatureText,
  sanitizeCustomSignatureHtml,
  stripHtmlForText,
  type BrokerSignatureContext,
} from "@/lib/email-signatures-render";

// Re-export pure helpers so existing call sites that import from
// `@/lib/email-signatures` keep working unchanged.
export {
  buildAutoSignatureHtml,
  appendSignatureToHtml,
  appendSignatureToText,
  escapeHtml,
  sanitizeCustomSignatureHtml,
  type BrokerSignatureInput,
  type BrokerSignatureContext,
} from "@/lib/email-signatures-render";

const APP_URL = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

/**
 * Load every piece of profile + agency data needed to render a signature.
 * Returns `null` when the broker profile doesn't exist. Does NOT apply the
 * `signature_enabled` or `signature_html` overrides — callers decide that.
 */
export async function loadBrokerSignatureContext(
  brokerId: string,
): Promise<BrokerSignatureContext | null> {
  const supabase = createServiceRoleClient();

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select(
      "name, phone, email_public, slug, photo_url, social_links, agency_id, signature_title, signature_html, signature_enabled",
    )
    .eq("id", brokerId)
    .maybeSingle();
  if (profileError) {
    // Don't fail the email send over a missing signature — but log loudly.
    // The most common cause is the signature columns not existing yet
    // (signature_title / signature_html / signature_enabled), i.e. migration
    // 20260530000001_email_signatures.sql has not been applied to this DB.
    console.error(
      `[email-signature] Failed to load profile ${brokerId}: ${profileError.message}. ` +
        "If a signature_* column is missing, apply migration 20260530000001_email_signatures.sql.",
    );
    return null;
  }
  if (!profile) return null;

  const { data: user } = await supabase
    .from("users")
    .select("email")
    .eq("id", brokerId)
    .maybeSingle();

  type AgencyRow = {
    name: string | null;
    logo_url: string | null;
    website: string | null;
    social_links: Record<string, string | undefined> | null;
    signature_disclaimer: string | null;
  };
  let agency: AgencyRow | null = null;
  if (profile.agency_id) {
    const { data } = await supabase
      .from("agencies")
      .select("name, logo_url, website, social_links, signature_disclaimer")
      .eq("id", profile.agency_id)
      .maybeSingle();
    agency = (data as AgencyRow | null) ?? null;
  }

  // Broker's own social links take priority; fall back to agency's.
  const brokerSocial = (profile.social_links as Record<string, string | undefined> | null) ?? {};
  const agencySocial = agency?.social_links ?? {};

  return {
    brokerName: profile.name ?? null,
    brokerPhone: profile.phone ?? null,
    brokerEmail: profile.email_public?.trim() || user?.email || null,
    brokerProfileUrl: profile.slug ? `${APP_URL}/broker/${profile.slug}` : null,
    brokerPhotoUrl: profile.photo_url ?? null,
    agencyName: agency?.name ?? null,
    agencyLogoUrl: agency?.logo_url ?? null,
    agencyWebsite: agency?.website ?? null,
    agencyDisclaimer: agency?.signature_disclaimer ?? null,
    social: {
      linkedin: brokerSocial.linkedin || agencySocial.linkedin || null,
      facebook: brokerSocial.facebook || agencySocial.facebook || null,
      instagram: brokerSocial.instagram || agencySocial.instagram || null,
    },
    signatureTitle: (profile.signature_title as string | null) ?? null,
    signatureHtml: (profile.signature_html as string | null) ?? null,
    signatureEnabled: profile.signature_enabled !== false,
  };
}

/**
 * Resolve a broker's effective signature.
 *
 * Returns `null` when the broker has disabled signatures. Otherwise returns
 * both an HTML version (for templated/rich emails) and a plain-text fallback
 * for clients that strip HTML.
 */
export async function getBrokerSignature(brokerId: string): Promise<
  | null
  | {
      html: string;
      text: string;
    }
> {
  const ctx = await loadBrokerSignatureContext(brokerId);
  if (!ctx) return null;
  if (!ctx.signatureEnabled) return null;

  // Custom HTML override — sanitized for known-bad constructs, then used as-is.
  if (ctx.signatureHtml?.trim()) {
    const sanitized = sanitizeCustomSignatureHtml(ctx.signatureHtml);
    return {
      html: sanitized,
      text: stripHtmlForText(sanitized),
    };
  }

  return {
    html: buildAutoSignatureHtml({
      brokerName: ctx.brokerName,
      brokerTitle: ctx.signatureTitle,
      brokerPhone: ctx.brokerPhone,
      brokerEmail: ctx.brokerEmail,
      brokerProfileUrl: ctx.brokerProfileUrl,
      brokerPhotoUrl: ctx.brokerPhotoUrl,
      agencyName: ctx.agencyName,
      agencyLogoUrl: ctx.agencyLogoUrl,
      agencyWebsite: ctx.agencyWebsite,
      agencyDisclaimer: ctx.agencyDisclaimer,
      social: ctx.social,
    }),
    text: buildAutoSignatureText({
      brokerName: ctx.brokerName,
      brokerTitle: ctx.signatureTitle,
      brokerPhone: ctx.brokerPhone,
      brokerEmail: ctx.brokerEmail,
      brokerProfileUrl: ctx.brokerProfileUrl,
      agencyName: ctx.agencyName,
      agencyDisclaimer: ctx.agencyDisclaimer,
    }),
  };
}
