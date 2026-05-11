"use server";

import { Resend } from "resend";
import { nanoid } from "nanoid";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { logActivity } from "@/lib/actions/crm";

// ── Config ────────────────────────────────────────────────────────────────

const resend = new Resend(process.env.RESEND_API_KEY);
const EMAIL_FROM = process.env.EMAIL_FROM ?? "noreply@salebiz.com.au";
const INBOUND_DOMAIN = process.env.SALEBIZ_INBOUND_DOMAIN ?? "mail.salebiz.com.au";

// ── Types ─────────────────────────────────────────────────────────────────

export type EmailTemplate = {
  id: string;
  name: string;
  subject: string;
  body: string;
  created_at: string;
};

// ── Auth ──────────────────────────────────────────────────────────────────

async function requireBroker() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "broker") {
    throw new Error("Unauthorized");
  }
  return {
    id: session.user.id,
    name: session.user.name ?? null,
    email: session.user.email ?? null,
    agencyId: session.user.agencyId ?? null,
    agencyRole: session.user.agencyRole ?? null,
  };
}

// ── Variable substitution ─────────────────────────────────────────────────

/**
 * Replace `{{first_name}}`, `{{full_name}}`, `{{broker_name}}`,
 * `{{broker_company}}`, `{{listing_title}}` with values from the context.
 * Unknown placeholders are left untouched so brokers can spot their typos.
 */
function applyMergeFields(
  text: string,
  ctx: {
    contact: { name: string | null; email: string };
    broker: { name: string | null; company: string | null };
    listing?: { title: string } | null;
  },
): string {
  const firstName =
    ctx.contact.name?.trim().split(/\s+/)[0] ??
    ctx.contact.email.split("@")[0];
  const map: Record<string, string> = {
    first_name: firstName,
    full_name: ctx.contact.name?.trim() ?? "",
    broker_name: ctx.broker.name?.trim() ?? "",
    broker_company: ctx.broker.company?.trim() ?? "",
    listing_title: ctx.listing?.title ?? "",
  };
  return text.replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (match, key) => {
    const k = String(key).toLowerCase();
    return Object.prototype.hasOwnProperty.call(map, k) ? map[k] : match;
  });
}

/** Wrap plain text into a minimal personal-style HTML email. */
function plainToHtml(plain: string): string {
  const paragraphs = plain
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
  const body = paragraphs
    .map(
      (p) =>
        `<p style="margin:0 0 14px 0;">${escapeHtml(p).replace(/\n/g, "<br>")}</p>`,
    )
    .join("\n");
  return `<!DOCTYPE html>
<html><body style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:#222;max-width:600px;margin:0 auto;padding:24px;">
${body}
</body></html>`;
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ── In-platform composer ──────────────────────────────────────────────────

/**
 * Send an email from the broker to a CRM contact.
 *
 * Logs an `email_sent` activity, mirrors `last_emailed_at` /
 * `last_contacted_at`, and auto-advances the contact's status to `contacted`
 * (if currently `new_lead`). The from address is the platform's verified
 * sender (so SPF/DKIM line up); reply_to points at the broker's public email
 * so the buyer's reply lands in the broker's normal inbox.
 *
 * Replies are captured back into the CRM via the BCC pipeline below — the
 * broker just needs to BCC their private inbound address (or have replies
 * automatically CC'd by their email client).
 */
export async function sendCrmEmail(input: {
  contactId: string;
  subject: string;
  body: string;
  listingId?: string | null;
}): Promise<
  | { ok: true; activityId: string; messageId: string | null }
  | { ok: false; error: string }
> {
  const broker = await requireBroker();
  const supabase = createServiceRoleClient();

  const subject = input.subject?.trim();
  const body = input.body?.trim();
  if (!subject) return { ok: false, error: "Subject is required" };
  if (!body) return { ok: false, error: "Message body is required" };
  if (subject.length > 200) return { ok: false, error: "Subject is too long" };
  if (body.length > 50_000) return { ok: false, error: "Body is too long" };

  // Load + scope-check contact, plus broker profile + (optional) listing.
  const [{ data: contact }, { data: brokerProfile }] = await Promise.all([
    supabase
      .from("broker_contacts")
      .select("id, broker_id, buyer_user_id, name, email, status")
      .eq("id", input.contactId)
      .maybeSingle(),
    supabase
      .from("profiles")
      .select("name, company, email_public")
      .eq("id", broker.id)
      .maybeSingle(),
  ]);
  if (!contact) return { ok: false, error: "Contact not found" };
  if (contact.broker_id !== broker.id) {
    if (broker.agencyId && broker.agencyRole === "owner") {
      const { data: ownerCheck } = await supabase
        .from("profiles")
        .select("agency_id")
        .eq("id", contact.broker_id)
        .maybeSingle();
      if (ownerCheck?.agency_id !== broker.agencyId) {
        return { ok: false, error: "Forbidden" };
      }
    } else {
      return { ok: false, error: "Forbidden" };
    }
  }

  let listing: { id: string; title: string } | null = null;
  if (input.listingId) {
    const { data } = await supabase
      .from("listings")
      .select("id, title")
      .eq("id", input.listingId)
      .maybeSingle();
    listing = data ?? null;
  }

  const ctx = {
    contact: { name: contact.name ?? null, email: contact.email },
    broker: {
      name: broker.name ?? brokerProfile?.name ?? null,
      company: brokerProfile?.company ?? null,
    },
    listing: listing ? { title: listing.title } : null,
  };
  const renderedSubject = applyMergeFields(subject, ctx);
  const renderedBody = applyMergeFields(body, ctx);

  const fromName =
    ctx.broker.name?.trim() || ctx.broker.company?.trim() || "Salebiz Broker";
  const fromHeader = `${fromName} <${EMAIL_FROM}>`;
  const replyTo = brokerProfile?.email_public?.trim() || broker.email || EMAIL_FROM;

  let messageId: string | null = null;
  try {
    const { data, error } = await resend.emails.send({
      from: fromHeader,
      to: contact.email,
      replyTo,
      subject: renderedSubject,
      text: renderedBody,
      html: plainToHtml(renderedBody),
    });
    if (error) {
      return {
        ok: false,
        error: typeof error === "string" ? error : (error.message ?? "Email failed"),
      };
    }
    messageId = data?.id ?? null;
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Email failed",
    };
  }

  // Log to CRM. logActivity handles the mirror + status auto-advance.
  const log = await logActivity({
    contactId: contact.id,
    buyerUserId: contact.buyer_user_id,
    listingId: input.listingId ?? null,
    kind: "email_sent",
    subject: renderedSubject,
    body: renderedBody,
    metadata: {
      message_id: messageId,
      direction: "outbound",
      via: "in_platform_composer",
      to: contact.email,
      reply_to: replyTo,
    },
  });

  if (!log.ok) {
    // Email already sent; still surface the partial failure so the broker
    // knows the activity log isn't reliable for this one.
    return {
      ok: false,
      error: `Email sent but couldn't log to CRM: ${log.error}`,
    };
  }

  return { ok: true, activityId: log.activityId, messageId };
}

// ── Templates (stored on profiles.email_templates jsonb) ──────────────────

export async function listEmailTemplates(): Promise<EmailTemplate[]> {
  const broker = await requireBroker();
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("profiles")
    .select("email_templates")
    .eq("id", broker.id)
    .maybeSingle();
  const arr = (data?.email_templates ?? []) as EmailTemplate[];
  return Array.isArray(arr) ? arr : [];
}

export async function saveEmailTemplate(input: {
  name: string;
  subject: string;
  body: string;
}): Promise<{ ok: true; template: EmailTemplate } | { ok: false; error: string }> {
  const broker = await requireBroker();
  const supabase = createServiceRoleClient();

  const name = input.name?.trim();
  const subject = input.subject?.trim();
  const body = input.body?.trim();
  if (!name) return { ok: false, error: "Template name is required" };
  if (!subject) return { ok: false, error: "Subject is required" };
  if (!body) return { ok: false, error: "Body is required" };

  const existing = await listEmailTemplates();
  if (existing.length >= 50) return { ok: false, error: "Template limit reached (50)" };
  if (existing.some((t) => t.name.toLowerCase() === name.toLowerCase())) {
    return { ok: false, error: "A template with this name already exists" };
  }

  const template: EmailTemplate = {
    id: nanoid(10),
    name,
    subject,
    body,
    created_at: new Date().toISOString(),
  };
  const next = [...existing, template];

  const { error } = await supabase
    .from("profiles")
    .update({ email_templates: next, updated_at: new Date().toISOString() })
    .eq("id", broker.id);
  if (error) return { ok: false, error: error.message };
  return { ok: true, template };
}

export async function deleteEmailTemplate(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const broker = await requireBroker();
  const supabase = createServiceRoleClient();
  const existing = await listEmailTemplates();
  const next = existing.filter((t) => t.id !== id);
  if (next.length === existing.length) {
    return { ok: false, error: "Template not found" };
  }
  const { error } = await supabase
    .from("profiles")
    .update({ email_templates: next, updated_at: new Date().toISOString() })
    .eq("id", broker.id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// ── Log a past external email (manual entry; no actual send) ────────────

/**
 * Log an email that was already sent from outside Salebiz (Gmail, Outlook,
 * phone, etc.) so the CRM timeline reflects reality. We don't send anything
 * — just write the activity + mirror columns + status auto-advance.
 *
 * Simple alternative to the BCC inbound pipeline for brokers who don't want
 * to configure auto-BCC rules in their email client.
 */
export async function logExternalEmail(input: {
  contactId: string;
  subject: string;
  body: string;
  /** ISO timestamp of when the email was actually sent. Defaults to now. */
  sentAt?: string;
  listingId?: string | null;
}): Promise<{ ok: true; activityId: string } | { ok: false; error: string }> {
  const broker = await requireBroker();
  const supabase = createServiceRoleClient();

  const subject = input.subject?.trim();
  const body = input.body?.trim();
  if (!subject) return { ok: false, error: "Subject is required" };
  if (!body) return { ok: false, error: "Body is required" };
  if (subject.length > 200) return { ok: false, error: "Subject is too long" };
  if (body.length > 50_000) return { ok: false, error: "Body is too long" };

  // Scope-check contact.
  const { data: contact } = await supabase
    .from("broker_contacts")
    .select("id, broker_id, buyer_user_id, email")
    .eq("id", input.contactId)
    .maybeSingle();
  if (!contact) return { ok: false, error: "Contact not found" };
  if (contact.broker_id !== broker.id) {
    if (broker.agencyId && broker.agencyRole === "owner") {
      const { data: ownerCheck } = await supabase
        .from("profiles")
        .select("agency_id")
        .eq("id", contact.broker_id)
        .maybeSingle();
      if (ownerCheck?.agency_id !== broker.agencyId) {
        return { ok: false, error: "Forbidden" };
      }
    } else {
      return { ok: false, error: "Forbidden" };
    }
  }

  const occurredAt = input.sentAt ?? new Date().toISOString();
  // Sanity-check timestamp.
  if (Number.isNaN(new Date(occurredAt).getTime())) {
    return { ok: false, error: "Invalid sent-at timestamp" };
  }

  return await logActivity({
    contactId: contact.id,
    buyerUserId: contact.buyer_user_id,
    listingId: input.listingId ?? null,
    kind: "email_sent",
    subject,
    body,
    occurredAt,
    metadata: {
      via: "manual_log",
      direction: "outbound",
      to: contact.email,
      logged_after_the_fact: true,
    },
  });
}

// ── BCC inbound address ───────────────────────────────────────────────────

/**
 * Get (or lazily create) this broker's private inbound BCC address.
 *
 * Brokers BCC this address on emails they send from any client (Gmail,
 * Outlook, Apple Mail) — the `/api/inbound/email` webhook below parses the
 * token, matches recipients to CRM contacts, and logs the email automatically.
 *
 * Returns null when the inbound webhook isn't configured (no INBOUND_EMAIL_SECRET).
 * Callers should hide the BCC UI entirely in that case so brokers aren't
 * shown an address that won't actually receive anything.
 */
export async function getBrokerBccAddress(): Promise<
  | { email: string; token: string; inboundDomain: string }
  | null
> {
  // Pipeline is opt-in. Without the secret, the inbound webhook returns 503
  // — so an address would be useless. Render nothing instead.
  if (!process.env.INBOUND_EMAIL_SECRET) return null;

  const broker = await requireBroker();
  const supabase = createServiceRoleClient();

  const { data: existing } = await supabase
    .from("broker_bcc_addresses")
    .select("token")
    .eq("broker_id", broker.id)
    .maybeSingle();

  if (existing?.token) {
    return {
      email: `bcc-${existing.token}@${INBOUND_DOMAIN}`,
      token: existing.token,
      inboundDomain: INBOUND_DOMAIN,
    };
  }

  // Lazy create. nanoid(12) → ~10^21 entropy; way more than the address space
  // any single broker would generate.
  const token = nanoid(12).toLowerCase();
  const { error } = await supabase
    .from("broker_bcc_addresses")
    .insert({ broker_id: broker.id, token });
  if (error) {
    // Likely a race with concurrent calls; re-read.
    const { data: retry } = await supabase
      .from("broker_bcc_addresses")
      .select("token")
      .eq("broker_id", broker.id)
      .maybeSingle();
    if (retry?.token) {
      return {
        email: `bcc-${retry.token}@${INBOUND_DOMAIN}`,
        token: retry.token,
        inboundDomain: INBOUND_DOMAIN,
      };
    }
    throw new Error(error.message);
  }
  return {
    email: `bcc-${token}@${INBOUND_DOMAIN}`,
    token,
    inboundDomain: INBOUND_DOMAIN,
  };
}
