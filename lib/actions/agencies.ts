"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { generateSlugFromName } from "@/lib/slug";
import { nanoid } from "nanoid";
import { Resend } from "resend";
import { brokerInvitationEmail } from "@/lib/email-templates";
import type { Agency, AgencyBroker, AgencyInvitation } from "@/lib/types/agencies";

const resend = new Resend(process.env.RESEND_API_KEY);
const EMAIL_FROM = process.env.EMAIL_FROM ?? "noreply@salebiz.com.au";
const APP_URL = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
const INVITATION_EXPIRY_DAYS = 7;

async function requireBroker() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "broker") {
    throw new Error("Unauthorized");
  }
  return { session, userId: session.user.id };
}

async function requireAgencyOwner() {
  const { session, userId } = await requireBroker();
  if (!session.user.agencyId || session.user.agencyRole !== "owner") {
    throw new Error("Only agency owners can perform this action.");
  }
  return { session, userId, agencyId: session.user.agencyId };
}

/** Get the current broker's agency. */
export async function getMyAgency(): Promise<Agency | null> {
  const { session } = await requireBroker();
  if (!session.user.agencyId) return null;
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("agencies")
    .select("*")
    .eq("id", session.user.agencyId)
    .single();
  if (error || !data) return null;
  return data as Agency;
}

/** Agency owner: update agency profile. */
export async function updateAgency(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const { agencyId } = await requireAgencyOwner();
  const supabase = createServiceRoleClient();

  const name = (formData.get("name") as string)?.trim();
  if (!name) return { ok: false, error: "Agency name is required." };

  const phone = (formData.get("phone") as string)?.trim() || null;
  const email = (formData.get("email") as string)?.trim() || null;
  const website = (formData.get("website") as string)?.trim() || null;
  const bio = (formData.get("bio") as string)?.trim() || null;
  let slug = (formData.get("slug") as string)?.trim() || null;

  const linkedin = (formData.get("social_linkedin") as string)?.trim() || undefined;
  const facebook = (formData.get("social_facebook") as string)?.trim() || undefined;
  const instagram = (formData.get("social_instagram") as string)?.trim() || undefined;
  const social_links = linkedin || facebook || instagram
    ? { linkedin, facebook, instagram }
    : null;

  // Auto-generate slug if not provided
  if (!slug) {
    slug = generateSlugFromName(name);
  }

  // Check slug uniqueness (exclude current agency)
  const { data: existing } = await supabase
    .from("agencies")
    .select("id")
    .eq("slug", slug)
    .neq("id", agencyId)
    .limit(1);
  if (existing && existing.length > 0) {
    return { ok: false, error: "This URL slug is already taken." };
  }

  const { error } = await supabase
    .from("agencies")
    .update({
      name,
      slug,
      phone,
      email,
      website,
      bio,
      social_links,
      updated_at: new Date().toISOString(),
    })
    .eq("id", agencyId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** Agency owner: upload agency logo. */
export async function uploadAgencyLogo(formData: FormData): Promise<{ ok: boolean; url?: string; error?: string }> {
  const { agencyId } = await requireAgencyOwner();
  const file = formData.get("file") as File | null;
  if (!file?.size) return { ok: false, error: "No file provided." };
  if (file.size > 5 * 1024 * 1024) return { ok: false, error: "File must be under 5MB." };
  const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"];
  if (!allowed.includes(file.type)) return { ok: false, error: "Only JPEG, PNG, WebP, GIF and SVG are allowed." };

  const supabase = createServiceRoleClient();
  const ext = file.name.split(".").pop() || "png";
  const path = `agency-${agencyId}/logo.${ext}`;

  const { error: uploadError } = await supabase.storage.from("logos").upload(path, file, {
    upsert: true,
    contentType: file.type,
  });
  if (uploadError) return { ok: false, error: uploadError.message };

  const { data: urlData } = supabase.storage.from("logos").getPublicUrl(path);
  const url = urlData.publicUrl;

  const { error: updateError } = await supabase
    .from("agencies")
    .update({ logo_url: url, updated_at: new Date().toISOString() })
    .eq("id", agencyId);
  if (updateError) return { ok: false, error: updateError.message, url };

  return { ok: true, url };
}

/** Agency owner: list brokers in the agency. */
export async function getAgencyBrokers(): Promise<AgencyBroker[]> {
  const { agencyId } = await requireAgencyOwner();
  const supabase = createServiceRoleClient();

  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, name, phone, photo_url, agency_role, created_at")
    .eq("agency_id", agencyId)
    .eq("role", "broker")
    .order("created_at", { ascending: true });
  if (error || !profiles?.length) return [];

  const ids = profiles.map((p) => p.id);
  const { data: users } = await supabase
    .from("users")
    .select("id, email")
    .in("id", ids);
  const emailMap = new Map((users ?? []).map((u) => [u.id, u.email]));

  return profiles.map((p) => ({
    id: p.id,
    email: emailMap.get(p.id) ?? "",
    name: p.name ?? null,
    phone: p.phone ?? null,
    photo_url: p.photo_url ?? null,
    agency_role: (p.agency_role as "owner" | "member") ?? "member",
    created_at: p.created_at,
  }));
}

/** Agency owner: remove a broker from the agency. Cannot remove self (owner). */
export async function removeAgencyBroker(brokerId: string): Promise<{ ok: boolean; error?: string }> {
  const { agencyId, userId } = await requireAgencyOwner();
  if (brokerId === userId) {
    return { ok: false, error: "You cannot remove yourself from the agency." };
  }
  const supabase = createServiceRoleClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, agency_id, agency_role")
    .eq("id", brokerId)
    .single();
  if (!profile || profile.agency_id !== agencyId) {
    return { ok: false, error: "Broker not found in your agency." };
  }
  const { error } = await supabase
    .from("profiles")
    .update({ agency_id: null, agency_role: null, updated_at: new Date().toISOString() })
    .eq("id", brokerId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/* ------------------------------------------------------------------ */
/*  Invitations                                                        */
/* ------------------------------------------------------------------ */

/** Agency owner: invite a broker by email. */
export async function inviteBroker(email: string): Promise<{ ok: boolean; error?: string }> {
  const { agencyId, userId } = await requireAgencyOwner();
  const normalizedEmail = email?.toLowerCase().trim();
  if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return { ok: false, error: "Please enter a valid email address." };
  }

  const supabase = createServiceRoleClient();

  // Check if this email already belongs to a broker in this agency
  const { data: existingUser } = await supabase
    .from("users")
    .select("id")
    .eq("email", normalizedEmail)
    .single();

  if (existingUser) {
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id, agency_id")
      .eq("id", existingUser.id)
      .single();

    if (existingProfile?.agency_id === agencyId) {
      return { ok: false, error: "This person is already a member of your agency." };
    }
    if (existingProfile?.agency_id) {
      return { ok: false, error: "This person already belongs to another agency." };
    }
  }

  // Check for existing pending invitation
  const { data: existingInvite } = await supabase
    .from("agency_invitations")
    .select("id, expires_at")
    .eq("agency_id", agencyId)
    .eq("email", normalizedEmail)
    .eq("status", "pending")
    .single();

  if (existingInvite) {
    // Resend the existing invitation instead of creating a duplicate
    return resendInvitation(existingInvite.id);
  }

  // Get agency info for the email
  const { data: agency } = await supabase
    .from("agencies")
    .select("name")
    .eq("id", agencyId)
    .single();

  // Get inviter name
  const { data: inviterProfile } = await supabase
    .from("profiles")
    .select("name")
    .eq("id", userId)
    .single();

  const token = nanoid(32);
  const expiresAt = new Date(Date.now() + INVITATION_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  const { error: insertError } = await supabase
    .from("agency_invitations")
    .insert({
      agency_id: agencyId,
      email: normalizedEmail,
      token,
      status: "pending",
      invited_by: userId,
      expires_at: expiresAt.toISOString(),
    });

  if (insertError) return { ok: false, error: "Failed to create invitation." };

  // Send invitation email
  const joinUrl = `${APP_URL}/auth/join?token=${token}`;
  await resend.emails.send({
    from: EMAIL_FROM,
    to: normalizedEmail,
    subject: `You're invited to join ${agency?.name ?? "an agency"} on Salebiz`,
    html: brokerInvitationEmail({
      agencyName: agency?.name ?? "Agency",
      inviterName: inviterProfile?.name ?? null,
      joinUrl,
      expiresInDays: INVITATION_EXPIRY_DAYS,
    }),
  }).catch(() => {});

  return { ok: true };
}

/** Agency owner: get pending invitations for the agency. */
export async function getPendingInvitations(): Promise<AgencyInvitation[]> {
  const { agencyId } = await requireAgencyOwner();
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from("agency_invitations")
    .select("*")
    .eq("agency_id", agencyId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data as AgencyInvitation[];
}

/** Agency owner: resend an invitation email. */
export async function resendInvitation(invitationId: string): Promise<{ ok: boolean; error?: string }> {
  const { agencyId, userId } = await requireAgencyOwner();
  const supabase = createServiceRoleClient();

  const { data: invitation } = await supabase
    .from("agency_invitations")
    .select("*")
    .eq("id", invitationId)
    .eq("agency_id", agencyId)
    .eq("status", "pending")
    .single();

  if (!invitation) return { ok: false, error: "Invitation not found." };

  // Refresh the token and expiry
  const newToken = nanoid(32);
  const newExpiry = new Date(Date.now() + INVITATION_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  const { error: updateError } = await supabase
    .from("agency_invitations")
    .update({ token: newToken, expires_at: newExpiry.toISOString() })
    .eq("id", invitationId);

  if (updateError) return { ok: false, error: "Failed to refresh invitation." };

  const { data: agency } = await supabase
    .from("agencies")
    .select("name")
    .eq("id", agencyId)
    .single();

  const { data: inviterProfile } = await supabase
    .from("profiles")
    .select("name")
    .eq("id", userId)
    .single();

  const joinUrl = `${APP_URL}/auth/join?token=${newToken}`;
  await resend.emails.send({
    from: EMAIL_FROM,
    to: invitation.email,
    subject: `Reminder: You're invited to join ${agency?.name ?? "an agency"} on Salebiz`,
    html: brokerInvitationEmail({
      agencyName: agency?.name ?? "Agency",
      inviterName: inviterProfile?.name ?? null,
      joinUrl,
      expiresInDays: INVITATION_EXPIRY_DAYS,
    }),
  }).catch(() => {});

  return { ok: true };
}

/** Agency owner: revoke a pending invitation. */
export async function revokeInvitation(invitationId: string): Promise<{ ok: boolean; error?: string }> {
  const { agencyId } = await requireAgencyOwner();
  const supabase = createServiceRoleClient();

  const { error } = await supabase
    .from("agency_invitations")
    .delete()
    .eq("id", invitationId)
    .eq("agency_id", agencyId)
    .eq("status", "pending");

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** Public: get agency by slug. */
export async function getAgencyBySlug(slug: string): Promise<Agency | null> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("agencies")
    .select("*")
    .eq("slug", slug)
    .eq("status", "active")
    .single();
  if (error || !data) return null;
  return data as Agency;
}
