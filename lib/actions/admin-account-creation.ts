"use server";

import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { generateSlugFromName } from "@/lib/slug";
import { checkSlugAvailable } from "@/lib/actions/profile";
import {
  createSetPasswordToken,
  sendSetPasswordEmail,
  buildSetPasswordUrl,
} from "@/lib/account-provisioning";

export type AdminCreateResult =
  | {
      ok: true;
      userId: string;
      agencyId: string | null;
      /** Whether the "set your password" email actually went out. */
      emailSent: boolean;
      /** Present when the account was created but the email failed to send. */
      warning?: string;
    }
  | { ok: false; error: string };

/** Shown when the account exists but the set-password email could not be delivered. */
const EMAIL_FAILED_WARNING =
  "The account was created, but the set-password email could not be sent. " +
  'Double-check the email address and email setup — the user can get a fresh link via "Forgot password" on the login page.';

async function getAdminSession() {
  const { getServerSession } = await import("next-auth");
  const { authOptions } = await import("@/lib/auth");
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "admin") return null;
  return session.user;
}

async function generateUniqueProfileSlug(name: string): Promise<string> {
  const base = generateSlugFromName(name);
  // Cap iterations so a stuck DB or pathological data can't spin forever.
  for (let n = 0; n < 1000; n += 1) {
    const candidate = n === 0 ? base : `${base}-${n}`;
    if (await checkSlugAvailable(candidate)) return candidate;
  }
  return `${base}-${nanoid(6)}`;
}

async function generateUniqueAgencySlug(name: string): Promise<string> {
  const supabase = createServiceRoleClient();
  const base = generateSlugFromName(name);
  // agencies.slug has a UNIQUE constraint — append a counter until unused.
  for (let n = 0; n < 1000; n += 1) {
    const candidate = n === 0 ? base : `${base}-${n}`;
    const { data } = await supabase
      .from("agencies")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();
    if (!data) return candidate;
  }
  // Astronomically unlikely; fall back to a uniqueness-guaranteed suffix.
  return `${base}-${nanoid(6)}`;
}

async function writeAuditLog(opts: {
  adminId: string;
  action: string;
  targetUserId?: string | null;
  targetAgencyId?: string | null;
  metadata?: Record<string, unknown> | null;
}) {
  const supabase = createServiceRoleClient();
  const { error } = await supabase.from("admin_audit_log").insert({
    admin_id: opts.adminId,
    action: opts.action,
    target_user_id: opts.targetUserId ?? null,
    target_agency_id: opts.targetAgencyId ?? null,
    metadata: opts.metadata ?? null,
  });
  if (error) {
    // Don't fail the parent action — the user/agency already exist — but
    // surface the lost audit row so ops can investigate (e.g. missing
    // migration, RLS misconfig).
    console.error(
      `[admin-audit-log] Failed to write '${opts.action}' for admin=${opts.adminId}: ${error.message}`,
    );
  }
}

/**
 * Admin: create a brand-new agency and its owner broker in one shot.
 * Skips OTP — user lands directly on a "Set Password" link.
 */
export async function createAgencyByAdmin(opts: {
  email: string;
  ownerName: string;
  agencyName: string;
  /** When true (default), brokers can use the platform without paying first. */
  waiveSubscription?: boolean;
}): Promise<AdminCreateResult> {
  const admin = await getAdminSession();
  if (!admin) return { ok: false, error: "Unauthorized." };

  const email = opts.email?.toLowerCase().trim();
  const ownerName = opts.ownerName?.trim();
  const agencyName = opts.agencyName?.trim();

  if (!email || !ownerName || !agencyName) {
    return { ok: false, error: "Email, owner name, and agency name are required." };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "Enter a valid email address." };
  }

  const supabase = createServiceRoleClient();

  const { data: existing } = await supabase.from("users").select("id").eq("email", email).maybeSingle();
  if (existing) {
    return { ok: false, error: "An account with this email already exists." };
  }

  // 1. Create user (pre-verified, random unusable password)
  const placeholderHash = await bcrypt.hash(nanoid(48), 12);
  const { data: newUser, error: userError } = await supabase
    .from("users")
    .insert({
      email,
      password_hash: placeholderHash,
      email_verified_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (userError || !newUser) {
    // Postgres `23505` = unique violation; surfaces when two concurrent
    // requests race past the existence check above. Map to a clearer
    // message so the admin sees what actually happened.
    if (userError && (userError as { code?: string }).code === "23505") {
      return { ok: false, error: "An account with this email already exists." };
    }
    return { ok: false, error: "Failed to create account. Please try again." };
  }

  const waiveSubscription = opts.waiveSubscription !== false;

  // 2. Create agency (active, no approval needed since admin made it)
  const agencySlug = await generateUniqueAgencySlug(agencyName);
  const { data: agency, error: agencyError } = await supabase
    .from("agencies")
    .insert({
      name: agencyName,
      slug: agencySlug,
      status: "active",
      subscription_exempt: waiveSubscription,
    })
    .select("id")
    .single();
  if (agencyError || !agency) {
    // Roll back the user — keeps things tidy.
    await supabase.from("users").delete().eq("id", newUser.id);
    return { ok: false, error: "Failed to create agency. Please try again." };
  }

  // 3. Create owner profile
  const profileSlug = await generateUniqueProfileSlug(ownerName);
  const { error: profileError } = await supabase.from("profiles").insert({
    id: newUser.id,
    role: "broker",
    status: "active",
    name: ownerName,
    company: agencyName,
    slug: profileSlug,
    agency_id: agency.id,
    agency_role: "owner",
    updated_at: new Date().toISOString(),
  });
  if (profileError) {
    await supabase.from("agencies").delete().eq("id", agency.id);
    await supabase.from("users").delete().eq("id", newUser.id);
    return { ok: false, error: "Failed to create owner profile. Please try again." };
  }

  // 4. Set-password token + welcome email
  const tokenResult = await createSetPasswordToken(newUser.id);
  if (!tokenResult.ok) {
    // Roll back everything we created — better to fail loudly than to leave
    // the user a half-provisioned account they can't sign in to.
    await supabase.from("agencies").delete().eq("id", agency.id);
    await supabase.from("users").delete().eq("id", newUser.id);
    return { ok: false, error: tokenResult.error };
  }
  const setPasswordUrl = buildSetPasswordUrl(tokenResult.token);
  const emailResult = await sendSetPasswordEmail({
    email,
    name: ownerName,
    setPasswordUrl,
    agencyName,
    createdByLabel: "the Salebiz admin team",
    isAgencyOwner: true,
  });

  // 5. Audit log
  await writeAuditLog({
    adminId: admin.id,
    action: "create_agency",
    targetUserId: newUser.id,
    targetAgencyId: agency.id,
    metadata: {
      email,
      ownerName,
      agencyName,
      emailSent: emailResult.ok,
      subscriptionExempt: waiveSubscription,
    },
  });

  return {
    ok: true,
    userId: newUser.id,
    agencyId: agency.id,
    emailSent: emailResult.ok,
    warning: emailResult.ok ? undefined : EMAIL_FAILED_WARNING,
  };
}

/**
 * Admin: create a broker user under an existing agency.
 * Skips OTP — user lands directly on a "Set Password" link.
 */
export async function createBrokerByAdmin(opts: {
  email: string;
  name: string;
  agencyId: string;
  agencyRole?: "owner" | "member";
}): Promise<AdminCreateResult> {
  const admin = await getAdminSession();
  if (!admin) return { ok: false, error: "Unauthorized." };

  const email = opts.email?.toLowerCase().trim();
  const name = opts.name?.trim();
  const agencyId = opts.agencyId?.trim();
  const agencyRole = opts.agencyRole ?? "member";

  if (!email || !name || !agencyId) {
    return { ok: false, error: "Email, name, and agency are required." };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "Enter a valid email address." };
  }

  const supabase = createServiceRoleClient();

  const { data: agency } = await supabase
    .from("agencies")
    .select("id, name, status")
    .eq("id", agencyId)
    .maybeSingle();
  if (!agency) return { ok: false, error: "Agency not found." };
  if (agency.status === "disabled") {
    return { ok: false, error: "Cannot add brokers to a disabled agency." };
  }

  const { data: existing } = await supabase.from("users").select("id").eq("email", email).maybeSingle();
  if (existing) {
    return { ok: false, error: "An account with this email already exists." };
  }

  // 1. Create user (pre-verified, random unusable password)
  const placeholderHash = await bcrypt.hash(nanoid(48), 12);
  const { data: newUser, error: userError } = await supabase
    .from("users")
    .insert({
      email,
      password_hash: placeholderHash,
      email_verified_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (userError || !newUser) {
    // Postgres `23505` = unique violation; surfaces when two concurrent
    // requests race past the existence check above. Map to a clearer
    // message so the admin sees what actually happened.
    if (userError && (userError as { code?: string }).code === "23505") {
      return { ok: false, error: "An account with this email already exists." };
    }
    return { ok: false, error: "Failed to create account. Please try again." };
  }

  // 2. Create profile linked to the agency
  const profileSlug = await generateUniqueProfileSlug(name);
  const { error: profileError } = await supabase.from("profiles").insert({
    id: newUser.id,
    role: "broker",
    status: "active",
    name,
    company: agency.name,
    slug: profileSlug,
    agency_id: agency.id,
    agency_role: agencyRole,
    updated_at: new Date().toISOString(),
  });
  if (profileError) {
    await supabase.from("users").delete().eq("id", newUser.id);
    return { ok: false, error: "Failed to create broker profile. Please try again." };
  }

  // 3. Set-password token + welcome email
  const tokenResult = await createSetPasswordToken(newUser.id);
  if (!tokenResult.ok) {
    // Roll back — broker is unusable without a way to set their password.
    await supabase.from("users").delete().eq("id", newUser.id);
    return { ok: false, error: tokenResult.error };
  }
  const setPasswordUrl = buildSetPasswordUrl(tokenResult.token);
  const emailResult = await sendSetPasswordEmail({
    email,
    name,
    setPasswordUrl,
    agencyName: agency.name,
    createdByLabel: "the Salebiz admin team",
    isAgencyOwner: agencyRole === "owner",
  });

  // 4. Audit log
  await writeAuditLog({
    adminId: admin.id,
    action: "create_broker",
    targetUserId: newUser.id,
    targetAgencyId: agency.id,
    metadata: { email, name, agencyRole, emailSent: emailResult.ok },
  });

  return {
    ok: true,
    userId: newUser.id,
    agencyId: agency.id,
    emailSent: emailResult.ok,
    warning: emailResult.ok ? undefined : EMAIL_FAILED_WARNING,
  };
}

/** Lightweight agency list for the "Create Broker" agency-picker (no admin gate inside — caller already gates). */
export async function listAgenciesForPicker(): Promise<{ id: string; name: string; status: string }[]> {
  const admin = await getAdminSession();
  if (!admin) return [];
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("agencies")
    .select("id, name, status")
    .neq("status", "disabled")
    .order("name", { ascending: true });
  return data ?? [];
}
