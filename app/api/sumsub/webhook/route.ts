import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import {
  getApplicant,
  extractVerifiedIdentity,
  extractCompanyData,
  mapReviewToStatus,
} from "@/lib/sumsub";
import type { KybVerificationStatus } from "@/lib/types/kyb";

/**
 * Sumsub result webhook.
 *
 * Sumsub signs the raw body with the webhook secret and sends the HMAC in the
 * `x-payload-digest` header (algorithm in `x-payload-digest-alg`, default
 * HMAC_SHA256_HEX). We verify it, then update the matching record:
 *   • individual (KYC) — matched by externalUserId (= our contact id) →
 *     kyb_buyer_identity
 *   • company (KYB)    — externalUserId is "company:<contactId>:<listingId>",
 *     matched there or by the stored applicant id → kyb_listing_compliance
 * On a meaningful result we also notify the owning broker. Always returns 200
 * once the signature checks out so Sumsub doesn't retry; mismatches return 400.
 *
 * Register the endpoint in Sumsub → Dev space → Webhooks pointing at
 * https://<your-host>/api/sumsub/webhook, with the secret in
 * SUMSUB_WEBHOOK_SECRET.
 */

type Supabase = ReturnType<typeof createServiceRoleClient>;

type SumsubReviewResult = {
  reviewAnswer?: "GREEN" | "RED";
  reviewRejectType?: "RETRY" | "FINAL";
  rejectLabels?: string[];
};

type SumsubWebhookPayload = {
  type?: string;
  applicantId?: string;
  externalUserId?: string;
  inspectionId?: string;
  correlationId?: string;
  reviewResult?: SumsubReviewResult;
};

const ALG_TO_HASH: Record<string, string> = {
  HMAC_SHA1_HEX: "sha1",
  HMAC_SHA256_HEX: "sha256",
  HMAC_SHA512_HEX: "sha512",
};

/** Statuses worth pinging the broker about (skip intermediate "pending"). */
const NOTIFY_STATUSES: KybVerificationStatus[] = [
  "approved",
  "rejected",
  "resubmission_requested",
];

function verifySignature(
  rawBody: string,
  digest: string | null,
  alg: string | null,
): boolean {
  const secret = process.env.SUMSUB_WEBHOOK_SECRET;
  if (!secret || !digest) return false;
  const hashAlg = ALG_TO_HASH[alg ?? "HMAC_SHA256_HEX"] ?? "sha256";
  const expected = createHmac(hashAlg, secret).update(rawBody).digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(digest, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** Map a webhook event type to a status change, or null to leave status as-is. */
function statusForEvent(
  type: string | undefined,
  reviewResult: SumsubReviewResult | undefined,
): KybVerificationStatus | null {
  switch (type) {
    case "applicantReviewed":
      return mapReviewToStatus(
        reviewResult?.reviewAnswer,
        reviewResult?.reviewRejectType,
      );
    case "applicantPending":
    case "applicantOnHold":
      return "pending";
    default:
      return null; // applicantCreated, personalInfoChanged, etc. — record id only
  }
}

/** In-app notification to the broker when a result lands (best-effort). */
async function notifyBroker(
  supabase: Supabase,
  args: {
    brokerId: string;
    contactId: string;
    label: "Identity" | "Company";
    status: KybVerificationStatus;
  },
) {
  const verb =
    args.status === "approved"
      ? "approved"
      : args.status === "rejected"
        ? "rejected"
        : "needs resubmission";
  const { data: contact } = await supabase
    .from("broker_contacts")
    .select("name, email")
    .eq("id", args.contactId)
    .maybeSingle();
  const who = contact?.name?.trim() || contact?.email || "A buyer";
  try {
    await supabase.from("notifications").insert({
      user_id: args.brokerId,
      type: "kyb_verification_complete",
      title: `${args.label} verification ${verb}`,
      message: `${who}'s ${args.label.toLowerCase()} verification was ${verb}.`,
      link: `/dashboard/buyers/${args.contactId}`,
    });
  } catch {
    // non-fatal
  }
}

// ── Individual (KYC) ────────────────────────────────────────────────────────

async function handleIndividual(supabase: Supabase, payload: SumsubWebhookPayload) {
  const externalUserId = payload.externalUserId ?? null; // = contact id
  const applicantId = payload.applicantId ?? null;

  let identity:
    | { id: string; broker_id: string; contact_id: string; verification_status: string }
    | null = null;
  if (externalUserId) {
    const { data } = await supabase
      .from("kyb_buyer_identity")
      .select("id, broker_id, contact_id, verification_status")
      .eq("contact_id", externalUserId)
      .maybeSingle();
    identity = data ?? null;
  }
  if (!identity && applicantId) {
    const { data } = await supabase
      .from("kyb_buyer_identity")
      .select("id, broker_id, contact_id, verification_status")
      .eq("sumsub_applicant_id", applicantId)
      .maybeSingle();
    identity = data ?? null;
  }

  // Applicant started outside our flow: create a row if the externalUserId
  // maps to a known contact.
  if (!identity && externalUserId) {
    const { data: contact } = await supabase
      .from("broker_contacts")
      .select("id, broker_id, buyer_user_id")
      .eq("id", externalUserId)
      .maybeSingle();
    if (contact) {
      const { data: inserted } = await supabase
        .from("kyb_buyer_identity")
        .insert({
          broker_id: contact.broker_id,
          contact_id: contact.id,
          buyer_user_id: contact.buyer_user_id ?? null,
          sumsub_external_user_id: externalUserId,
          sumsub_applicant_id: applicantId,
          verification_status: "pending",
        })
        .select("id, broker_id, contact_id, verification_status")
        .maybeSingle();
      identity = inserted ?? null;
    }
  }

  if (!identity) return false;

  const nextStatus = statusForEvent(payload.type, payload.reviewResult);
  const nowIso = new Date().toISOString();
  const patch: Record<string, unknown> = { updated_at: nowIso };
  if (applicantId) patch.sumsub_applicant_id = applicantId;
  if (payload.inspectionId || payload.correlationId) {
    patch.verification_reference = payload.inspectionId ?? payload.correlationId;
  }
  if (payload.type === "applicantReviewed") {
    patch.individual_result = payload.reviewResult ?? {};
  }

  const isTerminal =
    identity.verification_status === "approved" ||
    identity.verification_status === "rejected";
  const statusChanged =
    !!nextStatus &&
    nextStatus !== identity.verification_status &&
    (!isTerminal || payload.type === "applicantReviewed");

  if (statusChanged && nextStatus) {
    patch.verification_status = nextStatus;
    if (nextStatus === "approved") patch.verified_at = nowIso;
  }

  if (nextStatus === "approved" && applicantId) {
    try {
      const applicant = await getApplicant(applicantId);
      const { dob, address } = extractVerifiedIdentity(applicant);
      if (dob) patch.verified_dob = dob;
      if (address) patch.verified_address = address;
    } catch {
      // non-fatal
    }
  }

  await supabase.from("kyb_buyer_identity").update(patch).eq("id", identity.id);

  if (statusChanged && nextStatus && NOTIFY_STATUSES.includes(nextStatus)) {
    await notifyBroker(supabase, {
      brokerId: identity.broker_id,
      contactId: identity.contact_id,
      label: "Identity",
      status: nextStatus,
    });
  }
  return true;
}

// ── Company (KYB) ───────────────────────────────────────────────────────────

async function handleCompany(supabase: Supabase, payload: SumsubWebhookPayload) {
  const applicantId = payload.applicantId ?? null;
  // externalUserId = "company:<contactId>:<listingId>"
  const parts = (payload.externalUserId ?? "").split(":");
  const contactId = parts[0] === "company" ? parts[1] : null;
  const listingId = parts[0] === "company" ? parts[2] : null;

  let row:
    | { id: string; broker_id: string; contact_id: string; company_verification_status: string }
    | null = null;
  if (contactId && listingId) {
    const { data } = await supabase
      .from("kyb_listing_compliance")
      .select("id, broker_id, contact_id, company_verification_status")
      .eq("contact_id", contactId)
      .eq("listing_id", listingId)
      .maybeSingle();
    row = data ?? null;
  }
  if (!row && applicantId) {
    const { data } = await supabase
      .from("kyb_listing_compliance")
      .select("id, broker_id, contact_id, company_verification_status")
      .eq("sumsub_company_applicant_id", applicantId)
      .maybeSingle();
    row = data ?? null;
  }
  if (!row) return false;

  const nextStatus = statusForEvent(payload.type, payload.reviewResult);
  const nowIso = new Date().toISOString();
  const patch: Record<string, unknown> = { updated_at: nowIso };
  if (applicantId) patch.sumsub_company_applicant_id = applicantId;
  if (payload.inspectionId || payload.correlationId) {
    patch.company_verification_reference =
      payload.inspectionId ?? payload.correlationId;
  }

  const isTerminal =
    row.company_verification_status === "approved" ||
    row.company_verification_status === "rejected";
  const statusChanged =
    !!nextStatus &&
    nextStatus !== row.company_verification_status &&
    (!isTerminal || payload.type === "applicantReviewed");

  if (statusChanged && nextStatus) {
    patch.company_verification_status = nextStatus;
    if (nextStatus === "approved") patch.company_verified_at = nowIso;
  }

  if (payload.type === "applicantReviewed" && applicantId) {
    try {
      const applicant = await getApplicant(applicantId);
      const { company, beneficialOwners } = extractCompanyData(applicant);
      patch.company_result = {
        review: payload.reviewResult ?? {},
        company: company ?? undefined,
      };
      if (beneficialOwners) patch.beneficial_owner_result = beneficialOwners;
    } catch {
      patch.company_result = { review: payload.reviewResult ?? {} };
    }
  }

  await supabase.from("kyb_listing_compliance").update(patch).eq("id", row.id);

  if (statusChanged && nextStatus && NOTIFY_STATUSES.includes(nextStatus)) {
    await notifyBroker(supabase, {
      brokerId: row.broker_id,
      contactId: row.contact_id,
      label: "Company",
      status: nextStatus,
    });
  }
  return true;
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const digest = req.headers.get("x-payload-digest");
  const alg = req.headers.get("x-payload-digest-alg");

  if (!verifySignature(rawBody, digest, alg)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let payload: SumsubWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as SumsubWebhookPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const supabase = createServiceRoleClient();
  const isCompany = (payload.externalUserId ?? "").startsWith("company:");

  const matched = isCompany
    ? await handleCompany(supabase, payload)
    : await handleIndividual(supabase, payload);

  // Ack regardless so Sumsub stops retrying.
  return NextResponse.json({ ok: true, matched });
}
