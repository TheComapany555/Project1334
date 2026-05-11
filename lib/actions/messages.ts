"use server";

import { Resend } from "resend";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { createNotification } from "@/lib/actions/notifications";
import { getOrCreateBrokerContactForBuyer } from "@/lib/actions/contacts";
import { autoAdvanceContactStatus, logActivity } from "@/lib/actions/crm";
import { bumpBuyerActivity } from "@/lib/actions/buyer-account";

// ─── Config ───────────────────────────────────────────────────────────────

const resend = new Resend(process.env.RESEND_API_KEY);
const EMAIL_FROM = process.env.EMAIL_FROM ?? "noreply@salebiz.com.au";
const APP_URL = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

/**
 * How long (in ms) we wait before re-sending an email-fallback notification
 * to the same recipient on the same thread. Buyers always get every message
 * via email; broker fallbacks are debounced because they're often online.
 */
const BROKER_EMAIL_DEBOUNCE_MS = 15 * 60 * 1000;

// ─── Types ────────────────────────────────────────────────────────────────

export type MessageRole = "broker" | "buyer";

export type MessageAttachment = {
  /** Storage path in the `message-attachments` bucket. Stored in DB. */
  path: string;
  name: string;
  size: number;
  mime: string;
  /** Signed URL — populated only on read paths. Never sent to writes. */
  url?: string;
};

const ATTACHMENT_MAX_BYTES = 25 * 1024 * 1024; // 25 MB
const ATTACHMENT_ALLOWED_MIMES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "text/csv",
]);
const ATTACHMENT_SIGNED_URL_TTL_SEC = 60 * 10; // 10 minutes

export type Message = {
  id: string;
  thread_id: string;
  sender_id: string;
  sender_role: MessageRole;
  body: string;
  attachments: MessageAttachment[];
  read_at: string | null;
  created_at: string;
};

export type ThreadSummary = {
  id: string;
  listing_id: string | null;
  listing_title: string | null;
  listing_slug: string | null;
  broker_id: string;
  buyer_user_id: string;
  /** The "other side" — counterparty info, role-aware. */
  counterparty: {
    name: string | null;
    email: string;
    photo_url: string | null;
    company: string | null;
  };
  last_message_at: string | null;
  last_message_preview: string | null;
  last_sender_role: MessageRole | null;
  unread_count: number;
};

// ─── Auth ─────────────────────────────────────────────────────────────────

async function requireSessionUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");
  const role = session.user.role;
  if (role !== "broker" && role !== "user") {
    throw new Error("Unauthorized");
  }
  return {
    id: session.user.id,
    role: role === "broker" ? ("broker" as const) : ("buyer" as const),
    email: session.user.email ?? null,
    name: session.user.name ?? null,
    agencyId: session.user.agencyId ?? null,
    agencyRole: session.user.agencyRole ?? null,
  };
}

/** Loads a thread + verifies the current session is a participant. */
async function loadThreadOrThrow(
  supabase: ReturnType<typeof createServiceRoleClient>,
  threadId: string,
  session: Awaited<ReturnType<typeof requireSessionUser>>,
): Promise<{
  id: string;
  listing_id: string | null;
  broker_id: string;
  buyer_user_id: string;
}> {
  const { data: thread } = await supabase
    .from("message_threads")
    .select("id, listing_id, broker_id, buyer_user_id")
    .eq("id", threadId)
    .maybeSingle();
  if (!thread) throw new Error("Thread not found");

  if (session.role === "buyer") {
    if (thread.buyer_user_id !== session.id) throw new Error("Forbidden");
  } else {
    // broker — owner directly OR agency owner over a teammate's thread
    if (thread.broker_id !== session.id) {
      if (session.agencyId && session.agencyRole === "owner") {
        const { data: ownerCheck } = await supabase
          .from("profiles")
          .select("agency_id")
          .eq("id", thread.broker_id)
          .maybeSingle();
        if (ownerCheck?.agency_id !== session.agencyId) {
          throw new Error("Forbidden");
        }
      } else {
        throw new Error("Forbidden");
      }
    }
  }
  return thread;
}

// ─── Reads ────────────────────────────────────────────────────────────────

/** Broker view: all threads they (or their agency) own. */
export async function listBrokerThreads(
  params: { q?: string; unreadOnly?: boolean; limit?: number } = {},
): Promise<ThreadSummary[]> {
  const session = await requireSessionUser();
  if (session.role !== "broker") throw new Error("Forbidden");
  const supabase = createServiceRoleClient();

  let q = supabase
    .from("message_threads")
    .select("id, listing_id, broker_id, buyer_user_id, last_message_at, last_message_preview, last_sender_role, broker_unread_count, archived_by_broker")
    .eq("archived_by_broker", false)
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .limit(Math.min(200, Math.max(1, params.limit ?? 100)));

  if (session.agencyId && session.agencyRole === "owner") {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id")
      .eq("agency_id", session.agencyId);
    const ids = (profiles ?? []).map((p) => p.id);
    if (ids.length > 0) q = q.in("broker_id", ids);
    else q = q.eq("broker_id", session.id);
  } else {
    q = q.eq("broker_id", session.id);
  }
  if (params.unreadOnly) q = q.gt("broker_unread_count", 0);

  const { data: threads } = await q;
  if (!threads?.length) return [];

  // Look up counterparties (buyers) and listings in two batched calls.
  const buyerIds = Array.from(new Set(threads.map((t) => t.buyer_user_id)));
  const listingIds = Array.from(
    new Set(threads.map((t) => t.listing_id).filter((x): x is string => !!x)),
  );

  const [{ data: buyers }, { data: users }, { data: listings }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, name, photo_url, company")
      .in("id", buyerIds),
    supabase.from("users").select("id, email").in("id", buyerIds),
    listingIds.length > 0
      ? supabase
          .from("listings")
          .select("id, title, slug")
          .in("id", listingIds)
      : Promise.resolve({ data: [] as { id: string; title: string; slug: string }[] }),
  ]);

  const buyerById = new Map(
    (buyers ?? []).map((b) => [
      b.id,
      { name: b.name as string | null, photo_url: b.photo_url as string | null, company: b.company as string | null },
    ]),
  );
  const emailById = new Map((users ?? []).map((u) => [u.id, u.email as string]));
  const listingById = new Map(
    (listings ?? []).map((l) => [l.id, { title: l.title as string, slug: l.slug as string }]),
  );

  const rows: ThreadSummary[] = threads.map((t) => {
    const buyer = buyerById.get(t.buyer_user_id);
    const listing = t.listing_id ? listingById.get(t.listing_id) : null;
    const text = (params.q ?? "").trim().toLowerCase();
    const summary: ThreadSummary = {
      id: t.id,
      listing_id: t.listing_id,
      listing_title: listing?.title ?? null,
      listing_slug: listing?.slug ?? null,
      broker_id: t.broker_id,
      buyer_user_id: t.buyer_user_id,
      counterparty: {
        name: buyer?.name ?? null,
        email: emailById.get(t.buyer_user_id) ?? "",
        photo_url: buyer?.photo_url ?? null,
        company: buyer?.company ?? null,
      },
      last_message_at: t.last_message_at,
      last_message_preview: t.last_message_preview,
      last_sender_role: (t.last_sender_role as MessageRole | null) ?? null,
      unread_count: t.broker_unread_count ?? 0,
    };
    if (!text) return summary;
    const blob = `${summary.counterparty.name ?? ""} ${summary.counterparty.email} ${summary.listing_title ?? ""} ${summary.last_message_preview ?? ""}`.toLowerCase();
    return blob.includes(text) ? summary : null;
  })
  .filter((x): x is ThreadSummary => !!x);

  return rows;
}

/** Buyer view: their own threads. */
export async function listBuyerThreads(): Promise<ThreadSummary[]> {
  const session = await requireSessionUser();
  if (session.role !== "buyer") throw new Error("Forbidden");
  const supabase = createServiceRoleClient();

  const { data: threads } = await supabase
    .from("message_threads")
    .select("id, listing_id, broker_id, buyer_user_id, last_message_at, last_message_preview, last_sender_role, buyer_unread_count")
    .eq("buyer_user_id", session.id)
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .limit(200);

  if (!threads?.length) return [];

  const brokerIds = Array.from(new Set(threads.map((t) => t.broker_id)));
  const listingIds = Array.from(
    new Set(threads.map((t) => t.listing_id).filter((x): x is string => !!x)),
  );

  const [{ data: brokers }, { data: brokerUsers }, { data: listings }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, name, photo_url, company")
      .in("id", brokerIds),
    supabase.from("users").select("id, email").in("id", brokerIds),
    listingIds.length > 0
      ? supabase
          .from("listings")
          .select("id, title, slug")
          .in("id", listingIds)
      : Promise.resolve({ data: [] as { id: string; title: string; slug: string }[] }),
  ]);

  const brokerById = new Map(
    (brokers ?? []).map((b) => [
      b.id,
      { name: b.name as string | null, photo_url: b.photo_url as string | null, company: b.company as string | null },
    ]),
  );
  const emailById = new Map((brokerUsers ?? []).map((u) => [u.id, u.email as string]));
  const listingById = new Map(
    (listings ?? []).map((l) => [l.id, { title: l.title as string, slug: l.slug as string }]),
  );

  return threads.map((t) => {
    const broker = brokerById.get(t.broker_id);
    const listing = t.listing_id ? listingById.get(t.listing_id) : null;
    return {
      id: t.id,
      listing_id: t.listing_id,
      listing_title: listing?.title ?? null,
      listing_slug: listing?.slug ?? null,
      broker_id: t.broker_id,
      buyer_user_id: t.buyer_user_id,
      counterparty: {
        name: broker?.name ?? null,
        email: emailById.get(t.broker_id) ?? "",
        photo_url: broker?.photo_url ?? null,
        company: broker?.company ?? null,
      },
      last_message_at: t.last_message_at,
      last_message_preview: t.last_message_preview,
      last_sender_role: (t.last_sender_role as MessageRole | null) ?? null,
      unread_count: t.buyer_unread_count ?? 0,
    };
  });
}

/** Page of messages, oldest-first within the page. Use `before` to paginate up. */
export async function getThreadMessages(
  threadId: string,
  opts: { limit?: number; before?: string | null } = {},
): Promise<{ messages: Message[]; hasMore: boolean }> {
  const session = await requireSessionUser();
  const supabase = createServiceRoleClient();
  await loadThreadOrThrow(supabase, threadId, session);

  const limit = Math.min(200, Math.max(1, opts.limit ?? 50));
  let q = supabase
    .from("messages")
    .select("*")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: false })
    .limit(limit + 1);
  if (opts.before) q = q.lt("created_at", opts.before);

  const { data } = await q;
  const rows = (data ?? []) as Message[];
  const hasMore = rows.length > limit;
  const messages = (hasMore ? rows.slice(0, limit) : rows).reverse();

  // Mint signed URLs for any attachments. Bucket is private — these
  // expire fast (10 min) and are never persisted on the message row.
  await hydrateAttachmentUrls(supabase, messages);

  return { messages, hasMore };
}

async function hydrateAttachmentUrls(
  supabase: ReturnType<typeof createServiceRoleClient>,
  messages: Message[],
): Promise<void> {
  const paths: string[] = [];
  for (const m of messages) {
    for (const a of m.attachments ?? []) {
      if (a.path) paths.push(a.path);
    }
  }
  if (paths.length === 0) return;

  const { data: signed } = await supabase.storage
    .from("message-attachments")
    .createSignedUrls(paths, ATTACHMENT_SIGNED_URL_TTL_SEC);
  const urlByPath = new Map<string, string>();
  for (const s of signed ?? []) {
    if (s.path && s.signedUrl) urlByPath.set(s.path, s.signedUrl);
  }
  for (const m of messages) {
    m.attachments = (m.attachments ?? []).map((a) => ({
      ...a,
      url: a.path ? urlByPath.get(a.path) : undefined,
    }));
  }
}

/**
 * Upload a single file to the private `message-attachments` bucket. Validates
 * file type + size, scopes the path under `<threadId>/<sender>/<filename>`.
 * Returns the storage path (not a URL) — the caller passes that path back
 * via `sendMessage({ attachments })`. Signed URLs are minted on read.
 */
export async function uploadMessageAttachment(
  threadId: string,
  formData: FormData,
): Promise<
  | { ok: true; attachment: MessageAttachment }
  | { ok: false; error: string }
> {
  const session = await requireSessionUser();
  const supabase = createServiceRoleClient();
  await loadThreadOrThrow(supabase, threadId, session);

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return { ok: false, error: "No file provided" };
  if (file.size > ATTACHMENT_MAX_BYTES) {
    return { ok: false, error: "File is too large (max 25 MB)" };
  }
  if (!ATTACHMENT_ALLOWED_MIMES.has(file.type)) {
    return {
      ok: false,
      error:
        "Unsupported file type. Allowed: PDF, images, Word, Excel, plain text.",
    };
  }

  const safeName = file.name.replace(/[^A-Za-z0-9._-]+/g, "_").slice(0, 120);
  const path = `${threadId}/${session.id}/${Date.now()}-${safeName}`;
  const arrayBuffer = await file.arrayBuffer();
  const { error } = await supabase.storage
    .from("message-attachments")
    .upload(path, Buffer.from(arrayBuffer), {
      contentType: file.type,
      cacheControl: "3600",
      upsert: false,
    });
  if (error) return { ok: false, error: error.message };

  return {
    ok: true,
    attachment: {
      path,
      name: file.name,
      size: file.size,
      mime: file.type,
    },
  };
}

/** Unread count for the bell badge. Role-aware. */
export async function getUnreadMessageCount(): Promise<number> {
  const session = await requireSessionUser();
  const supabase = createServiceRoleClient();
  const col =
    session.role === "broker" ? "broker_unread_count" : "buyer_unread_count";
  const filterCol = session.role === "broker" ? "broker_id" : "buyer_user_id";

  const { data } = await supabase
    .from("message_threads")
    .select(col)
    .eq(filterCol, session.id);

  let total = 0;
  for (const row of data ?? []) {
    total += (row as Record<string, number>)[col] ?? 0;
  }
  return total;
}

// ─── Writes ──────────────────────────────────────────────────────────────

/**
 * Idempotently get or create the (broker, buyer, listing) thread.
 *
 * The caller must be a participant: brokers can target any of their buyers;
 * buyers can target any broker who already has a CRM relationship with them
 * (we treat any prior interaction — enquiry, NDA sign — as authorisation).
 */
export async function getOrCreateThread(input: {
  brokerId: string;
  buyerUserId: string;
  listingId?: string | null;
}): Promise<
  | { ok: true; threadId: string; created: boolean }
  | { ok: false; error: string }
> {
  const session = await requireSessionUser();
  const supabase = createServiceRoleClient();

  // Authorisation
  if (session.role === "buyer") {
    if (session.id !== input.buyerUserId) return { ok: false, error: "Forbidden" };
    // Buyer must have some prior touch with this broker.
    const [{ count: contactCount }, { count: enquiryCount }] = await Promise.all(
      [
        supabase
          .from("broker_contacts")
          .select("id", { count: "exact", head: true })
          .eq("broker_id", input.brokerId)
          .eq("buyer_user_id", input.buyerUserId),
        supabase
          .from("enquiries")
          .select("id", { count: "exact", head: true })
          .eq("broker_id", input.brokerId)
          .eq("user_id", input.buyerUserId),
      ],
    );
    if ((contactCount ?? 0) + (enquiryCount ?? 0) === 0) {
      return { ok: false, error: "No relationship with this broker yet" };
    }
  } else {
    if (session.id !== input.brokerId) {
      // Allow agency owners to start threads on behalf of teammates.
      if (session.agencyId && session.agencyRole === "owner") {
        const { data: ownerCheck } = await supabase
          .from("profiles")
          .select("agency_id")
          .eq("id", input.brokerId)
          .maybeSingle();
        if (ownerCheck?.agency_id !== session.agencyId) {
          return { ok: false, error: "Forbidden" };
        }
      } else {
        return { ok: false, error: "Forbidden" };
      }
    }
  }

  // Try existing.
  let q = supabase
    .from("message_threads")
    .select("id")
    .eq("broker_id", input.brokerId)
    .eq("buyer_user_id", input.buyerUserId);
  q = input.listingId
    ? q.eq("listing_id", input.listingId)
    : q.is("listing_id", null);
  const { data: existing } = await q.maybeSingle();
  if (existing?.id) return { ok: true, threadId: existing.id, created: false };

  const { data: inserted, error } = await supabase
    .from("message_threads")
    .insert({
      broker_id: input.brokerId,
      buyer_user_id: input.buyerUserId,
      listing_id: input.listingId ?? null,
    })
    .select("id")
    .single();
  if (error || !inserted) {
    // Race fallback: re-read.
    let r = supabase
      .from("message_threads")
      .select("id")
      .eq("broker_id", input.brokerId)
      .eq("buyer_user_id", input.buyerUserId);
    r = input.listingId
      ? r.eq("listing_id", input.listingId)
      : r.is("listing_id", null);
    const { data: retry } = await r.maybeSingle();
    if (retry?.id) return { ok: true, threadId: retry.id, created: false };
    return { ok: false, error: error?.message ?? "Couldn't create thread" };
  }
  return { ok: true, threadId: inserted.id, created: true };
}

/**
 * Convenience for the broker side: open or create the thread for a CRM
 * contact. Used from the buyer slide-out panel's "Message" quick action so
 * the caller doesn't have to know the contact's broker_id (we read it
 * server-side and validate ownership).
 */
export async function startThreadFromContact(
  contactId: string,
  listingId?: string | null,
): Promise<{ ok: true; threadId: string } | { ok: false; error: string }> {
  const session = await requireSessionUser();
  if (session.role !== "broker") return { ok: false, error: "Forbidden" };
  const supabase = createServiceRoleClient();

  const { data: contact } = await supabase
    .from("broker_contacts")
    .select("id, broker_id, buyer_user_id")
    .eq("id", contactId)
    .maybeSingle();
  if (!contact) return { ok: false, error: "Contact not found" };
  if (!contact.buyer_user_id) {
    return {
      ok: false,
      error: "This contact doesn't have a Salebiz account yet — can't message them.",
    };
  }
  // Ownership check — solo broker, or agency owner over a teammate.
  if (contact.broker_id !== session.id) {
    if (!(session.agencyId && session.agencyRole === "owner")) {
      return { ok: false, error: "Forbidden" };
    }
    const { data: ownerCheck } = await supabase
      .from("profiles")
      .select("agency_id")
      .eq("id", contact.broker_id)
      .maybeSingle();
    if (ownerCheck?.agency_id !== session.agencyId) {
      return { ok: false, error: "Forbidden" };
    }
  }

  return await getOrCreateThread({
    brokerId: contact.broker_id,
    buyerUserId: contact.buyer_user_id,
    listingId: listingId ?? null,
  }).then((r) => (r.ok ? { ok: true, threadId: r.threadId } : r));
}

/**
 * Convenience for the broker side: open or create the thread tied to a
 * specific enquiry. Used by the "Reply via chat" affordance on the enquiries
 * page (M1.3 wiring).
 */
export async function startThreadFromEnquiry(
  enquiryId: string,
): Promise<
  | { ok: true; threadId: string }
  | { ok: false; error: string }
> {
  const session = await requireSessionUser();
  if (session.role !== "broker") return { ok: false, error: "Forbidden" };
  const supabase = createServiceRoleClient();

  const { data: e } = await supabase
    .from("enquiries")
    .select("id, broker_id, listing_id, user_id")
    .eq("id", enquiryId)
    .maybeSingle();
  if (!e) return { ok: false, error: "Enquiry not found" };
  if (e.broker_id !== session.id) {
    if (!(session.agencyId && session.agencyRole === "owner")) {
      return { ok: false, error: "Forbidden" };
    }
    const { data: ownerCheck } = await supabase
      .from("profiles")
      .select("agency_id")
      .eq("id", e.broker_id)
      .maybeSingle();
    if (ownerCheck?.agency_id !== session.agencyId) {
      return { ok: false, error: "Forbidden" };
    }
  }
  if (!e.user_id) {
    return { ok: false, error: "Enquiry was anonymous — buyer hasn't signed in" };
  }
  const r = await getOrCreateThread({
    brokerId: e.broker_id,
    buyerUserId: e.user_id,
    listingId: e.listing_id,
  });
  if (!r.ok) return r;
  return { ok: true, threadId: r.threadId };
}

/**
 * Send a message. Both broker and buyer use this.
 *
 * Side effects (sequenced after the insert):
 *   - the trigger on `messages` bumps the thread's last-message and unread mirrors.
 *   - mirror to crm_activities (broker side has the canonical timeline).
 *   - if broker→buyer and contact exists, auto-advance status `new_lead → contacted`.
 *   - bump the *recipient* buyer's `profiles.last_active_at` (if recipient is buyer).
 *   - create an in-app `message_received` notification for the recipient.
 *   - send a Resend email fallback to the recipient (always for buyers,
 *     debounced 15min for brokers).
 */
export async function sendMessage(input: {
  threadId: string;
  body: string;
  attachments?: MessageAttachment[];
}): Promise<{ ok: true; messageId: string } | { ok: false; error: string }> {
  const session = await requireSessionUser();
  const supabase = createServiceRoleClient();

  const body = input.body?.trim();
  if (!body) return { ok: false, error: "Message can't be empty" };
  if (body.length > 10_000) return { ok: false, error: "Message is too long" };

  const thread = await loadThreadOrThrow(supabase, input.threadId, session);

  // Strip any `url` clients may pass in — we only persist the storage path.
  const cleanAttachments = (input.attachments ?? []).map((a) => ({
    path: a.path,
    name: a.name,
    size: a.size,
    mime: a.mime,
  }));

  const { data: inserted, error } = await supabase
    .from("messages")
    .insert({
      thread_id: thread.id,
      sender_id: session.id,
      sender_role: session.role,
      body,
      attachments: cleanAttachments,
    })
    .select("id, created_at")
    .single();
  if (error || !inserted) {
    return { ok: false, error: error?.message ?? "Couldn't send message" };
  }

  // ── Side effects (best-effort, never block the success response) ──

  const recipientRole: MessageRole = session.role === "broker" ? "buyer" : "broker";
  const recipientUserId =
    recipientRole === "broker" ? thread.broker_id : thread.buyer_user_id;
  const senderName = session.name ?? null;

  // CRM mirror — broker view of the thread always lives in crm_activities.
  // For buyer→broker messages we still log under the broker (the contact_id
  // resolves from buyer_user_id automatically).
  await ensureContactAndMirror({
    supabase,
    brokerId: thread.broker_id,
    buyerUserId: thread.buyer_user_id,
    listingId: thread.listing_id,
    senderRole: session.role,
    body,
  });

  // Bump buyer activity when buyer sends.
  if (session.role === "buyer") void bumpBuyerActivity(session.id);

  // In-app + email notification for the recipient.
  void notifyRecipient({
    supabase,
    threadId: thread.id,
    recipientUserId,
    recipientRole,
    senderName,
    bodyPreview: body.slice(0, 140),
    listingId: thread.listing_id,
  });

  return { ok: true, messageId: inserted.id };
}

/**
 * Broker-only: post a "Here's a listing for you" message with title + price
 * + deep link. Uses the same `sendMessage` pipeline so CRM mirroring,
 * notifications, and email fallback all happen automatically.
 */
export async function sendListingInThread(
  threadId: string,
  listingId: string,
): Promise<{ ok: true; messageId: string } | { ok: false; error: string }> {
  const session = await requireSessionUser();
  if (session.role !== "broker") return { ok: false, error: "Forbidden" };
  const supabase = createServiceRoleClient();

  // Verify ownership of the listing.
  const { data: listing } = await supabase
    .from("listings")
    .select(
      "id, title, slug, asking_price, price_type, location_text, suburb, state, broker_id, agency_id",
    )
    .eq("id", listingId)
    .maybeSingle();
  if (!listing) return { ok: false, error: "Listing not found" };

  if (listing.broker_id !== session.id) {
    if (!(session.agencyId && session.agencyRole === "owner")) {
      return { ok: false, error: "Not your listing" };
    }
    if (listing.agency_id !== session.agencyId) {
      return { ok: false, error: "Not your agency's listing" };
    }
  }

  const priceLabel =
    listing.price_type === "poa"
      ? "Price on application"
      : listing.asking_price != null
        ? new Intl.NumberFormat("en-AU", {
            style: "currency",
            currency: "AUD",
            maximumFractionDigits: 0,
          }).format(Number(listing.asking_price))
        : null;
  const location =
    listing.location_text ??
    [listing.suburb, listing.state].filter(Boolean).join(", ");
  const url = `${APP_URL}/listing/${listing.slug}`;

  const body = [
    `Sharing this listing with you: ${listing.title}`,
    [location, priceLabel].filter(Boolean).join(" · "),
    "",
    `View it here: ${url}`,
  ]
    .filter(Boolean)
    .join("\n");

  return await sendMessage({ threadId, body });
}

/**
 * Broker-only: post an "Sign the NDA to access documents" message. Only
 * usable in listing-scoped threads — the link points at the listing's NDA.
 */
export async function requestNdaInThread(
  threadId: string,
): Promise<{ ok: true; messageId: string } | { ok: false; error: string }> {
  const session = await requireSessionUser();
  if (session.role !== "broker") return { ok: false, error: "Forbidden" };
  const supabase = createServiceRoleClient();

  const thread = await loadThreadOrThrow(supabase, threadId, session);
  if (!thread.listing_id) {
    return {
      ok: false,
      error: "This thread isn't tied to a listing. Open the listing thread to request an NDA.",
    };
  }
  const { data: listing } = await supabase
    .from("listings")
    .select("id, title, slug")
    .eq("id", thread.listing_id)
    .maybeSingle();
  if (!listing) return { ok: false, error: "Listing not found" };

  const url = `${APP_URL}/listing/${listing.slug}`;
  const body = [
    `To unlock the confidential documents for ${listing.title}, please sign the NDA here:`,
    "",
    url,
    "",
    "Once you've signed it I'll be able to share everything with you.",
  ].join("\n");

  return await sendMessage({ threadId, body });
}

/**
 * Mark all of the *other side's* messages as read, in the current session's
 * thread. Resets the matching unread counter on the thread row.
 */
export async function markThreadRead(
  threadId: string,
): Promise<{ ok: true; cleared: number } | { ok: false; error: string }> {
  const session = await requireSessionUser();
  const supabase = createServiceRoleClient();
  await loadThreadOrThrow(supabase, threadId, session);

  const otherSide: MessageRole = session.role === "broker" ? "buyer" : "broker";
  const counterCol =
    session.role === "broker" ? "broker_unread_count" : "buyer_unread_count";

  const { data: updated } = await supabase
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("thread_id", threadId)
    .eq("sender_role", otherSide)
    .is("read_at", null)
    .select("id");

  await supabase
    .from("message_threads")
    .update({ [counterCol]: 0, updated_at: new Date().toISOString() })
    .eq("id", threadId);

  return { ok: true, cleared: (updated ?? []).length };
}

// ─── Internals ────────────────────────────────────────────────────────────

async function ensureContactAndMirror(args: {
  supabase: ReturnType<typeof createServiceRoleClient>;
  brokerId: string;
  buyerUserId: string;
  listingId: string | null;
  senderRole: MessageRole;
  body: string;
}) {
  const { supabase, brokerId, buyerUserId, listingId, senderRole, body } = args;

  // Make sure a CRM row exists so the timeline mirror has somewhere to live.
  const { data: buyerUser } = await supabase
    .from("users")
    .select("email")
    .eq("id", buyerUserId)
    .maybeSingle();
  const { data: buyerProfile } = await supabase
    .from("profiles")
    .select("name, phone")
    .eq("id", buyerUserId)
    .maybeSingle();
  if (!buyerUser?.email) return;

  const ensure = await getOrCreateBrokerContactForBuyer({
    brokerId,
    buyerUserId,
    email: buyerUser.email,
    name: buyerProfile?.name ?? null,
    phone: buyerProfile?.phone ?? null,
    source: "manual",
  }).catch(() => null);
  if (!ensure || !ensure.ok) return;

  // logActivity needs a session, so we go direct here (we're already
  // service-role and we know exactly what we're inserting).
  await supabase.from("crm_activities").insert({
    broker_id: brokerId,
    contact_id: ensure.contactId,
    buyer_user_id: buyerUserId,
    listing_id: listingId,
    kind: senderRole === "broker" ? "message_sent" : "message_received",
    subject: senderRole === "broker" ? "Sent message" : "Received message",
    body: body.slice(0, 5000),
    metadata: { via: "in_platform_chat", direction: senderRole },
  });

  // Mirror the broker_contacts.last_contacted_at + auto-advance status when
  // it's the broker who sent.
  const occurredAt = new Date().toISOString();
  await supabase
    .from("broker_contacts")
    .update({
      last_contacted_at: occurredAt,
      updated_at: occurredAt,
    })
    .eq("id", ensure.contactId);

  if (senderRole === "broker") {
    void autoAdvanceContactStatus({
      brokerId,
      contactId: ensure.contactId,
      buyerUserId,
      target: "contacted",
      triggeredByKind: "message_sent",
    });
    // Defensive — also keep an audit trail via logActivity for parity with
    // other action paths (skipping side effects since we already mirrored).
    void logActivity({
      contactId: ensure.contactId,
      buyerUserId,
      listingId,
      kind: "message_sent",
      body: body.slice(0, 5000),
      applySideEffects: false,
    }).catch(() => {});
  }
}

async function notifyRecipient(args: {
  supabase: ReturnType<typeof createServiceRoleClient>;
  threadId: string;
  recipientUserId: string;
  recipientRole: MessageRole;
  senderName: string | null;
  bodyPreview: string;
  listingId: string | null;
}) {
  const {
    supabase,
    threadId,
    recipientUserId,
    recipientRole,
    senderName,
    bodyPreview,
    listingId,
  } = args;

  // In-app notification.
  const link =
    recipientRole === "broker"
      ? `/dashboard/messages?thread=${threadId}`
      : `/account?tab=messages&thread=${threadId}`;
  const title = senderName
    ? `New message from ${senderName}`
    : "You have a new message";
  await createNotification({
    userId: recipientUserId,
    type: "message_received",
    title,
    message: bodyPreview,
    link,
  }).catch(() => {});

  // Email fallback. Always for buyers; debounce 15min for brokers.
  if (recipientRole === "broker") {
    const { data: lastNotif } = await supabase
      .from("notifications")
      .select("created_at")
      .eq("user_id", recipientUserId)
      .eq("type", "message_received")
      .order("created_at", { ascending: false })
      .limit(2);
    const prev = lastNotif?.[1]?.created_at; // skip the one we just created
    if (
      prev &&
      Date.now() - new Date(prev).getTime() < BROKER_EMAIL_DEBOUNCE_MS
    ) {
      return; // recently emailed; skip
    }
  }

  const { data: recipientUser } = await supabase
    .from("users")
    .select("email")
    .eq("id", recipientUserId)
    .maybeSingle();
  if (!recipientUser?.email) return;

  const subject = senderName
    ? `New message from ${senderName}`
    : "You have a new message on Salebiz";
  const deepLink = `${APP_URL}${link}`;
  const html = `<!DOCTYPE html>
<html><body style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:#222;max-width:600px;margin:0 auto;padding:24px;">
  <p><strong>${escapeHtml(senderName ?? "Someone")}</strong> sent you a message${listingId ? " about a listing" : ""}.</p>
  <blockquote style="border-left:3px solid #ccc;padding:8px 14px;margin:14px 0;color:#444;">${escapeHtml(bodyPreview)}</blockquote>
  <p><a href="${deepLink}" style="display:inline-block;padding:10px 16px;background-color:#0d5c2f;color:white;text-decoration:none;border-radius:6px;">Open conversation</a></p>
  <p style="color:#888;font-size:12px;">Replies on this email are not received — please reply inside Salebiz.</p>
</body></html>`;
  await resend.emails
    .send({
      from: EMAIL_FROM,
      to: recipientUser.email,
      subject,
      html,
      text: `${senderName ?? "Someone"} sent you a message:\n\n${bodyPreview}\n\nOpen: ${deepLink}`,
    })
    .catch(() => undefined);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
