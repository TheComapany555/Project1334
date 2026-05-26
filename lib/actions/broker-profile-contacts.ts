"use server";

import { getServerSession } from "next-auth";
import { Resend } from "resend";
import { authOptions } from "@/lib/auth";
import { createNotification } from "@/lib/actions/notifications";
import { getOrCreateBrokerContactForBuyer } from "@/lib/actions/contacts";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import {
  brokerProfileContactConfirmationEmail,
  brokerProfileContactEmail,
} from "@/lib/email-templates";

const resend = new Resend(process.env.RESEND_API_KEY);
const EMAIL_FROM = process.env.EMAIL_FROM ?? "noreply@salebiz.com.au";
const APP_URL = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

export type SubmitBrokerProfileContactResult =
  | { ok: true }
  | { ok: false; error: string };

export async function submitBrokerProfileContact(
  brokerId: string,
  formData: FormData,
): Promise<SubmitBrokerProfileContactResult> {
  const message = (formData.get("message") as string | null)?.trim() ?? "";
  const contactEmail =
    (formData.get("contact_email") as string | null)?.trim().toLowerCase() ?? "";
  const contactName =
    (formData.get("contact_name") as string | null)?.trim() || null;
  const contactPhone =
    (formData.get("contact_phone") as string | null)?.trim() || null;
  const consentMarketing = formData.get("consent_marketing") === "true";

  if (!brokerId) return { ok: false, error: "Broker not found." };
  if (!message || message.length < 10) {
    return { ok: false, error: "Please enter a message of at least 10 characters." };
  }
  if (!contactEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
    return { ok: false, error: "Please enter a valid email address." };
  }

  const supabase = createServiceRoleClient();
  const { data: broker } = await supabase
    .from("profiles")
    .select("id, name, company, slug, role")
    .eq("id", brokerId)
    .eq("role", "broker")
    .single();

  if (!broker) return { ok: false, error: "Broker not found." };

  const session = await getServerSession(authOptions);
  const buyerId =
    session?.user?.id && session.user.role === "user" ? session.user.id : null;

  const { data: contactRow, error: insertError } = await supabase
    .from("broker_profile_contacts")
    .insert({
      broker_id: broker.id,
      user_id: buyerId,
      contact_name: contactName,
      contact_email: contactEmail,
      contact_phone: contactPhone,
      message,
      consent_marketing: consentMarketing,
    })
    .select("id, created_at")
    .single();

  if (insertError || !contactRow) {
    return { ok: false, error: "Failed to send message. Please try again." };
  }

  getOrCreateBrokerContactForBuyer({
    brokerId: broker.id,
    buyerUserId: buyerId,
    email: contactEmail,
    name: contactName,
    phone: contactPhone,
    source: "enquiry",
    firstInteractionAt: contactRow.created_at,
    consent: {
      marketing: consentMarketing,
      source: consentMarketing ? "enquiry" : null,
      givenAt: contactRow.created_at,
    },
  }).catch(() => {});

  const displayName = broker.name || broker.company || "Broker";
  const profileUrl = `${APP_URL}/broker/${encodeURIComponent(broker.slug ?? broker.id)}`;
  const dashboardUrl = `${APP_URL}/dashboard/contacts`;

  createNotification({
    userId: broker.id,
    type: "enquiry_received",
    title: "New profile contact",
    message: contactName ? `From ${contactName}` : `From ${contactEmail}`,
    link: "/dashboard/contacts",
  }).catch(() => {});

  const { data: brokerUser } = await supabase
    .from("users")
    .select("email")
    .eq("id", broker.id)
    .single();

  const emailJobs: Promise<unknown>[] = [];
  if (brokerUser?.email) {
    emailJobs.push(
      resend.emails
        .send({
          from: EMAIL_FROM,
          to: brokerUser.email,
          subject: `New contact from your Salebiz profile`,
          html: brokerProfileContactEmail({
            brokerName: displayName,
            contactName,
            contactEmail,
            contactPhone,
            message,
            profileUrl,
            dashboardUrl,
          }),
        })
        .catch(() => {}),
    );
  }

  emailJobs.push(
    resend.emails
      .send({
        from: EMAIL_FROM,
        to: contactEmail,
        subject: `Your message to ${displayName} - Salebiz`,
        html: brokerProfileContactConfirmationEmail({
          contactName,
          brokerName: displayName,
          profileUrl,
        }),
      })
      .catch(() => {}),
  );

  await Promise.all(emailJobs);

  return { ok: true };
}
