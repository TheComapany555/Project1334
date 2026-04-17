"use server";

import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import { Resend } from "resend";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { externalShareInviteEmail } from "@/lib/email-templates";
import { generateSlugFromName } from "@/lib/slug";
import { checkSlugAvailable } from "@/lib/actions/profile";
import type {
  AcceptInviteResult,
  CreateInviteResult,
  InvitePublicData,
} from "@/lib/types/share-invites";

const resend = new Resend(process.env.RESEND_API_KEY);
const EMAIL_FROM = process.env.EMAIL_FROM ?? "noreply@salebiz.com.au";
const APP_URL = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
const INVITE_EXPIRES_DAYS = 30;

async function generateUniqueSlug(name: string): Promise<string> {
  const base = generateSlugFromName(name);
  let candidate = base;
  let n = 0;
  while (!(await checkSlugAvailable(candidate))) {
    n += 1;
    candidate = `${base}-${n}`;
  }
  return candidate;
}

async function requireBroker() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "broker") {
    throw new Error("Unauthorized");
  }
  return {
    userId: session.user.id,
    agencyId: session.user.agencyId ?? null,
    agencyRole: session.user.agencyRole ?? null,
  };
}

async function verifyListingOwnership(listingId: string, userId: string): Promise<boolean> {
  const supabase = createServiceRoleClient();
  const { data: listing } = await supabase
    .from("listings")
    .select("id, broker_id, agency_id")
    .eq("id", listingId)
    .single();
  if (!listing) return false;
  if (listing.broker_id === userId) return true;
  if (!listing.agency_id) return false;
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

/**
 * Broker creates an external share invite. Sends an email with a magic link
 * that lands on /invite/[token] for NDA + account creation.
 */
export async function createExternalShareInvite(input: {
  listingId: string;
  recipientName: string;
  recipientEmail: string;
  customMessage?: string;
}): Promise<CreateInviteResult> {
  const { userId } = await requireBroker();

  const listingId = input.listingId;
  const recipientName = input.recipientName?.trim() || null;
  const recipientEmail = input.recipientEmail?.trim().toLowerCase();
  const customMessage = input.customMessage?.trim() || null;

  if (!recipientEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)) {
    return { ok: false, error: "Please enter a valid recipient email." };
  }

  if (!(await verifyListingOwnership(listingId, userId))) {
    return { ok: false, error: "You do not own this listing." };
  }

  const supabase = createServiceRoleClient();

  const [{ data: listing }, { data: broker }, { data: nda }] = await Promise.all([
    supabase
      .from("listings")
      .select("id, title, slug, asking_price, price_type, location_text")
      .eq("id", listingId)
      .single(),
    supabase
      .from("profiles")
      .select("name, company, slug, photo_url")
      .eq("id", userId)
      .single(),
    supabase
      .from("listing_ndas")
      .select("is_required")
      .eq("listing_id", listingId)
      .single(),
  ]);

  if (!listing) return { ok: false, error: "Listing not found." };

  const { data: brokerUser } = await supabase
    .from("users")
    .select("email")
    .eq("id", userId)
    .single();

  const token = nanoid(32);
  const expiresAt = new Date(Date.now() + INVITE_EXPIRES_DAYS * 24 * 60 * 60 * 1000);

  const { data: invite, error: insertError } = await supabase
    .from("listing_share_invites")
    .insert({
      listing_id: listing.id,
      broker_id: userId,
      recipient_name: recipientName,
      recipient_email: recipientEmail,
      token,
      expires_at: expiresAt.toISOString(),
      broker_name_snapshot: broker?.name ?? null,
      broker_email_snapshot: brokerUser?.email ?? null,
      custom_message: customMessage,
      send_type: "external",
    })
    .select("id")
    .single();

  if (insertError || !invite) {
    return { ok: false, error: "Failed to create invite." };
  }

  const inviteUrl = `${APP_URL}/invite/${token}`;
  const brokerName = broker?.name || broker?.company || "A broker";
  const brokerProfileUrl = broker?.slug
    ? `${APP_URL}/broker/${encodeURIComponent(broker.slug)}`
    : null;
  const price =
    listing.price_type === "poa"
      ? "Price on application"
      : listing.asking_price != null
        ? new Intl.NumberFormat("en-AU", {
            style: "currency",
            currency: "AUD",
            maximumFractionDigits: 0,
          }).format(Number(listing.asking_price))
        : null;

  await resend.emails
    .send({
      from: EMAIL_FROM,
      to: recipientEmail,
      subject: `${brokerName} shared a listing with you: ${listing.title}`,
      html: externalShareInviteEmail({
        recipientName,
        brokerName,
        brokerCompany: broker?.company ?? null,
        brokerPhotoUrl: broker?.photo_url ?? null,
        brokerProfileUrl,
        listingTitle: listing.title,
        inviteUrl,
        price,
        location: listing.location_text,
        customMessage,
        ndaRequired: !!nda?.is_required,
        expiresInDays: INVITE_EXPIRES_DAYS,
      }),
    })
    .catch(() => {});

  return { ok: true, inviteId: invite.id, url: inviteUrl };
}

/**
 * Public: fetch invite info for the landing page. Marks `opened_at` on first read.
 */
export async function getInviteByToken(token: string): Promise<InvitePublicData | null> {
  if (!token) return null;
  const supabase = createServiceRoleClient();

  const { data: invite } = await supabase
    .from("listing_share_invites")
    .select(
      "id, listing_id, broker_id, recipient_name, recipient_email, token, expires_at, opened_at, account_created_user_id, custom_message, broker_name_snapshot"
    )
    .eq("token", token)
    .single();
  if (!invite) return null;

  if (!invite.opened_at) {
    await supabase
      .from("listing_share_invites")
      .update({ opened_at: new Date().toISOString() })
      .eq("id", invite.id);
  }

  const expired = new Date(invite.expires_at) < new Date();
  const consumed = !!invite.account_created_user_id;

  const [{ data: listing }, { data: brokerProfile }, { data: nda }] = await Promise.all([
    supabase
      .from("listings")
      .select("id, title, slug, location_text, summary, asking_price, price_type")
      .eq("id", invite.listing_id)
      .single(),
    supabase
      .from("profiles")
      .select("name, company, slug, photo_url")
      .eq("id", invite.broker_id)
      .single(),
    supabase
      .from("listing_ndas")
      .select("is_required, nda_text")
      .eq("listing_id", invite.listing_id)
      .single(),
  ]);

  if (!listing) return null;

  // Has the recipient (if they have an account) already signed the NDA?
  let ndaAlreadySigned = false;
  let alreadyAccountUserId: string | null = invite.account_created_user_id;
  if (!alreadyAccountUserId) {
    const { data: existingUser } = await supabase
      .from("users")
      .select("id")
      .eq("email", invite.recipient_email)
      .single();
    alreadyAccountUserId = existingUser?.id ?? null;
  }
  if (alreadyAccountUserId && nda?.is_required) {
    const { data: sig } = await supabase
      .from("nda_signatures")
      .select("id")
      .eq("listing_id", invite.listing_id)
      .eq("user_id", alreadyAccountUserId)
      .single();
    ndaAlreadySigned = !!sig;
  }

  return {
    token: invite.token,
    recipientEmail: invite.recipient_email,
    recipientName: invite.recipient_name,
    customMessage: invite.custom_message,
    expired,
    consumed,
    alreadyAccountUserId,
    ndaRequired: !!nda?.is_required,
    ndaText: nda?.nda_text ?? null,
    ndaAlreadySigned,
    listing,
    broker: {
      name: brokerProfile?.name ?? invite.broker_name_snapshot ?? null,
      company: brokerProfile?.company ?? null,
      photoUrl: brokerProfile?.photo_url ?? null,
      slug: brokerProfile?.slug ?? null,
    },
  };
}

/**
 * Public: accept the invite. If no account exists for the recipient email, create one.
 * If the listing has an NDA, record a signature. Marks the invite as consumed.
 *
 * If an account already exists for this email, returns an error asking the user
 * to log in (we don't log them in here for security).
 */
export async function acceptShareInvite(
  token: string,
  input: {
    fullName: string;
    password: string;
    signatureData?: string;
  }
): Promise<AcceptInviteResult> {
  if (!token) return { ok: false, error: "Invalid invite link." };

  const fullName = input.fullName?.trim();
  const password = input.password ?? "";
  const signatureData = input.signatureData?.trim() ?? "";

  if (!fullName || fullName.length < 2) {
    return { ok: false, error: "Please enter your full name." };
  }
  if (!password || password.length < 8) {
    return { ok: false, error: "Password must be at least 8 characters." };
  }

  const supabase = createServiceRoleClient();

  const { data: invite } = await supabase
    .from("listing_share_invites")
    .select("id, listing_id, broker_id, recipient_email, token, expires_at, account_created_user_id")
    .eq("token", token)
    .single();
  if (!invite) return { ok: false, error: "Invite not found." };
  if (new Date(invite.expires_at) < new Date()) {
    return { ok: false, error: "This invite has expired. Ask the broker to resend it." };
  }
  if (invite.account_created_user_id) {
    return { ok: false, error: "This invite has already been used. Please sign in instead." };
  }

  // Check NDA requirement
  const { data: nda } = await supabase
    .from("listing_ndas")
    .select("id, is_required")
    .eq("listing_id", invite.listing_id)
    .single();
  const ndaRequired = !!nda?.is_required;
  if (ndaRequired && !signatureData) {
    return { ok: false, error: "Please sign the NDA to continue." };
  }

  // Block if an account already exists for this email
  const { data: existingUser } = await supabase
    .from("users")
    .select("id")
    .eq("email", invite.recipient_email)
    .single();
  if (existingUser) {
    return {
      ok: false,
      error:
        "An account already exists for this email. Please sign in to continue, then return to this invite link.",
    };
  }

  // Listing must still exist and be visible
  const { data: listing } = await supabase
    .from("listings")
    .select("id, slug, status")
    .eq("id", invite.listing_id)
    .single();
  if (!listing) return { ok: false, error: "Listing is no longer available." };

  // Create the buyer account (auto-verified — invite proves email)
  const passwordHash = await bcrypt.hash(password, 12);
  const { data: newUser, error: userError } = await supabase
    .from("users")
    .insert({
      email: invite.recipient_email,
      password_hash: passwordHash,
      email_verified_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (userError || !newUser) {
    return { ok: false, error: "Failed to create account. Please try again." };
  }

  const profileSlug = await generateUniqueSlug(fullName);
  await supabase.from("profiles").insert({
    id: newUser.id,
    role: "user",
    status: "active",
    name: fullName,
    slug: profileSlug,
    updated_at: new Date().toISOString(),
  });

  // Sign the NDA if required
  if (ndaRequired) {
    await supabase.from("nda_signatures").insert({
      listing_id: invite.listing_id,
      user_id: newUser.id,
      signer_name: fullName,
      signer_email: invite.recipient_email,
      signature_data: signatureData,
      signed_at: new Date().toISOString(),
    });
  }

  // Mark the invite as consumed
  const now = new Date().toISOString();
  await supabase
    .from("listing_share_invites")
    .update({
      account_created_user_id: newUser.id,
      account_created_at: now,
      nda_signed_at: ndaRequired ? now : null,
    })
    .eq("id", invite.id);

  return {
    ok: true,
    listingSlug: listing.slug,
    createdAccount: true,
    email: invite.recipient_email,
  };
}

/**
 * If a logged-in user follows an invite link and the listing has an NDA,
 * they can sign the NDA here directly. Marks the invite as consumed.
 */
export async function signInviteNdaForExistingUser(
  token: string,
  signatureData: string,
  signerName: string
): Promise<{ ok: boolean; error?: string; listingSlug?: string }> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { ok: false, error: "Please sign in to continue." };
  }
  if (!signatureData?.trim() || !signerName?.trim()) {
    return { ok: false, error: "Signature and name are required." };
  }

  const supabase = createServiceRoleClient();
  const { data: invite } = await supabase
    .from("listing_share_invites")
    .select("id, listing_id, expires_at, account_created_user_id")
    .eq("token", token)
    .single();
  if (!invite) return { ok: false, error: "Invite not found." };
  if (new Date(invite.expires_at) < new Date()) {
    return { ok: false, error: "This invite has expired." };
  }

  const { data: listing } = await supabase
    .from("listings")
    .select("id, slug")
    .eq("id", invite.listing_id)
    .single();
  if (!listing) return { ok: false, error: "Listing is no longer available." };

  await supabase.from("nda_signatures").upsert(
    {
      listing_id: invite.listing_id,
      user_id: session.user.id,
      signer_name: signerName.trim(),
      signer_email: session.user.email ?? "",
      signature_data: signatureData,
      signed_at: new Date().toISOString(),
    },
    { onConflict: "listing_id,user_id" }
  );

  // Only mark as consumed if not already and no other account is on this invite
  if (!invite.account_created_user_id) {
    await supabase
      .from("listing_share_invites")
      .update({
        account_created_user_id: session.user.id,
        account_created_at: new Date().toISOString(),
        nda_signed_at: new Date().toISOString(),
      })
      .eq("id", invite.id);
  }

  return { ok: true, listingSlug: listing.slug };
}
