import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { getMobileUser } from "@/lib/mobile-jwt";
import { Resend } from "resend";
import { enquiryNotificationEmail, enquiryConfirmationEmail } from "@/lib/email-templates";
import { ENQUIRY_REASON_LABELS } from "@/lib/types/enquiries";

const resend = new Resend(process.env.RESEND_API_KEY);
const EMAIL_FROM = process.env.EMAIL_FROM ?? "noreply@salebiz.com.au";
const APP_URL = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      listing_id: string;
      broker_id: string;
      reason: string;
      message: string;
      contact_name?: string;
      contact_email: string;
      contact_phone?: string;
      interest?: string;
      consent_marketing?: boolean;
    };

    const {
      listing_id,
      broker_id,
      reason,
      message,
      contact_name,
      contact_email,
      contact_phone,
      interest,
      consent_marketing,
    } = body;

    if (!listing_id || !broker_id || !message || !contact_email) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact_email)) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
    }

    const supabase = createServiceRoleClient();

    // Verify listing exists and is published
    const { data: listing } = await supabase
      .from("listings")
      .select("id, title, slug, status, broker_id")
      .eq("id", listing_id)
      .single();

    if (!listing || listing.status !== "published") {
      return NextResponse.json({ error: "Listing not found or not available" }, { status: 404 });
    }

    // Attach user_id if the sender is logged in
    const mobileUser = await getMobileUser(request);

    const { error } = await supabase.from("enquiries").insert({
      listing_id,
      broker_id: listing.broker_id,
      reason: reason || "general",
      message: message.trim(),
      contact_name: contact_name?.trim() ?? null,
      contact_email: contact_email.toLowerCase().trim(),
      contact_phone: contact_phone?.trim() ?? null,
      interest: interest?.trim() || null,
      consent_marketing: !!consent_marketing,
      ...(mobileUser ? { user_id: mobileUser.sub } : {}),
    });

    if (error) {
      console.error("[mobile/enquiries] insert error:", error);
      return NextResponse.json({ error: "Failed to submit enquiry" }, { status: 500 });
    }

    // Send emails in parallel (fire-and-forget)
    const listingUrl = `${APP_URL}/listing/${listing.slug}`;
    const dashboardUrl = `${APP_URL}/dashboard/enquiries`;
    const reasonLabel = reason && ENQUIRY_REASON_LABELS[reason] ? ENQUIRY_REASON_LABELS[reason] : reason || "Not specified";

    // Fetch broker email and name
    const [brokerUserRes, brokerProfileRes] = await Promise.all([
      supabase.from("users").select("email").eq("id", listing.broker_id).single(),
      supabase.from("profiles").select("name").eq("id", listing.broker_id).single(),
    ]);

    const emailPromises: Promise<unknown>[] = [];

    // Email to broker
    if (brokerUserRes.data?.email) {
      emailPromises.push(
        resend.emails.send({
          from: EMAIL_FROM,
          to: brokerUserRes.data.email,
          subject: `New enquiry: ${listing.title}`,
          html: enquiryNotificationEmail({
            listingTitle: listing.title,
            reasonLabel,
            contactName: contact_name?.trim() ?? null,
            contactEmail: contact_email.toLowerCase().trim(),
            contactPhone: contact_phone?.trim() ?? null,
            message: message.trim(),
            listingUrl,
            dashboardUrl,
          }),
        }).catch(() => {})
      );
    }

    // Confirmation email to enquirer
    emailPromises.push(
      resend.emails.send({
        from: EMAIL_FROM,
        to: contact_email.toLowerCase().trim(),
        subject: `Your enquiry on "${listing.title}" — Salebiz`,
        html: enquiryConfirmationEmail({
          contactName: contact_name?.trim() ?? null,
          listingTitle: listing.title,
          listingUrl,
          brokerName: brokerProfileRes.data?.name ?? null,
        }),
      }).catch(() => {})
    );

    // Fire all emails + notification in parallel
    await Promise.all([
      ...emailPromises,
      supabase.from("notifications").insert({
        user_id: listing.broker_id,
        type: "enquiry_received",
        title: "New Enquiry Received",
        message: `${contact_name ?? "Someone"} sent an enquiry via the mobile app.`,
        data: { listing_id, contact_email },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[mobile/enquiries] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
