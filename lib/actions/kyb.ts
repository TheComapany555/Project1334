"use server";

import { getServerSession } from "next-auth";
import { Resend } from "resend";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import {
  generateVerificationLink,
  isSumsubConfigured,
  isSumsubCompanyConfigured,
  companyLevelName,
  createOrGetCompanyApplicant,
} from "@/lib/sumsub";
import type {
  KybTabData,
  KybBuyerIdentity,
  KybListingCompliance,
  KybComplianceInput,
} from "@/lib/types/kyb";
import type { BuyerCrmStatus } from "@/lib/types/contacts";

const resend = new Resend(process.env.RESEND_API_KEY);
const EMAIL_FROM = process.env.EMAIL_FROM ?? "noreply@salebiz.com.au";

// Pipeline stages that sit BEFORE Know Your Buyer — sending a verification may
// auto-advance the buyer to "know_your_buyer" from one of these (never demotes
// a buyer who is already further along, and never resurrects sold/lost).
const PRE_KYB_STAGES: BuyerCrmStatus[] = [
  "new_lead",
  "contacted",
  "interested",
  "meeting_scheduled",
  "nda_signed",
];

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ── Auth + scoping (mirrors lib/actions/crm.ts) ────────────────────────────

type Broker = {
  id: string;
  name: string | null;
  agencyId: string | null;
  agencyRole: string | null;
};

async function requireBroker(): Promise<Broker> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "broker") {
    throw new Error("Unauthorized");
  }
  return {
    id: session.user.id,
    name: session.user.name ?? null,
    agencyId: session.user.agencyId ?? null,
    agencyRole: session.user.agencyRole ?? null,
  };
}

type ScopedContact = {
  id: string;
  broker_id: string;
  buyer_user_id: string | null;
  status: BuyerCrmStatus | null;
  name: string | null;
  email: string;
  company: string | null;
};

async function loadContactScoped(
  supabase: ReturnType<typeof createServiceRoleClient>,
  broker: Broker,
  contactId: string,
): Promise<ScopedContact | null> {
  const { data: contact } = await supabase
    .from("broker_contacts")
    .select("id, broker_id, buyer_user_id, status, name, email, company")
    .eq("id", contactId)
    .maybeSingle();
  if (!contact) return null;
  if (contact.broker_id === broker.id) return contact as ScopedContact;
  if (broker.agencyId && broker.agencyRole === "owner") {
    const { data: ownerCheck } = await supabase
      .from("profiles")
      .select("agency_id")
      .eq("id", contact.broker_id)
      .maybeSingle();
    if (ownerCheck?.agency_id === broker.agencyId) return contact as ScopedContact;
  }
  return null;
}

async function loadListingScoped(
  supabase: ReturnType<typeof createServiceRoleClient>,
  broker: Broker,
  listingId: string,
): Promise<{ id: string; title: string | null } | null> {
  const { data: listing } = await supabase
    .from("listings")
    .select("id, broker_id, agency_id, title")
    .eq("id", listingId)
    .maybeSingle();
  if (!listing) return null;
  const owns =
    listing.broker_id === broker.id ||
    (broker.agencyId &&
      broker.agencyRole === "owner" &&
      listing.agency_id === broker.agencyId);
  return owns ? { id: listing.id, title: listing.title } : null;
}

// ── Read ───────────────────────────────────────────────────────────────────

export async function getKybForContactListing(
  contactId: string,
  listingId: string,
): Promise<{ ok: true; data: KybTabData } | { ok: false; error: string }> {
  const broker = await requireBroker();
  const supabase = createServiceRoleClient();

  const contact = await loadContactScoped(supabase, broker, contactId);
  if (!contact) return { ok: false, error: "Contact not found" };
  const listing = await loadListingScoped(supabase, broker, listingId);
  if (!listing) return { ok: false, error: "Listing not found or not yours" };

  const { data: identity, error: idErr } = await supabase
    .from("kyb_buyer_identity")
    .select("*")
    .eq("contact_id", contactId)
    .maybeSingle();
  if (idErr) {
    return {
      ok: false,
      error:
        "Know Your Buyer isn't available yet. Apply the latest database migration and try again.",
    };
  }

  const { data: compliance } = await supabase
    .from("kyb_listing_compliance")
    .select("*")
    .eq("contact_id", contactId)
    .eq("listing_id", listingId)
    .maybeSingle();

  return {
    ok: true,
    data: {
      identity: (identity as KybBuyerIdentity | null) ?? null,
      compliance: (compliance as KybListingCompliance | null) ?? null,
      companyAvailable: isSumsubCompanyConfigured(),
    },
  };
}

// ── Save the compliance form ────────────────────────────────────────────────

const complianceSchema = z.object({
  fullLegalName: z.string().trim().max(200),
  dob: z.string().trim().max(20).nullable(),
  residentialAddress: z.string().trim().max(500),
  purchasingStructure: z
    .enum(["individual", "company", "trust", "company_as_trustee"])
    .nullable(),
  companyName: z.string().trim().max(200),
  acnAbn: z.string().trim().max(50),
  beneficialOwner: z.string().trim().max(300),
  sourceOfFunds: z
    .enum([
      "cash",
      "business_loan",
      "home_equity",
      "investor_funds",
      "seller_finance",
      "other",
    ])
    .nullable(),
  actingOnBehalf: z.boolean().nullable(),
  beneficialOwnersOffshore: z.boolean().nullable(),
  isPep: z.boolean().nullable(),
});

export async function saveKybCompliance(
  input: { contactId: string; listingId: string } & KybComplianceInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const broker = await requireBroker();
  const supabase = createServiceRoleClient();

  const contact = await loadContactScoped(supabase, broker, input.contactId);
  if (!contact) return { ok: false, error: "Contact not found" };
  const listing = await loadListingScoped(supabase, broker, input.listingId);
  if (!listing) return { ok: false, error: "Listing not found or not yours" };

  const parsed = complianceSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid form" };
  }
  const f = parsed.data;

  const { error } = await supabase.from("kyb_listing_compliance").upsert(
    {
      broker_id: contact.broker_id,
      contact_id: input.contactId,
      listing_id: input.listingId,
      buyer_user_id: contact.buyer_user_id ?? null,
      full_legal_name: f.fullLegalName || null,
      dob: f.dob || null,
      residential_address: f.residentialAddress || null,
      purchasing_structure: f.purchasingStructure,
      company_name: f.companyName || null,
      acn_abn: f.acnAbn || null,
      beneficial_owner: f.beneficialOwner || null,
      source_of_funds: f.sourceOfFunds,
      acting_on_behalf: f.actingOnBehalf,
      beneficial_owners_offshore: f.beneficialOwnersOffshore,
      is_pep: f.isPep,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "contact_id,listing_id" },
  );
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// ── Trigger verification (create/reuse applicant + email the link) ──────────

export async function sendBuyerVerification(input: {
  contactId: string;
  listingId: string;
}): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const broker = await requireBroker();

  if (!isSumsubConfigured()) {
    return {
      ok: false,
      error:
        "Sumsub isn't configured yet — add SUMSUB_APP_TOKEN, SUMSUB_SECRET_KEY and SUMSUB_LEVEL_NAME.",
    };
  }

  const supabase = createServiceRoleClient();
  const contact = await loadContactScoped(supabase, broker, input.contactId);
  if (!contact) return { ok: false, error: "Contact not found" };
  if (!contact.email) {
    return { ok: false, error: "This buyer has no email address to send the link to." };
  }
  const listing = await loadListingScoped(supabase, broker, input.listingId);
  if (!listing) return { ok: false, error: "Listing not found or not yours" };

  // 1. Generate a hosted verification link (Sumsub creates/reuses the applicant
  //    keyed by externalUserId = contact id).
  let url: string;
  try {
    const res = await generateVerificationLink({ externalUserId: input.contactId });
    url = res.url;
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Could not create the verification link.",
    };
  }

  // 2. Record/refresh the buyer's identity row.
  const nowIso = new Date().toISOString();
  const { error: upErr } = await supabase.from("kyb_buyer_identity").upsert(
    {
      broker_id: contact.broker_id,
      contact_id: input.contactId,
      buyer_user_id: contact.buyer_user_id ?? null,
      sumsub_external_user_id: input.contactId,
      verification_status: "link_sent",
      link_sent_at: nowIso,
      updated_at: nowIso,
    },
    { onConflict: "contact_id" },
  );
  if (upErr) return { ok: false, error: upErr.message };

  // 3. Email the buyer the link (via Resend).
  const emailRes = await sendVerificationEmail({
    to: contact.email,
    buyerName: contact.name,
    brokerName: broker.name,
    listingTitle: listing.title,
    url,
  });
  if (!emailRes.ok) return { ok: false, error: emailRes.error };

  // 4. Nudge the pipeline stage to "know_your_buyer" (advance-only).
  await advanceListingStageToKyb(supabase, contact, input.listingId);

  return { ok: true, url };
}

// ── Trigger COMPANY verification (Phase 2 — KYB) ────────────────────────────

export async function sendCompanyVerification(input: {
  contactId: string;
  listingId: string;
}): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const broker = await requireBroker();

  if (!isSumsubCompanyConfigured()) {
    return {
      ok: false,
      error:
        "Company verification isn't configured — add SUMSUB_COMPANY_LEVEL_NAME.",
    };
  }

  const supabase = createServiceRoleClient();
  const contact = await loadContactScoped(supabase, broker, input.contactId);
  if (!contact) return { ok: false, error: "Contact not found" };
  if (!contact.email) {
    return { ok: false, error: "This buyer has no email address to send the link to." };
  }
  const listing = await loadListingScoped(supabase, broker, input.listingId);
  if (!listing) return { ok: false, error: "Listing not found or not yours" };

  // Company details must be saved first (we pre-fill the Sumsub applicant).
  const { data: compliance } = await supabase
    .from("kyb_listing_compliance")
    .select("company_name, acn_abn")
    .eq("contact_id", input.contactId)
    .eq("listing_id", input.listingId)
    .maybeSingle();
  const companyName = (compliance?.company_name as string | null)?.trim();
  if (!companyName) {
    return { ok: false, error: "Save the company name (and ACN/ABN) before verifying." };
  }

  // Company applicant uses a DISTINCT externalUserId from the individual.
  const externalUserId = `company:${input.contactId}:${input.listingId}`;

  let applicantId: string;
  try {
    const applicant = await createOrGetCompanyApplicant({
      externalUserId,
      companyName,
      registrationNumber: (compliance?.acn_abn as string | null) ?? "",
    });
    applicantId = applicant.id;
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Could not create the company applicant.",
    };
  }

  let url: string;
  try {
    const res = await generateVerificationLink({
      externalUserId,
      levelName: companyLevelName(),
    });
    url = res.url;
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Could not create the verification link.",
    };
  }

  const nowIso = new Date().toISOString();
  const { error: upErr } = await supabase.from("kyb_listing_compliance").upsert(
    {
      broker_id: contact.broker_id,
      contact_id: input.contactId,
      listing_id: input.listingId,
      buyer_user_id: contact.buyer_user_id ?? null,
      sumsub_company_applicant_id: applicantId,
      company_verification_status: "link_sent",
      company_link_sent_at: nowIso,
      updated_at: nowIso,
    },
    { onConflict: "contact_id,listing_id" },
  );
  if (upErr) return { ok: false, error: upErr.message };

  const emailRes = await sendVerificationEmail({
    to: contact.email,
    buyerName: contact.name,
    brokerName: broker.name,
    listingTitle: listing.title,
    url,
    purpose: "company",
  });
  if (!emailRes.ok) return { ok: false, error: emailRes.error };

  await advanceListingStageToKyb(supabase, contact, input.listingId);

  return { ok: true, url };
}

async function sendVerificationEmail(args: {
  to: string;
  buyerName: string | null;
  brokerName: string | null;
  listingTitle: string | null;
  url: string;
  purpose?: "identity" | "company";
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const greeting = args.buyerName?.trim()
    ? `Hi ${args.buyerName.trim().split(/\s+/)[0]},`
    : "Hi,";
  const broker = args.brokerName?.trim() || "Your broker";
  const re = args.listingTitle ? ` regarding ${args.listingTitle}` : "";
  const fromName = args.brokerName?.trim() || "SaleBiz";
  const isCompany = args.purpose === "company";
  const what = isCompany ? "a company verification" : "an identity verification";
  const subject = isCompany
    ? "Complete your company verification"
    : "Complete your identity verification";

  const text = [
    greeting,
    "",
    `${broker} has requested ${what}${re}. It only takes a few minutes and is handled securely by Sumsub.`,
    "",
    `Start your verification: ${args.url}`,
    "",
    "This link is personal to you — please don't forward it.",
  ].join("\n");

  const html = `
    <div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#1f2937;max-width:520px;margin:0 auto;">
      <p>${greeting}</p>
      <p><strong>${escapeHtml(broker)}</strong> has requested ${what}${escapeHtml(re)}. It only takes a few minutes and is handled securely by Sumsub.</p>
      <p style="margin:28px 0;">
        <a href="${args.url}" style="background:#0f766e;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:8px;display:inline-block;font-weight:600;">Start verification</a>
      </p>
      <p style="color:#6b7280;font-size:13px;">Or paste this link into your browser:<br><a href="${args.url}" style="color:#0f766e;word-break:break-all;">${args.url}</a></p>
      <p style="color:#6b7280;font-size:13px;">This link is personal to you — please don't forward it.</p>
    </div>`;

  try {
    const { error } = await resend.emails.send({
      from: `${fromName} <${EMAIL_FROM}>`,
      to: args.to,
      subject,
      text,
      html,
    });
    if (error) {
      return {
        ok: false,
        error: typeof error === "string" ? error : (error.message ?? "Email failed"),
      };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Email failed" };
  }
}

/** Advance the per-listing pipeline stage to "know_your_buyer" — never demote. */
async function advanceListingStageToKyb(
  supabase: ReturnType<typeof createServiceRoleClient>,
  contact: ScopedContact,
  listingId: string,
): Promise<void> {
  const { data: existing, error } = await supabase
    .from("broker_contact_listing_status")
    .select("status")
    .eq("contact_id", contact.id)
    .eq("listing_id", listingId)
    .maybeSingle();
  if (error) return; // table not migrated — degrade gracefully

  const current = (existing?.status as BuyerCrmStatus | null) ?? null;
  if (current && !PRE_KYB_STAGES.includes(current)) return; // already at/after KYB or terminal

  const nowIso = new Date().toISOString();
  const { error: upErr } = await supabase.from("broker_contact_listing_status").upsert(
    {
      broker_id: contact.broker_id,
      contact_id: contact.id,
      buyer_user_id: contact.buyer_user_id ?? null,
      listing_id: listingId,
      status: "know_your_buyer",
      updated_at: nowIso,
    },
    { onConflict: "contact_id,listing_id" },
  );
  if (upErr) return;

  await supabase.from("crm_activities").insert({
    broker_id: contact.broker_id,
    contact_id: contact.id,
    buyer_user_id: contact.buyer_user_id ?? null,
    listing_id: listingId,
    kind: "status_changed",
    subject: `${current ?? "new_lead"} → know_your_buyer`,
    metadata: {
      from: current ?? "new_lead",
      to: "know_your_buyer",
      automatic: true,
      listing_scope: true,
      triggered_by: "kyb_verification_sent",
    },
  });

  // Roll the overall/headline status up too (only from a pre-KYB stage).
  const overall = (contact.status as BuyerCrmStatus | null) ?? "new_lead";
  if (PRE_KYB_STAGES.includes(overall)) {
    await supabase
      .from("broker_contacts")
      .update({ status: "know_your_buyer", updated_at: nowIso })
      .eq("id", contact.id);
  }
}
