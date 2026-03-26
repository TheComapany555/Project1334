"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { generateSlugFromName } from "@/lib/slug";
import { Resend } from "resend";
import { verificationEmail, passwordResetEmail, adminBrokerSignupEmail } from "@/lib/email-templates";
import { createNotification } from "@/lib/actions/notifications";
import { verifyRecaptcha } from "@/lib/recaptcha";
import { checkSlugAvailable } from "@/lib/actions/profile";

const resend = new Resend(process.env.RESEND_API_KEY);

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
const EMAIL_FROM = process.env.EMAIL_FROM ?? "noreply@salebiz.com.au";
const APP_URL = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

export type RegisterResult = { ok: true } | { ok: false; error: string };

export async function register(formData: FormData): Promise<RegisterResult> {
  const email = (formData.get("email") as string)?.toLowerCase().trim();
  const password = formData.get("password") as string;
  const name = (formData.get("name") as string)?.trim();
  const companyName = (formData.get("company") as string)?.trim();
  const captchaToken = formData.get("captchaToken") as string | null;

  const captchaOk = await verifyRecaptcha(captchaToken);
  if (!captchaOk) {
    return { ok: false, error: "CAPTCHA verification failed. Please try again." };
  }

  if (!email || !password) {
    return { ok: false, error: "Email and password are required." };
  }
  if (password.length < 8) {
    return { ok: false, error: "Password must be at least 8 characters." };
  }
  if (!companyName) {
    return { ok: false, error: "Agency / company name is required." };
  }

  const supabase = createServiceRoleClient();
  const { data: existing } = await supabase.from("users").select("id").eq("email", email).single();
  if (existing) {
    return { ok: false, error: "An account with this email already exists." };
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const { data: newUser, error: insertError } = await supabase
    .from("users")
    .insert({
      email,
      password_hash: passwordHash,
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (insertError || !newUser) {
    return { ok: false, error: "Failed to create account. Please try again." };
  }

  // Create the agency for this new account
  const agencySlug = generateSlugFromName(companyName);
  const { data: agency, error: agencyError } = await supabase
    .from("agencies")
    .insert({
      name: companyName,
      slug: agencySlug,
      status: "pending",
    })
    .select("id")
    .single();

  if (agencyError || !agency) {
    return { ok: false, error: "Failed to create agency. Please try again." };
  }

  // Create profile linked to the agency as owner
  const profileSlug = name ? await generateUniqueSlug(name) : null;
  await supabase.from("profiles").insert({
    id: newUser.id,
    role: "broker",
    status: "pending",
    name: name || null,
    company: companyName,
    slug: profileSlug,
    agency_id: agency.id,
    agency_role: "owner",
    updated_at: new Date().toISOString(),
  });

  const token = nanoid(32);
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h
  await supabase.from("auth_tokens").insert({
    user_id: newUser.id,
    type: "email_verification",
    token,
    expires_at: expiresAt.toISOString(),
  });

  const verifyUrl = `${APP_URL}/auth/verify?token=${token}`;
  await resend.emails.send({
    from: EMAIL_FROM,
    to: email,
    subject: "Verify your Salebiz account",
    html: verificationEmail(verifyUrl, name ?? "there"),
  }).catch(() => {}); // don't block registration if email fails

  return { ok: true };
}

export async function verifyEmailToken(token: string): Promise<{ ok: boolean; error?: string }> {
  if (!token) return { ok: false, error: "Invalid link." };
  const supabase = createServiceRoleClient();
  const { data: row } = await supabase
    .from("auth_tokens")
    .select("user_id, expires_at")
    .eq("token", token)
    .eq("type", "email_verification")
    .single();
  if (!row || new Date(row.expires_at) < new Date()) {
    return { ok: false, error: "Link expired or invalid." };
  }
  await supabase.from("users").update({
    email_verified_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq("id", row.user_id);
  await supabase.from("auth_tokens").delete().eq("token", token);

  // Notify admin of new broker signup (pending approval)
  const adminEmail = process.env.ADMIN_EMAIL?.trim();
  if (adminEmail) {
    const { data: user } = await supabase.from("users").select("email").eq("id", row.user_id).single();
    const brokerEmail = user?.email ?? "(unknown)";
    const adminDashboardUrl = process.env.NEXTAUTH_URL ? `${process.env.NEXTAUTH_URL}/admin/brokers` : "#";
    await resend.emails.send({
      from: EMAIL_FROM,
      to: adminEmail,
      subject: "Salebiz: New broker signup pending approval",
      html: adminBrokerSignupEmail(brokerEmail, adminDashboardUrl),
    }).catch(() => {});
  }

  return { ok: true };
}

/** Check if a broker with this email has verified but is pending approval. Used after failed login to show a helpful message. */
export async function checkBrokerPendingApproval(email: string): Promise<{ pending: boolean }> {
  const e = email?.toLowerCase().trim();
  if (!e) return { pending: false };
  const supabase = createServiceRoleClient();
  const { data: user } = await supabase.from("users").select("id, email_verified_at").eq("email", e).single();
  if (!user?.email_verified_at) return { pending: false };
  const { data: profile } = await supabase.from("profiles").select("status").eq("id", user.id).single();
  if (!profile || profile.status !== "pending") return { pending: false };
  return { pending: true };
}

/** Server action: verify a reCAPTCHA token (used by login form). */
export async function verifyLoginCaptcha(token: string): Promise<boolean> {
  return verifyRecaptcha(token);
}

/* ------------------------------------------------------------------ */
/*  Invitation acceptance (invited broker joins an agency)              */
/* ------------------------------------------------------------------ */

export type InvitationInfo = {
  email: string;
  agencyName: string;
  inviterName: string | null;
  expired: boolean;
};

/** Public: validate an invitation token and return info for the join page. */
export async function validateInvitationToken(token: string): Promise<InvitationInfo | null> {
  if (!token) return null;
  const supabase = createServiceRoleClient();

  const { data: invitation } = await supabase
    .from("agency_invitations")
    .select("id, agency_id, email, status, expires_at, invited_by")
    .eq("token", token)
    .single();

  if (!invitation || invitation.status !== "pending") return null;

  const { data: agency } = await supabase
    .from("agencies")
    .select("name")
    .eq("id", invitation.agency_id)
    .single();

  let inviterName: string | null = null;
  if (invitation.invited_by) {
    const { data: inviter } = await supabase
      .from("profiles")
      .select("name")
      .eq("id", invitation.invited_by)
      .single();
    inviterName = inviter?.name ?? null;
  }

  return {
    email: invitation.email,
    agencyName: agency?.name ?? "Agency",
    inviterName,
    expired: new Date(invitation.expires_at) < new Date(),
  };
}

export type AcceptInvitationResult = { ok: true } | { ok: false; error: string };

/** Public: accept an invitation — create account and join agency. */
export async function acceptInvitation(token: string, formData: FormData): Promise<AcceptInvitationResult> {
  if (!token) return { ok: false, error: "Invalid invitation link." };

  const name = (formData.get("name") as string)?.trim();
  const password = formData.get("password") as string;

  if (!password || password.length < 8) {
    return { ok: false, error: "Password must be at least 8 characters." };
  }

  const supabase = createServiceRoleClient();

  // Validate invitation
  const { data: invitation } = await supabase
    .from("agency_invitations")
    .select("id, agency_id, email, status, expires_at")
    .eq("token", token)
    .eq("status", "pending")
    .single();

  if (!invitation) {
    return { ok: false, error: "Invitation not found or already used." };
  }
  if (new Date(invitation.expires_at) < new Date()) {
    return { ok: false, error: "This invitation has expired. Ask the agency owner to resend it." };
  }

  // Verify agency is still active
  const { data: agency } = await supabase
    .from("agencies")
    .select("id, status, name")
    .eq("id", invitation.agency_id)
    .single();

  if (!agency || agency.status !== "active") {
    return { ok: false, error: "This agency is no longer active." };
  }

  const email = invitation.email;

  // Check if user already exists
  const { data: existingUser } = await supabase
    .from("users")
    .select("id")
    .eq("email", email)
    .single();

  let userId: string;

  if (existingUser) {
    // User already has an account — link them to the agency
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id, agency_id")
      .eq("id", existingUser.id)
      .single();

    if (existingProfile?.agency_id) {
      return { ok: false, error: "You already belong to an agency. Please contact support." };
    }

    userId = existingUser.id;

    // Update their profile to join this agency
    await supabase.from("profiles").update({
      agency_id: agency.id,
      agency_role: "member",
      name: name || undefined,
      updated_at: new Date().toISOString(),
    }).eq("id", userId);
  } else {
    // Create new user account
    const passwordHash = await bcrypt.hash(password, 12);
    const { data: newUser, error: insertError } = await supabase
      .from("users")
      .insert({
        email,
        password_hash: passwordHash,
        email_verified_at: new Date().toISOString(), // Auto-verify — invitation proves email
        updated_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (insertError || !newUser) {
      return { ok: false, error: "Failed to create account. Please try again." };
    }

    userId = newUser.id;

    // Create profile linked to the agency as member
    const memberSlug = name ? await generateUniqueSlug(name) : null;
    await supabase.from("profiles").insert({
      id: userId,
      role: "broker",
      status: "active",
      name: name || null,
      company: agency.name,
      slug: memberSlug,
      agency_id: agency.id,
      agency_role: "member",
      updated_at: new Date().toISOString(),
    });
  }

  // Mark invitation as accepted
  await supabase
    .from("agency_invitations")
    .update({ status: "accepted" })
    .eq("id", invitation.id);

  // Notify agency owner that a broker joined
  const { data: owner } = await supabase
    .from("profiles")
    .select("id")
    .eq("agency_id", agency.id)
    .eq("agency_role", "owner")
    .single();

  if (owner) {
    createNotification({
      userId: owner.id,
      type: "broker_joined",
      title: `${name || email} joined your agency`,
      message: `A new broker has accepted the invitation to ${agency.name}.`,
      link: "/dashboard/team",
    }).catch(() => {});
  }

  return { ok: true };
}

export async function requestPasswordReset(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const email = (formData.get("email") as string)?.toLowerCase().trim();
  if (!email) return { ok: false, error: "Email is required." };

  const supabase = createServiceRoleClient();
  const { data: user } = await supabase.from("users").select("id").eq("email", email).single();
  if (!user) {
    // Don't reveal whether email exists
    return { ok: true };
  }

  const token = nanoid(32);
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1h
  await supabase.from("auth_tokens").delete().eq("user_id", user.id).eq("type", "password_reset");
  await supabase.from("auth_tokens").insert({
    user_id: user.id,
    type: "password_reset",
    token,
    expires_at: expiresAt.toISOString(),
  });

  const resetUrl = `${APP_URL}/auth/reset?token=${token}`;
  await resend.emails.send({
    from: EMAIL_FROM,
    to: email,
    subject: "Reset your Salebiz password",
    html: passwordResetEmail(resetUrl),
  }).catch(() => {});

  return { ok: true };
}

export async function resetPasswordWithToken(
  token: string,
  newPassword: string
): Promise<{ ok: boolean; error?: string }> {
  if (!token || newPassword.length < 8) {
    return { ok: false, error: "Invalid link or password too short." };
  }
  const supabase = createServiceRoleClient();
  const { data: row } = await supabase
    .from("auth_tokens")
    .select("user_id, expires_at")
    .eq("token", token)
    .eq("type", "password_reset")
    .single();
  if (!row || new Date(row.expires_at) < new Date()) {
    return { ok: false, error: "Link expired or invalid." };
  }
  const passwordHash = await bcrypt.hash(newPassword, 12);
  await supabase.from("users").update({
    password_hash: passwordHash,
    updated_at: new Date().toISOString(),
  }).eq("id", row.user_id);
  await supabase.from("auth_tokens").delete().eq("token", token);
  return { ok: true };
}

