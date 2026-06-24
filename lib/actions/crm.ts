"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { createNotification } from "@/lib/actions/notifications";
import type { BuyerCrmStatus } from "@/lib/types/contacts";

// ─── Types ────────────────────────────────────────────────────────────────

export type CrmActivityKind =
  | "email_sent"
  | "email_received"
  | "call_logged"
  | "note_added"
  | "follow_up_set"
  | "follow_up_completed"
  | "status_changed"
  | "message_sent"
  | "message_received"
  | "listing_shared"
  | "feedback_logged";

export type CrmActivity = {
  id: string;
  broker_id: string;
  contact_id: string | null;
  buyer_user_id: string | null;
  listing_id: string | null;
  kind: CrmActivityKind;
  subject: string | null;
  body: string | null;
  metadata: Record<string, unknown>;
  occurred_at: string;
  created_at: string;
  /**
   * Opaque per-email open-tracking token. Set on outbound `email_sent` rows;
   * null elsewhere.
   */
  tracking_token: string | null;
  /** First-open timestamp for outbound emails (null until pixel loads). */
  opened_at: string | null;
  /** Total pixel-loads (re-opens included). 0 for non-email activities. */
  open_count: number;
};

export type CrmFollowUp = {
  id: string;
  broker_id: string;
  contact_id: string | null;
  buyer_user_id: string | null;
  listing_id: string | null;
  due_at: string;
  title: string;
  notes: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CallOutcome =
  | "connected"
  | "no_answer"
  | "voicemail"
  | "wrong_number"
  | "callback_requested";

// ─── Pipeline status order (manual demotions allowed; auto only advances) ─

const STATUS_ORDER: Record<BuyerCrmStatus, number> = {
  new_lead: 0,
  contacted: 1,
  interested: 2,
  meeting_scheduled: 3,
  nda_signed: 4,
  know_your_buyer: 5,
  documents_shared: 6,
  negotiating: 7,
  sold: 8, // won — the funnel peak; sticky against auto-advance, rolls up the overall stage
  // "lost" is an off-funnel outcome: ranked at the bottom so marking one
  // listing lost never promotes the buyer's overall stage, and a broker who
  // re-contacts a lost buyer auto-advances them back to "contacted".
  lost: 0,
};

// ─── Auth helpers ─────────────────────────────────────────────────────────

async function requireBroker() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "broker") {
    throw new Error("Unauthorized");
  }
  return {
    id: session.user.id,
    agencyId: session.user.agencyId ?? null,
    agencyRole: session.user.agencyRole ?? null,
  };
}

/**
 * Fetch a contact and verify the broker is allowed to read/write it.
 * Solo broker owns the row; agency owners can act on any row in their agency.
 */
async function loadContactScoped(
  supabase: ReturnType<typeof createServiceRoleClient>,
  broker: { id: string; agencyId: string | null; agencyRole: string | null },
  contactId: string,
) {
  const { data: contact } = await supabase
    .from("broker_contacts")
    .select("id, broker_id, buyer_user_id, status")
    .eq("id", contactId)
    .maybeSingle();
  if (!contact) return null;

  if (contact.broker_id === broker.id) return contact;
  if (broker.agencyId && broker.agencyRole === "owner") {
    const { data: ownerCheck } = await supabase
      .from("profiles")
      .select("agency_id")
      .eq("id", contact.broker_id)
      .maybeSingle();
    if (ownerCheck?.agency_id === broker.agencyId) return contact;
  }
  return null;
}

/**
 * Verify the broker can act on a listing (owns it, or is the agency owner of
 * the listing's agency). Returns the listing row or null.
 */
async function loadListingScoped(
  supabase: ReturnType<typeof createServiceRoleClient>,
  broker: { id: string; agencyId: string | null; agencyRole: string | null },
  listingId: string,
) {
  const { data: listing } = await supabase
    .from("listings")
    .select("id, broker_id, agency_id")
    .eq("id", listingId)
    .maybeSingle();
  if (!listing) return null;
  const owns =
    listing.broker_id === broker.id ||
    (broker.agencyId &&
      broker.agencyRole === "owner" &&
      listing.agency_id === broker.agencyId);
  return owns ? listing : null;
}

/**
 * Resolve the canonical (contact_id, buyer_user_id) pair for an activity.
 *
 * Callers can pass either; we'll fill in the other when the link exists.
 * Returns the broker_id to write the activity against (which may be the
 * contact's owner broker, not necessarily the session broker — though in
 * practice they match).
 */
async function resolveTarget(
  supabase: ReturnType<typeof createServiceRoleClient>,
  broker: { id: string; agencyId: string | null; agencyRole: string | null },
  args: {
    contactId?: string | null;
    buyerUserId?: string | null;
  },
): Promise<{
  brokerId: string;
  contactId: string | null;
  buyerUserId: string | null;
} | null> {
  if (args.contactId) {
    const c = await loadContactScoped(supabase, broker, args.contactId);
    if (!c) return null;
    return {
      brokerId: c.broker_id,
      contactId: c.id,
      buyerUserId: c.buyer_user_id ?? args.buyerUserId ?? null,
    };
  }
  if (args.buyerUserId) {
    // Try to find a contact for this broker matching this buyer.
    const { data: existing } = await supabase
      .from("broker_contacts")
      .select("id, broker_id, buyer_user_id")
      .eq("broker_id", broker.id)
      .eq("buyer_user_id", args.buyerUserId)
      .maybeSingle();
    if (existing) {
      return {
        brokerId: existing.broker_id,
        contactId: existing.id,
        buyerUserId: existing.buyer_user_id,
      };
    }
    // No CRM row yet — that's OK, the activity can still be logged against
    // the buyer_user_id alone.
    return { brokerId: broker.id, contactId: null, buyerUserId: args.buyerUserId };
  }
  return null;
}

// ─── Status engine ────────────────────────────────────────────────────────

/**
 * Advance a contact's status — never demote. Called by side effects of
 * `logActivity` (email/call/message/etc.) and explicitly by `setContactStatus`.
 *
 * Returns the resulting status (could be unchanged if `target` is below
 * current).
 */
async function advanceStatusIfHigher(
  supabase: ReturnType<typeof createServiceRoleClient>,
  contactId: string,
  target: BuyerCrmStatus,
  meta: { triggeredByKind?: CrmActivityKind } = {},
): Promise<{ from: BuyerCrmStatus | null; to: BuyerCrmStatus; changed: boolean }> {
  const { data: row } = await supabase
    .from("broker_contacts")
    .select("status, broker_id, buyer_user_id")
    .eq("id", contactId)
    .maybeSingle();
  if (!row) return { from: null, to: target, changed: false };

  const current = (row.status as BuyerCrmStatus | null) ?? "new_lead";
  if (STATUS_ORDER[target] <= STATUS_ORDER[current]) {
    return { from: current, to: current, changed: false };
  }

  const { error } = await supabase
    .from("broker_contacts")
    .update({ status: target, updated_at: new Date().toISOString() })
    .eq("id", contactId);
  if (error) return { from: current, to: current, changed: false };

  // Log a status_changed activity (non-blocking; this is itself the side
  // effect of another activity, but the status_changed entry is what powers
  // the timeline).
  await supabase.from("crm_activities").insert({
    broker_id: row.broker_id,
    contact_id: contactId,
    buyer_user_id: row.buyer_user_id ?? null,
    kind: "status_changed",
    subject: `${current} → ${target}`,
    metadata: {
      from: current,
      to: target,
      automatic: true,
      triggered_by: meta.triggeredByKind ?? null,
    },
  });

  return { from: current, to: target, changed: true };
}

/**
 * Per-listing analogue of `advanceStatusIfHigher`. Advances the
 * (contact, listing) pipeline stage — never demotes — and logs a
 * listing-scoped `status_changed` activity. Degrades to a no-op if the
 * `broker_contact_listing_status` table isn't migrated yet.
 *
 * Caller must already have verified the broker owns `listingId`.
 */
async function advanceListingStatusIfHigher(
  supabase: ReturnType<typeof createServiceRoleClient>,
  args: {
    brokerId: string;
    contactId: string;
    buyerUserId: string | null;
    listingId: string;
  },
  target: BuyerCrmStatus,
  meta: { triggeredByKind?: CrmActivityKind } = {},
): Promise<void> {
  const { data: existing, error } = await supabase
    .from("broker_contact_listing_status")
    .select("status")
    .eq("contact_id", args.contactId)
    .eq("listing_id", args.listingId)
    .maybeSingle();
  if (error) return; // table not migrated — degrade gracefully

  const current = (existing?.status as BuyerCrmStatus | null) ?? null;
  if (current && STATUS_ORDER[target] <= STATUS_ORDER[current]) return;

  const { error: upErr } = await supabase
    .from("broker_contact_listing_status")
    .upsert(
      {
        broker_id: args.brokerId,
        contact_id: args.contactId,
        buyer_user_id: args.buyerUserId,
        listing_id: args.listingId,
        status: target,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "contact_id,listing_id" },
    );
  if (upErr) return;

  await supabase.from("crm_activities").insert({
    broker_id: args.brokerId,
    contact_id: args.contactId,
    buyer_user_id: args.buyerUserId ?? null,
    listing_id: args.listingId,
    kind: "status_changed",
    subject: `${current ?? "new_lead"} → ${target}`,
    metadata: {
      from: current ?? "new_lead",
      to: target,
      automatic: true,
      listing_scope: true,
      triggered_by: meta.triggeredByKind ?? null,
    },
  });
}

/**
 * Apply mirror updates to broker_contacts (last_emailed_at, last_called_at,
 * last_contacted_at) when an activity is logged. GREATEST() ignores NULL so
 * we never accidentally overwrite a newer timestamp with an older one.
 */
async function applyContactMirrors(
  supabase: ReturnType<typeof createServiceRoleClient>,
  contactId: string,
  kind: CrmActivityKind,
  occurredAt: string,
) {
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (kind === "email_sent" || kind === "email_received") {
    patch.last_emailed_at = occurredAt;
    patch.last_contacted_at = occurredAt;
  } else if (kind === "call_logged") {
    patch.last_called_at = occurredAt;
    patch.last_contacted_at = occurredAt;
  } else if (
    kind === "message_sent" ||
    kind === "message_received" ||
    kind === "listing_shared"
  ) {
    patch.last_contacted_at = occurredAt;
  }
  if (Object.keys(patch).length === 1) return; // only updated_at

  // Use GREATEST via raw RPC-style call: read current row, only patch when
  // the new timestamp is newer. Cheap because contactId is indexed PK.
  const { data: cur } = await supabase
    .from("broker_contacts")
    .select("last_emailed_at, last_called_at, last_contacted_at")
    .eq("id", contactId)
    .maybeSingle();
  if (!cur) return;

  const writes: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const [k, v] of Object.entries(patch)) {
    if (k === "updated_at") continue;
    const existing = (cur as Record<string, string | null>)[k];
    if (!existing || (typeof v === "string" && v > existing)) writes[k] = v;
  }
  if (Object.keys(writes).length === 1) return;

  await supabase.from("broker_contacts").update(writes).eq("id", contactId);
}

/**
 * Pick the auto-advance target status for a given activity kind, or null
 * if the kind shouldn't trigger an advance.
 */
function autoAdvanceTargetFor(kind: CrmActivityKind): BuyerCrmStatus | null {
  switch (kind) {
    case "email_sent":
    case "call_logged":
    case "message_sent":
    case "listing_shared":
      return "contacted";
    case "feedback_logged":
      return "interested";
    default:
      return null;
  }
}

// ─── Public actions ──────────────────────────────────────────────────────

/** Generic activity logger. Used by call/email/note actions and externally. */
export async function logActivity(input: {
  contactId?: string | null;
  buyerUserId?: string | null;
  listingId?: string | null;
  kind: CrmActivityKind;
  subject?: string | null;
  body?: string | null;
  metadata?: Record<string, unknown>;
  occurredAt?: string;
  /**
   * Opaque token persisted on the row for `kind="email_sent"` so the open
   * pixel endpoint can look the row up by token and stamp opened_at.
   */
  trackingToken?: string | null;
  /** Default true. Set false for system status_changed inserts to avoid loops. */
  applySideEffects?: boolean;
}): Promise<{ ok: true; activityId: string } | { ok: false; error: string }> {
  const broker = await requireBroker();
  const supabase = createServiceRoleClient();

  const target = await resolveTarget(supabase, broker, {
    contactId: input.contactId,
    buyerUserId: input.buyerUserId,
  });

  // Feedback can be logged with no buyer and no listing — e.g. the broker
  // jots down general feedback heard on a call with an unregistered contact.
  // Other activity kinds (email, call, note, etc.) still require a
  // buyer/contact target so they have something to mirror onto.
  const isLooseFeedback = !target && input.kind === "feedback_logged";
  if (!target && !isLooseFeedback) {
    return { ok: false, error: "Contact or buyer not found" };
  }

  // If a listingId is supplied (with or without a buyer), verify the broker
  // owns the listing so they can't tag feedback onto someone else's.
  if (input.listingId) {
    const { data: listing } = await supabase
      .from("listings")
      .select("id, broker_id, agency_id")
      .eq("id", input.listingId)
      .maybeSingle();
    if (!listing) return { ok: false, error: "Listing not found" };
    const owns =
      listing.broker_id === broker.id ||
      (broker.agencyId &&
        broker.agencyRole === "owner" &&
        listing.agency_id === broker.agencyId);
    if (!owns) return { ok: false, error: "You do not own this listing" };
  }

  const occurredAt = input.occurredAt ?? new Date().toISOString();

  const { data: inserted, error } = await supabase
    .from("crm_activities")
    .insert({
      broker_id: target?.brokerId ?? broker.id,
      contact_id: target?.contactId ?? null,
      buyer_user_id: target?.buyerUserId ?? null,
      listing_id: input.listingId ?? null,
      kind: input.kind,
      subject: input.subject ?? null,
      body: input.body ?? null,
      metadata: input.metadata ?? {},
      occurred_at: occurredAt,
      tracking_token: input.trackingToken ?? null,
    })
    .select("id")
    .single();

  if (error || !inserted) {
    return { ok: false, error: error?.message ?? "Failed to log activity" };
  }

  if (input.applySideEffects !== false && target?.contactId) {
    await applyContactMirrors(supabase, target.contactId, input.kind, occurredAt);

    const advanceTarget = autoAdvanceTargetFor(input.kind);
    if (advanceTarget) {
      await advanceStatusIfHigher(supabase, target.contactId, advanceTarget, {
        triggeredByKind: input.kind,
      });
      // When the activity is tied to a specific listing (e.g. a call logged
      // about one business, an NDA-related share), advance the per-listing
      // stage too so the buyer profile reflects deal progress per listing.
      // Listing ownership was already validated above.
      if (input.listingId) {
        await advanceListingStatusIfHigher(
          supabase,
          {
            brokerId: target.brokerId,
            contactId: target.contactId,
            buyerUserId: target.buyerUserId ?? null,
            listingId: input.listingId,
          },
          advanceTarget,
          { triggeredByKind: input.kind },
        );
      }
    }
  }

  return { ok: true, activityId: inserted.id };
}

/** Quick "Add note" from CRM row or buyer panel. */
export async function addNote(input: {
  contactId?: string | null;
  buyerUserId?: string | null;
  listingId?: string | null;
  body: string;
}): Promise<{ ok: true; activityId: string } | { ok: false; error: string }> {
  const body = input.body?.trim();
  if (!body) return { ok: false, error: "Note can't be empty" };
  return logActivity({
    contactId: input.contactId,
    buyerUserId: input.buyerUserId,
    listingId: input.listingId,
    kind: "note_added",
    body,
  });
}

export type FeedbackSubtype =
  | "feedback"
  | "objection"
  | "concern"
  | "lost_interest"
  | "common_question";

const FEEDBACK_SUBTYPES: FeedbackSubtype[] = [
  "feedback",
  "objection",
  "concern",
  "lost_interest",
  "common_question",
];

export type RecentFeedbackRow = {
  subtype: FeedbackSubtype;
  body: string;
  occurred_at: string;
};

export type ListingFeedbackRow = RecentFeedbackRow & {
  buyer_user_id: string | null;
  buyer_name: string | null;
  buyer_email: string | null;
  activity_id: string;
};

/**
 * Recent feedback rows tagged to a specific listing, newest first. Used by
 * the listing AI Insights page so the model can produce a seller update
 * that mentions buyer-specific feedback collected for THIS listing.
 *
 * Authorisation: verifies the current broker owns the listing (or owns the
 * parent agency that does). Matches the spec's per-broker scoping rule —
 * one broker can never see another broker's feedback even if it sits on a
 * shared agency listing they don't own.
 */
export async function getRecentFeedbackForListing(
  listingId: string,
  limit = 30,
): Promise<ListingFeedbackRow[]> {
  const broker = await requireBroker();
  const supabase = createServiceRoleClient();

  const { data: listing } = await supabase
    .from("listings")
    .select("id, broker_id, agency_id")
    .eq("id", listingId)
    .maybeSingle();
  if (!listing) return [];
  const owns =
    listing.broker_id === broker.id ||
    (broker.agencyId &&
      broker.agencyRole === "owner" &&
      listing.agency_id === broker.agencyId);
  if (!owns) return [];

  const { data: activities } = await supabase
    .from("crm_activities")
    .select("id, subject, body, occurred_at, buyer_user_id, contact_id")
    .eq("listing_id", listingId)
    .eq("kind", "feedback_logged")
    .not("body", "is", null)
    .order("occurred_at", { ascending: false })
    .limit(Math.max(1, Math.min(limit, 100)));

  const rows = activities ?? [];
  if (rows.length === 0) return [];

  // Enrich with buyer names/emails for the rows that have a buyer attached.
  const buyerIds = [
    ...new Set(
      rows.map((r) => r.buyer_user_id).filter((id): id is string => !!id),
    ),
  ];
  const profileById = new Map<string, { name: string | null }>();
  const userById = new Map<string, { email: string }>();
  if (buyerIds.length > 0) {
    const [{ data: profiles }, { data: users }] = await Promise.all([
      supabase.from("profiles").select("id, name").in("id", buyerIds),
      supabase.from("users").select("id, email").in("id", buyerIds),
    ]);
    for (const p of profiles ?? []) profileById.set(p.id, { name: p.name });
    for (const u of users ?? []) userById.set(u.id, { email: u.email });
  }

  const out: ListingFeedbackRow[] = [];
  for (const r of rows) {
    const subtype = (r.subject as string | null)?.trim();
    if (!subtype || !FEEDBACK_SUBTYPES.includes(subtype as FeedbackSubtype)) continue;
    const body = (r.body as string | null)?.trim();
    if (!body) continue;
    out.push({
      activity_id: r.id,
      subtype: subtype as FeedbackSubtype,
      body,
      occurred_at: r.occurred_at as string,
      buyer_user_id: r.buyer_user_id,
      buyer_name: r.buyer_user_id
        ? profileById.get(r.buyer_user_id)?.name ?? null
        : null,
      buyer_email: r.buyer_user_id
        ? userById.get(r.buyer_user_id)?.email ?? null
        : null,
    });
  }
  return out;
}

/**
 * Recent feedback rows scoped to the current broker, ordered newest first.
 * Used by broker AI insights so the model can spot patterns
 * ("multiple buyers concerned about pricing").
 *
 * Authorisation: scoped to `broker_id = currentBroker` via the activity row.
 */
export async function getRecentFeedbackForBroker(
  limit = 30,
): Promise<RecentFeedbackRow[]> {
  const broker = await requireBroker();
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("crm_activities")
    .select("subject, body, occurred_at")
    .eq("broker_id", broker.id)
    .eq("kind", "feedback_logged")
    .not("body", "is", null)
    .order("occurred_at", { ascending: false })
    .limit(Math.max(1, Math.min(limit, 100)));
  const out: RecentFeedbackRow[] = [];
  for (const r of data ?? []) {
    const subject = (r.subject as string | null)?.trim();
    if (!subject) continue;
    if (!FEEDBACK_SUBTYPES.includes(subject as FeedbackSubtype)) continue;
    const body = (r.body as string | null)?.trim();
    if (!body) continue;
    out.push({
      subtype: subject as FeedbackSubtype,
      body,
      occurred_at: r.occurred_at as string,
    });
  }
  return out;
}

/**
 * Count this broker's CRM contacts by pipeline stage. Powers status-aware AI
 * insights (broker portfolio) so recommendations/follow-ups reflect how many
 * buyers are new leads vs negotiating vs closed. Agency owners see the whole
 * agency; solo brokers see their own.
 */
export async function getContactStatusBreakdown(): Promise<
  Partial<Record<BuyerCrmStatus, number>>
> {
  const broker = await requireBroker();
  const supabase = createServiceRoleClient();

  let q = supabase.from("broker_contacts").select("status");
  if (broker.agencyId && broker.agencyRole === "owner") {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id")
      .eq("agency_id", broker.agencyId);
    const ids = (profiles ?? []).map((p) => p.id);
    if (ids.length > 0) q = q.in("broker_id", ids);
    else q = q.eq("broker_id", broker.id);
  } else {
    q = q.eq("broker_id", broker.id);
  }

  const { data } = await q;
  const counts: Partial<Record<BuyerCrmStatus, number>> = {};
  for (const r of data ?? []) {
    const s = (r.status as BuyerCrmStatus | null) ?? "new_lead";
    counts[s] = (counts[s] ?? 0) + 1;
  }
  return counts;
}

/**
 * Quick-add a buyer feedback / objection / concern. These rows feed the
 * broker's AI insights (broker-insights.ts) so AI can identify patterns
 * like "multiple buyers concerned about pricing" or "objections cluster
 * around lease terms".
 *
 * Auto-advances pipeline status to "interested" when applicable.
 */
export async function logFeedback(input: {
  contactId?: string | null;
  buyerUserId?: string | null;
  listingId?: string | null;
  subtype: FeedbackSubtype;
  body: string;
}): Promise<{ ok: true; activityId: string } | { ok: false; error: string }> {
  if (!FEEDBACK_SUBTYPES.includes(input.subtype)) {
    return { ok: false, error: "Invalid feedback type" };
  }
  const body = input.body?.trim();
  if (!body) return { ok: false, error: "Feedback can't be empty" };
  return logActivity({
    contactId: input.contactId,
    buyerUserId: input.buyerUserId,
    listingId: input.listingId,
    kind: "feedback_logged",
    subject: input.subtype,
    body,
    metadata: { subtype: input.subtype },
  });
}

/** Log a call (after the broker hits the dial link). */
export async function logCall(input: {
  contactId?: string | null;
  buyerUserId?: string | null;
  listingId?: string | null;
  outcome: CallOutcome;
  notes?: string | null;
  followUp?: { dueAt: string; title?: string; notes?: string } | null;
}): Promise<
  | { ok: true; activityId: string; followUpId: string | null }
  | { ok: false; error: string }
> {
  const validOutcomes: CallOutcome[] = [
    "connected",
    "no_answer",
    "voicemail",
    "wrong_number",
    "callback_requested",
  ];
  if (!validOutcomes.includes(input.outcome)) {
    return { ok: false, error: "Invalid outcome" };
  }

  const log = await logActivity({
    contactId: input.contactId,
    buyerUserId: input.buyerUserId,
    listingId: input.listingId,
    kind: "call_logged",
    subject: input.outcome,
    body: input.notes?.trim() || null,
    metadata: { outcome: input.outcome },
  });
  if (!log.ok) return log;

  let followUpId: string | null = null;
  if (input.followUp?.dueAt) {
    const fu = await setFollowUp({
      contactId: input.contactId,
      buyerUserId: input.buyerUserId,
      listingId: input.listingId,
      dueAt: input.followUp.dueAt,
      title: input.followUp.title?.trim() || "Follow up after call",
      notes: input.followUp.notes ?? null,
    });
    if (fu.ok) followUpId = fu.followUpId;
  }

  return { ok: true, activityId: log.activityId, followUpId };
}

/** Schedule a follow-up. Mirrors next_follow_up_at on broker_contacts. */
export async function setFollowUp(input: {
  contactId?: string | null;
  buyerUserId?: string | null;
  listingId?: string | null;
  dueAt: string;
  title: string;
  notes?: string | null;
}): Promise<{ ok: true; followUpId: string } | { ok: false; error: string }> {
  const broker = await requireBroker();
  const supabase = createServiceRoleClient();

  const due = new Date(input.dueAt);
  if (Number.isNaN(due.getTime())) return { ok: false, error: "Invalid due date" };
  const title = input.title?.trim();
  if (!title) return { ok: false, error: "Title is required" };

  const target = await resolveTarget(supabase, broker, {
    contactId: input.contactId,
    buyerUserId: input.buyerUserId,
  });
  if (!target) return { ok: false, error: "Contact or buyer not found" };

  const { data: inserted, error } = await supabase
    .from("crm_follow_ups")
    .insert({
      broker_id: target.brokerId,
      contact_id: target.contactId,
      buyer_user_id: target.buyerUserId,
      listing_id: input.listingId ?? null,
      due_at: due.toISOString(),
      title,
      notes: input.notes?.trim() || null,
    })
    .select("id")
    .single();

  if (error || !inserted) {
    return { ok: false, error: error?.message ?? "Failed to schedule follow-up" };
  }

  // Mirror next_follow_up_at on the contact (the soonest *open* follow-up).
  if (target.contactId) {
    await refreshNextFollowUpMirror(supabase, target.contactId);
  }

  // Timeline entry.
  await logActivity({
    contactId: target.contactId,
    buyerUserId: target.buyerUserId,
    listingId: input.listingId,
    kind: "follow_up_set",
    subject: title,
    body: input.notes ?? null,
    metadata: { due_at: due.toISOString(), follow_up_id: inserted.id },
    applySideEffects: false,
  });

  return { ok: true, followUpId: inserted.id };
}

/** Mark a follow-up complete and refresh the next_follow_up_at mirror. */
export async function completeFollowUp(
  followUpId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const broker = await requireBroker();
  const supabase = createServiceRoleClient();

  const { data: fu } = await supabase
    .from("crm_follow_ups")
    .select("id, broker_id, contact_id, buyer_user_id, listing_id, title")
    .eq("id", followUpId)
    .maybeSingle();
  if (!fu) return { ok: false, error: "Follow-up not found" };
  if (fu.broker_id !== broker.id) {
    if (broker.agencyId && broker.agencyRole === "owner") {
      const { data: ownerCheck } = await supabase
        .from("profiles")
        .select("agency_id")
        .eq("id", fu.broker_id)
        .maybeSingle();
      if (ownerCheck?.agency_id !== broker.agencyId) {
        return { ok: false, error: "Forbidden" };
      }
    } else {
      return { ok: false, error: "Forbidden" };
    }
  }

  const { error } = await supabase
    .from("crm_follow_ups")
    .update({ completed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", followUpId);
  if (error) return { ok: false, error: error.message };

  if (fu.contact_id) {
    await refreshNextFollowUpMirror(supabase, fu.contact_id);
  }

  await logActivity({
    contactId: fu.contact_id,
    buyerUserId: fu.buyer_user_id,
    listingId: fu.listing_id,
    kind: "follow_up_completed",
    subject: fu.title,
    metadata: { follow_up_id: fu.id },
    applySideEffects: false,
  });

  return { ok: true };
}

/** Manually set a contact's pipeline status (e.g. broker uses the dropdown). */
export async function setContactStatus(
  contactId: string,
  next: BuyerCrmStatus,
): Promise<{ ok: true; from: BuyerCrmStatus | null } | { ok: false; error: string }> {
  if (!Object.prototype.hasOwnProperty.call(STATUS_ORDER, next)) {
    return { ok: false, error: "Invalid status" };
  }
  const broker = await requireBroker();
  const supabase = createServiceRoleClient();

  const contact = await loadContactScoped(supabase, broker, contactId);
  if (!contact) return { ok: false, error: "Contact not found" };

  const current = (contact.status as BuyerCrmStatus | null) ?? "new_lead";
  if (current === next) return { ok: true, from: current };

  const { error } = await supabase
    .from("broker_contacts")
    .update({ status: next, updated_at: new Date().toISOString() })
    .eq("id", contactId);
  if (error) return { ok: false, error: error.message };

  await supabase.from("crm_activities").insert({
    broker_id: contact.broker_id,
    contact_id: contactId,
    buyer_user_id: contact.buyer_user_id ?? null,
    kind: "status_changed",
    subject: `${current} → ${next}`,
    metadata: { from: current, to: next, automatic: false },
  });

  return { ok: true, from: current };
}

/**
 * Manually set the pipeline stage for a contact ON A SPECIFIC LISTING.
 *
 * Lets a broker track, say, "Negotiating" on one business and "New Lead" on
 * another for the same buyer. Rolls the overall `broker_contacts.status` up to
 * this stage when it advances it (never demotes), so the CRM list table,
 * presets, and filters keep reflecting the buyer's furthest stage.
 */
export async function setContactListingStatus(
  contactId: string,
  listingId: string,
  next: BuyerCrmStatus,
): Promise<{ ok: true; from: BuyerCrmStatus | null } | { ok: false; error: string }> {
  if (!Object.prototype.hasOwnProperty.call(STATUS_ORDER, next)) {
    return { ok: false, error: "Invalid status" };
  }
  const broker = await requireBroker();
  const supabase = createServiceRoleClient();

  const contact = await loadContactScoped(supabase, broker, contactId);
  if (!contact) return { ok: false, error: "Contact not found" };

  const listing = await loadListingScoped(supabase, broker, listingId);
  if (!listing) return { ok: false, error: "Listing not found or not yours" };

  const { data: existing, error: readErr } = await supabase
    .from("broker_contact_listing_status")
    .select("status")
    .eq("contact_id", contactId)
    .eq("listing_id", listingId)
    .maybeSingle();
  if (readErr) {
    return {
      ok: false,
      error:
        "Per-listing statuses aren't available yet. Apply the latest database migration and try again.",
    };
  }

  const current = (existing?.status as BuyerCrmStatus | null) ?? null;
  if (current === next) return { ok: true, from: current };

  const { error: upErr } = await supabase
    .from("broker_contact_listing_status")
    .upsert(
      {
        broker_id: contact.broker_id,
        contact_id: contactId,
        buyer_user_id: contact.buyer_user_id ?? null,
        listing_id: listingId,
        status: next,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "contact_id,listing_id" },
    );
  if (upErr) return { ok: false, error: upErr.message };

  await supabase.from("crm_activities").insert({
    broker_id: contact.broker_id,
    contact_id: contactId,
    buyer_user_id: contact.buyer_user_id ?? null,
    listing_id: listingId,
    kind: "status_changed",
    subject: `${current ?? "new_lead"} → ${next}`,
    metadata: {
      from: current ?? "new_lead",
      to: next,
      automatic: false,
      listing_scope: true,
    },
  });

  // Roll the overall/headline status up if this advances it (never demote).
  const overall = (contact.status as BuyerCrmStatus | null) ?? "new_lead";
  if (STATUS_ORDER[next] > STATUS_ORDER[overall]) {
    await supabase
      .from("broker_contacts")
      .update({ status: next, updated_at: new Date().toISOString() })
      .eq("id", contactId);
  }

  return { ok: true, from: current };
}

/** Server-side helper used from outside server actions (e.g. signNda). */
export async function autoAdvanceContactStatus(input: {
  brokerId: string;
  contactId?: string | null;
  buyerUserId?: string | null;
  target: BuyerCrmStatus;
  triggeredByKind?: CrmActivityKind;
}): Promise<void> {
  const supabase = createServiceRoleClient();
  let contactId = input.contactId ?? null;
  if (!contactId && input.buyerUserId) {
    const { data: row } = await supabase
      .from("broker_contacts")
      .select("id")
      .eq("broker_id", input.brokerId)
      .eq("buyer_user_id", input.buyerUserId)
      .maybeSingle();
    contactId = row?.id ?? null;
  }
  if (!contactId) return;
  await advanceStatusIfHigher(supabase, contactId, input.target, {
    triggeredByKind: input.triggeredByKind,
  });
}

// ─── Reads (used by the buyer panel + future dashboards) ─────────────────

/**
 * All open follow-ups for a broker, sorted soonest-first.
 *
 * Default scope: today + overdue (i.e. due_at <= end_of_today).
 */
export async function getFollowUpsDueToday(): Promise<CrmFollowUp[]> {
  const broker = await requireBroker();
  const supabase = createServiceRoleClient();

  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  let q = supabase
    .from("crm_follow_ups")
    .select("*")
    .is("completed_at", null)
    .lte("due_at", endOfToday.toISOString())
    .order("due_at", { ascending: true });

  if (broker.agencyId && broker.agencyRole === "owner") {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id")
      .eq("agency_id", broker.agencyId);
    const ids = (profiles ?? []).map((p) => p.id);
    if (ids.length > 0) q = q.in("broker_id", ids);
    else q = q.eq("broker_id", broker.id);
  } else {
    q = q.eq("broker_id", broker.id);
  }

  const { data } = await q;
  return (data ?? []) as CrmFollowUp[];
}

/** Activity timeline for a CRM contact (oldest pages via `before` cursor). */
export async function listActivitiesForContact(
  contactId: string,
  opts: { limit?: number; before?: string | null } = {},
): Promise<CrmActivity[]> {
  const broker = await requireBroker();
  const supabase = createServiceRoleClient();
  const contact = await loadContactScoped(supabase, broker, contactId);
  if (!contact) return [];

  let q = supabase
    .from("crm_activities")
    .select("*")
    .eq("contact_id", contactId)
    .order("occurred_at", { ascending: false })
    .limit(Math.min(100, Math.max(1, opts.limit ?? 30)));
  if (opts.before) q = q.lt("occurred_at", opts.before);

  const { data } = await q;
  return (data ?? []) as CrmActivity[];
}

/** Activity timeline for a buyer (across all of this broker's contacts). */
export async function listActivitiesForBuyer(
  buyerUserId: string,
  opts: { limit?: number; before?: string | null } = {},
): Promise<CrmActivity[]> {
  const broker = await requireBroker();
  const supabase = createServiceRoleClient();

  let q = supabase
    .from("crm_activities")
    .select("*")
    .eq("buyer_user_id", buyerUserId)
    .order("occurred_at", { ascending: false })
    .limit(Math.min(100, Math.max(1, opts.limit ?? 30)));
  if (opts.before) q = q.lt("occurred_at", opts.before);

  if (broker.agencyId && broker.agencyRole === "owner") {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id")
      .eq("agency_id", broker.agencyId);
    const ids = (profiles ?? []).map((p) => p.id);
    if (ids.length > 0) q = q.in("broker_id", ids);
    else q = q.eq("broker_id", broker.id);
  } else {
    q = q.eq("broker_id", broker.id);
  }

  const { data } = await q;
  return (data ?? []) as CrmActivity[];
}

// ─── Broker-wide activity feed (joined for the /activity page) ──────────

export type ActivityFeedItem = CrmActivity & {
  /** Resolved counterparty for display — falls back to email when name is null. */
  buyer_name: string | null;
  buyer_email: string | null;
  listing_title: string | null;
  listing_slug: string | null;
};

export async function listBrokerActivities(params: {
  q?: string;
  kinds?: CrmActivityKind[];
  fromIso?: string | null;
  toIso?: string | null;
  limit?: number;
  before?: string | null;
} = {}): Promise<ActivityFeedItem[]> {
  const broker = await requireBroker();
  const supabase = createServiceRoleClient();
  const limit = Math.min(200, Math.max(1, params.limit ?? 50));

  let q = supabase
    .from("crm_activities")
    .select("*")
    .order("occurred_at", { ascending: false })
    .limit(limit);

  if (broker.agencyId && broker.agencyRole === "owner") {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id")
      .eq("agency_id", broker.agencyId);
    const ids = (profiles ?? []).map((p) => p.id);
    if (ids.length > 0) q = q.in("broker_id", ids);
    else q = q.eq("broker_id", broker.id);
  } else {
    q = q.eq("broker_id", broker.id);
  }

  if (params.kinds?.length) q = q.in("kind", params.kinds);
  if (params.fromIso) q = q.gte("occurred_at", params.fromIso);
  if (params.toIso) q = q.lte("occurred_at", params.toIso);
  if (params.before) q = q.lt("occurred_at", params.before);

  const { data: rows } = await q;
  const activities = (rows ?? []) as CrmActivity[];
  if (activities.length === 0) return [];

  // Resolve buyer + listing labels in two batched calls.
  const buyerIds = Array.from(
    new Set(activities.map((a) => a.buyer_user_id).filter((x): x is string => !!x)),
  );
  const contactIds = Array.from(
    new Set(activities.map((a) => a.contact_id).filter((x): x is string => !!x)),
  );
  const listingIds = Array.from(
    new Set(activities.map((a) => a.listing_id).filter((x): x is string => !!x)),
  );

  const [{ data: contacts }, { data: profileRows }, { data: userRows }, { data: listings }] =
    await Promise.all([
      contactIds.length > 0
        ? supabase
            .from("broker_contacts")
            .select("id, name, email, buyer_user_id")
            .in("id", contactIds)
        : Promise.resolve({ data: [] as { id: string; name: string | null; email: string; buyer_user_id: string | null }[] }),
      buyerIds.length > 0
        ? supabase
            .from("profiles")
            .select("id, name")
            .in("id", buyerIds)
        : Promise.resolve({ data: [] as { id: string; name: string | null }[] }),
      buyerIds.length > 0
        ? supabase
            .from("users")
            .select("id, email")
            .in("id", buyerIds)
        : Promise.resolve({ data: [] as { id: string; email: string }[] }),
      listingIds.length > 0
        ? supabase
            .from("listings")
            .select("id, title, slug")
            .in("id", listingIds)
        : Promise.resolve({ data: [] as { id: string; title: string; slug: string }[] }),
    ]);

  const contactById = new Map(
    (contacts ?? []).map((c) => [
      c.id,
      { name: c.name as string | null, email: c.email as string, buyer_user_id: c.buyer_user_id as string | null },
    ]),
  );
  const profileById = new Map(
    (profileRows ?? []).map((p) => [p.id, (p.name as string | null) ?? null]),
  );
  const emailById = new Map(
    (userRows ?? []).map((u) => [u.id, u.email as string]),
  );
  const listingById = new Map(
    (listings ?? []).map((l) => [
      l.id,
      { title: l.title as string, slug: l.slug as string },
    ]),
  );

  let result: ActivityFeedItem[] = activities.map((a) => {
    const contact = a.contact_id ? contactById.get(a.contact_id) : null;
    const buyerName =
      (a.buyer_user_id ? profileById.get(a.buyer_user_id) : null) ??
      contact?.name ??
      null;
    const buyerEmail =
      (a.buyer_user_id ? emailById.get(a.buyer_user_id) : null) ??
      contact?.email ??
      null;
    const listing = a.listing_id ? listingById.get(a.listing_id) : null;
    return {
      ...a,
      buyer_name: buyerName,
      buyer_email: buyerEmail,
      listing_title: listing?.title ?? null,
      listing_slug: listing?.slug ?? null,
    };
  });

  if (params.q?.trim()) {
    const needle = params.q.trim().toLowerCase();
    result = result.filter((r) => {
      const blob =
        `${r.buyer_name ?? ""} ${r.buyer_email ?? ""} ${r.listing_title ?? ""} ${r.subject ?? ""} ${r.body ?? ""}`.toLowerCase();
      return blob.includes(needle);
    });
  }

  return result;
}

// ─── All follow-ups for the /follow-ups page ─────────────────────────────

export type FollowUpScope =
  | "all_open"
  | "today"
  | "overdue"
  | "upcoming"
  | "completed";

export type FollowUpFeedItem = CrmFollowUp & {
  buyer_name: string | null;
  buyer_email: string | null;
  listing_title: string | null;
};

export async function listFollowUps(
  scope: FollowUpScope = "all_open",
  params: { q?: string; limit?: number } = {},
): Promise<FollowUpFeedItem[]> {
  const broker = await requireBroker();
  const supabase = createServiceRoleClient();
  const limit = Math.min(500, Math.max(1, params.limit ?? 200));

  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);

  let q = supabase.from("crm_follow_ups").select("*").limit(limit);

  if (broker.agencyId && broker.agencyRole === "owner") {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id")
      .eq("agency_id", broker.agencyId);
    const ids = (profiles ?? []).map((p) => p.id);
    if (ids.length > 0) q = q.in("broker_id", ids);
    else q = q.eq("broker_id", broker.id);
  } else {
    q = q.eq("broker_id", broker.id);
  }

  if (scope === "completed") {
    q = q.not("completed_at", "is", null).order("completed_at", { ascending: false });
  } else if (scope === "overdue") {
    q = q
      .is("completed_at", null)
      .lt("due_at", startOfToday.toISOString())
      .order("due_at", { ascending: true });
  } else if (scope === "today") {
    q = q
      .is("completed_at", null)
      .gte("due_at", startOfToday.toISOString())
      .lte("due_at", endOfToday.toISOString())
      .order("due_at", { ascending: true });
  } else if (scope === "upcoming") {
    q = q
      .is("completed_at", null)
      .gt("due_at", endOfToday.toISOString())
      .order("due_at", { ascending: true });
  } else {
    // all_open
    q = q.is("completed_at", null).order("due_at", { ascending: true });
  }

  const { data: rows } = await q;
  const followUps = (rows ?? []) as CrmFollowUp[];
  if (followUps.length === 0) return [];

  const contactIds = Array.from(
    new Set(followUps.map((f) => f.contact_id).filter((x): x is string => !!x)),
  );
  const buyerIds = Array.from(
    new Set(followUps.map((f) => f.buyer_user_id).filter((x): x is string => !!x)),
  );
  const listingIds = Array.from(
    new Set(followUps.map((f) => f.listing_id).filter((x): x is string => !!x)),
  );

  const [{ data: contacts }, { data: profileRows }, { data: userRows }, { data: listings }] =
    await Promise.all([
      contactIds.length > 0
        ? supabase
            .from("broker_contacts")
            .select("id, name, email")
            .in("id", contactIds)
        : Promise.resolve({ data: [] as { id: string; name: string | null; email: string }[] }),
      buyerIds.length > 0
        ? supabase
            .from("profiles")
            .select("id, name")
            .in("id", buyerIds)
        : Promise.resolve({ data: [] as { id: string; name: string | null }[] }),
      buyerIds.length > 0
        ? supabase.from("users").select("id, email").in("id", buyerIds)
        : Promise.resolve({ data: [] as { id: string; email: string }[] }),
      listingIds.length > 0
        ? supabase.from("listings").select("id, title").in("id", listingIds)
        : Promise.resolve({ data: [] as { id: string; title: string }[] }),
    ]);

  const contactById = new Map(
    (contacts ?? []).map((c) => [
      c.id,
      { name: c.name as string | null, email: c.email as string },
    ]),
  );
  const profileById = new Map(
    (profileRows ?? []).map((p) => [p.id, (p.name as string | null) ?? null]),
  );
  const emailById = new Map((userRows ?? []).map((u) => [u.id, u.email as string]));
  const listingById = new Map(
    (listings ?? []).map((l) => [l.id, l.title as string]),
  );

  let result: FollowUpFeedItem[] = followUps.map((f) => {
    const contact = f.contact_id ? contactById.get(f.contact_id) : null;
    return {
      ...f,
      buyer_name:
        (f.buyer_user_id ? profileById.get(f.buyer_user_id) : null) ??
        contact?.name ??
        null,
      buyer_email:
        (f.buyer_user_id ? emailById.get(f.buyer_user_id) : null) ??
        contact?.email ??
        null,
      listing_title: f.listing_id ? (listingById.get(f.listing_id) ?? null) : null,
    };
  });

  if (params.q?.trim()) {
    const needle = params.q.trim().toLowerCase();
    result = result.filter((r) => {
      const blob =
        `${r.buyer_name ?? ""} ${r.buyer_email ?? ""} ${r.title} ${r.notes ?? ""} ${r.listing_title ?? ""}`.toLowerCase();
      return blob.includes(needle);
    });
  }

  return result;
}

// ─── Internal helpers ────────────────────────────────────────────────────

/** Set broker_contacts.next_follow_up_at to the soonest open follow-up's due_at. */
async function refreshNextFollowUpMirror(
  supabase: ReturnType<typeof createServiceRoleClient>,
  contactId: string,
) {
  const { data: rows } = await supabase
    .from("crm_follow_ups")
    .select("due_at")
    .eq("contact_id", contactId)
    .is("completed_at", null)
    .order("due_at", { ascending: true })
    .limit(1);
  const next = rows?.[0]?.due_at ?? null;
  await supabase
    .from("broker_contacts")
    .update({
      next_follow_up_at: next,
      updated_at: new Date().toISOString(),
    })
    .eq("id", contactId);
}

/**
 * Notification fanout for the daily follow-up cron. Exported so the cron
 * script can call it without re-implementing the broker scoping.
 *
 * Emits one `follow_up_due` notification per open follow-up where due_at
 * falls within today AEST.
 */
export async function emitFollowUpDueNotifications(): Promise<{ sent: number }> {
  const supabase = createServiceRoleClient();

  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);

  const { data: due } = await supabase
    .from("crm_follow_ups")
    .select("id, broker_id, contact_id, buyer_user_id, title, due_at")
    .is("completed_at", null)
    .gte("due_at", startOfToday.toISOString())
    .lte("due_at", endOfToday.toISOString());

  let sent = 0;
  for (const f of due ?? []) {
    await createNotification({
      userId: f.broker_id,
      type: "follow_up_due",
      title: `Follow-up due: ${f.title}`,
      message: f.contact_id
        ? "Open the CRM to act on it."
        : "Open your follow-ups list to act on it.",
      link: `/dashboard/contacts?follow_up=${f.id}`,
    }).catch(() => {});
    sent++;
  }
  return { sent };
}
