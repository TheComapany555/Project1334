"use server";

import { createServiceRoleClient } from "@/lib/supabase/admin";
import {
  DEFAULT_ENQUIRY_FORM_CONFIG,
  MAX_CUSTOM_QUESTIONS,
  type EnquiryCustomQuestion,
  type ListingEnquiryFormConfig,
} from "@/lib/types/enquiry-form-config";

type Result<T = void> =
  | (T extends void ? { ok: true } : { ok: true } & T)
  | { ok: false; error: string };

async function requireBroker() {
  const { getServerSession } = await import("next-auth");
  const { authOptions } = await import("@/lib/auth");
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "broker") {
    throw new Error("Unauthorized");
  }
  return { userId: session.user.id };
}

async function verifyListingOwnership(
  listingId: string,
  userId: string,
): Promise<boolean> {
  const supabase = createServiceRoleClient();
  const { data: listing } = await supabase
    .from("listings")
    .select("id, broker_id, agency_id")
    .eq("id", listingId)
    .single();
  if (!listing) return false;
  if (listing.broker_id === userId) return true;
  if (listing.agency_id) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("agency_id, agency_role")
      .eq("id", userId)
      .single();
    return (
      !!profile &&
      profile.agency_id === listing.agency_id &&
      profile.agency_role === "owner"
    );
  }
  return false;
}

/**
 * Read the config for one listing. Returns a synthetic default-config object
 * when no row exists so callers can render without branching.
 */
export async function getListingEnquiryFormConfig(
  listingId: string,
): Promise<ListingEnquiryFormConfig> {
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("listing_enquiry_form_config")
    .select("*")
    .eq("listing_id", listingId)
    .maybeSingle();
  if (data) {
    return {
      ...data,
      custom_questions: normaliseQuestions(data.custom_questions),
    } as ListingEnquiryFormConfig;
  }
  const now = new Date().toISOString();
  return {
    listing_id: listingId,
    ...DEFAULT_ENQUIRY_FORM_CONFIG,
    created_at: now,
    updated_at: now,
  };
}

function normaliseQuestions(raw: unknown): EnquiryCustomQuestion[] {
  if (!Array.isArray(raw)) return [];
  const out: EnquiryCustomQuestion[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const obj = item as Record<string, unknown>;
    const id = typeof obj.id === "string" ? obj.id : null;
    const label = typeof obj.label === "string" ? obj.label.trim() : "";
    if (!id || !label) continue;
    const kind = obj.kind === "long_text" ? "long_text" : "text";
    out.push({
      id,
      label,
      required: obj.required === true,
      kind,
    });
  }
  return out.slice(0, MAX_CUSTOM_QUESTIONS);
}

export type EnquiryFormConfigPatch = Omit<
  ListingEnquiryFormConfig,
  "listing_id" | "created_at" | "updated_at"
>;

export async function upsertListingEnquiryFormConfig(
  listingId: string,
  patch: EnquiryFormConfigPatch,
): Promise<Result> {
  const { userId } = await requireBroker();
  if (!(await verifyListingOwnership(listingId, userId))) {
    return { ok: false, error: "You do not own this listing." };
  }
  const questions = normaliseQuestions(patch.custom_questions);
  // Reject duplicate question ids — they'd break custom_answers indexing.
  const seen = new Set<string>();
  for (const q of questions) {
    if (seen.has(q.id)) {
      return { ok: false, error: "Custom questions must have unique IDs." };
    }
    seen.add(q.id);
    if (q.label.length > 200) {
      return { ok: false, error: "Custom question labels must be 200 characters or fewer." };
    }
  }

  const supabase = createServiceRoleClient();
  const { error } = await supabase
    .from("listing_enquiry_form_config")
    .upsert(
      {
        listing_id: listingId,
        show_phone: patch.show_phone,
        require_phone: patch.require_phone,
        show_reason: patch.show_reason,
        show_interest: patch.show_interest,
        show_budget: patch.show_budget,
        require_budget: patch.require_budget,
        show_funding: patch.show_funding,
        require_funding: patch.require_funding,
        show_industry: patch.show_industry,
        require_industry: patch.require_industry,
        show_timeframe: patch.show_timeframe,
        require_timeframe: patch.require_timeframe,
        custom_questions: questions,
      },
      { onConflict: "listing_id" },
    );
  if (error) return { ok: false, error: "Failed to save enquiry form." };
  return { ok: true };
}

export async function resetListingEnquiryFormConfig(
  listingId: string,
): Promise<Result> {
  const { userId } = await requireBroker();
  if (!(await verifyListingOwnership(listingId, userId))) {
    return { ok: false, error: "You do not own this listing." };
  }
  const supabase = createServiceRoleClient();
  const { error } = await supabase
    .from("listing_enquiry_form_config")
    .delete()
    .eq("listing_id", listingId);
  if (error) return { ok: false, error: "Failed to reset form." };
  return { ok: true };
}
