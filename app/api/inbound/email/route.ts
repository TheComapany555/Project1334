/**
 * Inbound email webhook — passive BCC pipeline (M1.2 §6).
 *
 * The broker BCC's their private address `bcc-<token>@<INBOUND_DOMAIN>` on
 * outbound emails sent from their normal client (Gmail, Outlook, etc.). The
 * inbound provider (Resend Inbound, Mailgun Routes, AWS SES → SNS, etc.)
 * delivers a JSON payload to this endpoint.
 *
 * We match the token → broker, attempt to match each non-token recipient
 * email to one of that broker's CRM contacts (creating one if none exists),
 * and insert an `email_sent` activity. The outcome is the same as if the
 * broker had used the in-platform composer.
 *
 * Authentication:
 *   - The webhook MUST include `x-salebiz-inbound-secret: <INBOUND_EMAIL_SECRET>`.
 *     Configure this in your provider's webhook settings; without it, the
 *     route returns 401 silently (no leakage).
 *
 * Idempotency:
 *   - We dedupe on `metadata.message_id`. If the same Message-ID has already
 *     been logged for this broker, we skip rather than re-insert.
 *
 * Provider-agnostic shape:
 *   - We accept either Resend Inbound's shape (`from`, `to`, `cc`, `bcc`,
 *     `subject`, `text`, `html`, `headers.message-id`) or a flatter shape
 *     used by Mailgun/SES forwarders. Anything that gives us a token in any
 *     `to`/`cc`/`bcc` and a sender + body works.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { getOrCreateBrokerContactForBuyer } from "@/lib/actions/contacts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const INBOUND_DOMAIN = process.env.SALEBIZ_INBOUND_DOMAIN ?? "mail.salebiz.com.au";
const INBOUND_SECRET = process.env.INBOUND_EMAIL_SECRET ?? "";

type EmailAddress = string | { email: string; name?: string };
type RawAddressList = EmailAddress | EmailAddress[] | null | undefined;

type GenericPayload = {
  from?: EmailAddress;
  to?: RawAddressList;
  cc?: RawAddressList;
  bcc?: RawAddressList;
  recipient?: string;        // some providers (Mailgun) use 'recipient' singular
  subject?: string;
  text?: string;
  html?: string;
  headers?: Record<string, unknown> | { name: string; value: string }[];
  message_id?: string;
  "Message-Id"?: string;
  date?: string;
};

export async function POST(req: NextRequest) {
  // 1. Auth
  if (!INBOUND_SECRET) {
    return NextResponse.json({ error: "Inbound not configured" }, { status: 503 });
  }
  if (req.headers.get("x-salebiz-inbound-secret") !== INBOUND_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Parse
  let payload: GenericPayload;
  try {
    payload = (await req.json()) as GenericPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const fromEmail = extractEmail(payload.from);
  if (!fromEmail) {
    return NextResponse.json({ error: "Missing from" }, { status: 400 });
  }

  // 3. Find the inbound token across to / cc / bcc / recipient.
  const allRecipients = [
    ...flattenAddresses(payload.to),
    ...flattenAddresses(payload.cc),
    ...flattenAddresses(payload.bcc),
    payload.recipient ?? null,
  ]
    .map((a) => (a ?? "").toLowerCase())
    .filter(Boolean);

  const token = findInboundToken(allRecipients);
  if (!token) {
    // Nothing for us — return 200 so the provider doesn't retry. Drop silently.
    return NextResponse.json({ ok: true, skipped: "no token" });
  }

  // 4. Resolve broker.
  const supabase = createServiceRoleClient();
  const { data: bcc } = await supabase
    .from("broker_bcc_addresses")
    .select("broker_id")
    .eq("token", token)
    .maybeSingle();
  if (!bcc?.broker_id) {
    return NextResponse.json({ ok: true, skipped: "unknown token" });
  }
  const brokerId = bcc.broker_id;

  // 5. Idempotency: dedupe by Message-ID.
  const messageId = extractMessageId(payload);
  if (messageId) {
    const { count } = await supabase
      .from("crm_activities")
      .select("id", { count: "exact", head: true })
      .eq("broker_id", brokerId)
      .filter("metadata->>message_id", "eq", messageId);
    if ((count ?? 0) > 0) {
      return NextResponse.json({ ok: true, skipped: "duplicate" });
    }
  }

  // 6. Direction detection. If the broker is in the From header (BCC of own
  //    outbound), this is `email_sent`. If the broker is in the To/Cc and the
  //    sender is a contact, treat as `email_received`.
  const { data: brokerProfile } = await supabase
    .from("profiles")
    .select("email_public")
    .eq("id", brokerId)
    .maybeSingle();
  const { data: brokerUser } = await supabase
    .from("users")
    .select("email")
    .eq("id", brokerId)
    .maybeSingle();
  const brokerEmails = new Set(
    [brokerProfile?.email_public, brokerUser?.email]
      .map((e) => e?.toLowerCase())
      .filter((e): e is string => !!e),
  );

  const direction: "outbound" | "inbound" = brokerEmails.has(fromEmail.toLowerCase())
    ? "outbound"
    : "inbound";

  const subject = (payload.subject ?? "").toString().slice(0, 200);
  const bodyText = stripQuotedReplies((payload.text ?? "").toString()).slice(0, 50_000);

  // 7. For each non-token, non-broker recipient, ensure a CRM contact and log.
  //    For inbound (broker is recipient), the "contact" is the sender.
  let logged = 0;
  if (direction === "outbound") {
    const counterparties = uniq(
      allRecipients
        .map(stripBracketEmail)
        .filter((e) => e && !e.endsWith(`@${INBOUND_DOMAIN}`))
        .filter((e) => !brokerEmails.has(e)),
    );
    for (const peer of counterparties) {
      const ok = await logForCounterparty({
        supabase,
        brokerId,
        peerEmail: peer,
        kind: "email_sent",
        subject,
        body: bodyText,
        messageId,
        viaBcc: true,
      });
      if (ok) logged++;
    }
  } else {
    // inbound — sender is the counterparty.
    const peer = stripBracketEmail(fromEmail);
    if (peer && !peer.endsWith(`@${INBOUND_DOMAIN}`)) {
      const ok = await logForCounterparty({
        supabase,
        brokerId,
        peerEmail: peer,
        kind: "email_received",
        subject,
        body: bodyText,
        messageId,
        viaBcc: true,
      });
      if (ok) logged++;
    }
  }

  return NextResponse.json({ ok: true, logged, direction });
}

// ─── Helpers ─────────────────────────────────────────────────────────────

async function logForCounterparty(args: {
  supabase: ReturnType<typeof createServiceRoleClient>;
  brokerId: string;
  peerEmail: string;
  kind: "email_sent" | "email_received";
  subject: string;
  body: string;
  messageId: string | null;
  viaBcc: boolean;
}): Promise<boolean> {
  const { supabase, brokerId, peerEmail, kind, subject, body, messageId, viaBcc } = args;

  // Try to find an existing CRM row by buyer_user_id (via users table) or email.
  const { data: userRow } = await supabase
    .from("users")
    .select("id")
    .ilike("email", peerEmail)
    .maybeSingle();

  const created = await getOrCreateBrokerContactForBuyer({
    brokerId,
    buyerUserId: userRow?.id ?? null,
    email: peerEmail,
    source: "manual",
    firstInteractionAt: new Date().toISOString(),
  }).catch(() => null);

  if (!created || !created.ok) return false;

  // Resolve buyer_user_id post-create (the helper may have backfilled it).
  const { data: contactRow } = await supabase
    .from("broker_contacts")
    .select("buyer_user_id")
    .eq("id", created.contactId)
    .maybeSingle();

  // Insert activity directly (not via logActivity action) — we're outside an
  // authenticated session here, the webhook is service-role.
  const occurredAt = new Date().toISOString();
  const { error } = await supabase.from("crm_activities").insert({
    broker_id: brokerId,
    contact_id: created.contactId,
    buyer_user_id: contactRow?.buyer_user_id ?? userRow?.id ?? null,
    kind,
    subject: subject || (kind === "email_sent" ? "(no subject)" : "(reply)"),
    body,
    metadata: {
      message_id: messageId,
      direction: kind === "email_sent" ? "outbound" : "inbound",
      via: viaBcc ? "bcc_pipeline" : "in_platform_composer",
      to: peerEmail,
      auto_logged: true,
    },
    occurred_at: occurredAt,
  });
  if (error) return false;

  // Mirror the appropriate broker_contacts.last_*_at columns.
  const writes: Record<string, unknown> = {
    last_emailed_at: occurredAt,
    last_contacted_at: occurredAt,
    updated_at: occurredAt,
  };
  await supabase.from("broker_contacts").update(writes).eq("id", created.contactId);

  // Auto-advance status only on outbound (broker took the action).
  if (kind === "email_sent") {
    const { data: cur } = await supabase
      .from("broker_contacts")
      .select("status")
      .eq("id", created.contactId)
      .maybeSingle();
    if (cur?.status === "new_lead") {
      await supabase
        .from("broker_contacts")
        .update({ status: "contacted", updated_at: occurredAt })
        .eq("id", created.contactId);
      await supabase.from("crm_activities").insert({
        broker_id: brokerId,
        contact_id: created.contactId,
        buyer_user_id: contactRow?.buyer_user_id ?? userRow?.id ?? null,
        kind: "status_changed",
        subject: "new_lead → contacted",
        metadata: {
          from: "new_lead",
          to: "contacted",
          automatic: true,
          triggered_by: "email_sent",
        },
      });
    }
  }

  return true;
}

function flattenAddresses(input: RawAddressList): string[] {
  if (!input) return [];
  const arr = Array.isArray(input) ? input : [input];
  return arr.map(extractEmail).filter((e): e is string => !!e);
}

function extractEmail(input: EmailAddress | undefined | null): string | null {
  if (!input) return null;
  if (typeof input === "string") return stripBracketEmail(input);
  if (typeof input === "object" && "email" in input) return input.email.toLowerCase();
  return null;
}

/** "Joe <joe@x.com>" → "joe@x.com"; "joe@x.com" → "joe@x.com". */
function stripBracketEmail(s: string): string {
  const m = s.match(/<([^>]+)>/);
  return (m?.[1] ?? s).trim().toLowerCase();
}

function findInboundToken(addresses: string[]): string | null {
  const suffix = `@${INBOUND_DOMAIN}`.toLowerCase();
  for (const addr of addresses) {
    const e = stripBracketEmail(addr);
    if (!e.endsWith(suffix)) continue;
    const local = e.slice(0, -suffix.length);
    if (local.startsWith("bcc-")) {
      const token = local.slice("bcc-".length);
      if (token) return token;
    }
  }
  return null;
}

function extractMessageId(payload: GenericPayload): string | null {
  if (typeof payload.message_id === "string") return payload.message_id;
  if (typeof payload["Message-Id"] === "string") return payload["Message-Id"];
  const headers = payload.headers;
  if (Array.isArray(headers)) {
    for (const h of headers) {
      if (h?.name?.toLowerCase() === "message-id" && typeof h.value === "string") {
        return h.value;
      }
    }
    return null;
  }
  if (headers && typeof headers === "object") {
    for (const [k, v] of Object.entries(headers)) {
      if (k.toLowerCase() === "message-id" && typeof v === "string") return v;
    }
  }
  return null;
}

/**
 * Best-effort strip of quoted reply history. Cuts at the first match of
 * common reply-marker patterns so the body we log is the broker's actual
 * message, not a 12-deep email chain.
 */
function stripQuotedReplies(text: string): string {
  if (!text) return text;
  const patterns = [
    /\nOn .+wrote:[\s\S]*$/i,                        // "On Wed, Jan 1, 2026 at 9:00 AM Joe <joe@x.com> wrote:"
    /\n-{2,}\s*Original Message\s*-{2,}[\s\S]*$/i,    // "----- Original Message -----"
    /\nFrom:\s*.+\n(Sent|Date):[\s\S]*$/i,            // Outlook: "From: ... Sent: ..."
    /\n_{4,}[\s\S]*$/,                                // Long underscore divider
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m) return text.slice(0, m.index).trimEnd();
  }
  return text;
}

function uniq(arr: string[]): string[] {
  return Array.from(new Set(arr));
}
