"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { Resend } from "resend";
import { invoiceStatusEmail } from "@/lib/email-templates";
import type { Payment } from "@/lib/types/payments";

const resend = new Resend(process.env.RESEND_API_KEY);
const EMAIL_FROM = process.env.EMAIL_FROM ?? "Salebiz <noreply@salebiz.com.au>";

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

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "admin") {
    throw new Error("Unauthorized");
  }
  return { userId: session.user.id };
}

/** Get payments for the current broker. */
export async function getBrokerPayments(): Promise<Payment[]> {
  const { userId } = await requireBroker();
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from("payments")
    .select(`
      *,
      listing:listings(id, title, slug),
      product:products(id, name)
    `)
    .eq("broker_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[getBrokerPayments]", error.message);
    return [];
  }
  return (data ?? []) as Payment[];
}

/** Get payments for all brokers under the current agency. */
export async function getAgencyPayments(): Promise<Payment[]> {
  const { agencyId, agencyRole } = await requireBroker();
  if (!agencyId || agencyRole !== "owner") {
    throw new Error("Unauthorized — agency owner only");
  }

  const supabase = createServiceRoleClient();

  // Get all broker IDs in this agency
  const { data: brokers } = await supabase
    .from("profiles")
    .select("id")
    .eq("agency_id", agencyId);
  const brokerIds = (brokers ?? []).map((b) => b.id);

  // Get payments by agency OR by agency's brokers
  const { data, error } = await supabase
    .from("payments")
    .select(`
      *,
      listing:listings(id, title, slug),
      broker:profiles!broker_id(name, company),
      product:products(id, name)
    `)
    .or(
      `agency_id.eq.${agencyId}${brokerIds.length ? `,broker_id.in.(${brokerIds.join(",")})` : ""}`
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[getAgencyPayments]", error.message);
    return [];
  }
  return (data ?? []) as Payment[];
}

/** Admin: get all payments with optional status filter. */
export async function getAllPayments(
  statusFilter?: string
): Promise<Payment[]> {
  await requireAdmin();
  const supabase = createServiceRoleClient();

  let query = supabase
    .from("payments")
    .select(`
      *,
      listing:listings(id, title, slug),
      broker:profiles!broker_id(name, company),
      product:products(id, name)
    `)
    .order("created_at", { ascending: false });

  if (statusFilter && statusFilter !== "all") {
    query = query.eq("status", statusFilter);
  }

  const { data, error } = await query;
  if (error) {
    console.error("[getAllPayments]", error.message);
    return [];
  }
  return (data ?? []) as Payment[];
}

/** Admin: update a payment status. */
export async function updatePaymentStatus(
  paymentId: string,
  status: "pending" | "invoiced" | "approved" | "paid"
): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const supabase = createServiceRoleClient();

  const payload: Record<string, unknown> = { status };
  if (status === "paid") {
    payload.paid_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from("payments")
    .update(payload)
    .eq("id", paymentId);

  if (error) return { ok: false, error: error.message };

  // If marking as paid, activate listing or subscription
  if (status === "paid") {
    const { data: payment } = await supabase
      .from("payments")
      .select("listing_id, package_days, payment_type, subscription_id")
      .eq("id", paymentId)
      .single();

    // Activate subscription if this is a subscription payment
    if (payment?.payment_type === "subscription" && payment.subscription_id) {
      const now = new Date();
      const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      await supabase
        .from("agency_subscriptions")
        .update({
          status: "active",
          current_period_start: now.toISOString(),
          current_period_end: periodEnd.toISOString(),
          updated_at: now.toISOString(),
        })
        .eq("id", payment.subscription_id);
    }

    if (payment?.listing_id) {
      const now = new Date();

      if (payment.payment_type === "listing_tier") {
        // Activate listing tier: publish the listing + set tier_paid_at
        const { data: listing } = await supabase
          .from("listings")
          .select("listing_tier")
          .eq("id", payment.listing_id)
          .single();

        const tier = listing?.listing_tier ?? "standard";
        const updatePayload: Record<string, unknown> = {
          status: "published",
          published_at: now.toISOString(),
          tier_paid_at: now.toISOString(),
          updated_at: now.toISOString(),
        };

        // Featured tier also gets featured fields
        if (tier === "featured" && payment.package_days > 0) {
          const featuredUntil = new Date(
            now.getTime() + payment.package_days * 24 * 60 * 60 * 1000
          );
          updatePayload.is_featured = true;
          updatePayload.featured_from = now.toISOString();
          updatePayload.featured_until = featuredUntil.toISOString();
          updatePayload.featured_package_days = payment.package_days;
        }

        await supabase
          .from("listings")
          .update(updatePayload)
          .eq("id", payment.listing_id);
      } else {
        // Legacy featured payment
        const featuredUntil = new Date(
          now.getTime() + payment.package_days * 24 * 60 * 60 * 1000
        );
        await supabase
          .from("listings")
          .update({
            is_featured: true,
            featured_from: now.toISOString(),
            featured_until: featuredUntil.toISOString(),
            featured_package_days: payment.package_days,
          })
          .eq("id", payment.listing_id);
      }
    }
  }

  // Send email notification for invoice status changes
  if ((status === "approved" || status === "paid")) {
    try {
      const { data: fullPayment } = await supabase
        .from("payments")
        .select(`
          invoice_requested, amount, currency, agency_id, broker_id,
          listing:listings(title),
          product:products(name)
        `)
        .eq("id", paymentId)
        .single();

      if (fullPayment?.invoice_requested) {
        // Get the agency or broker email
        let recipientEmail: string | null = null;
        let recipientName = "there";

        if (fullPayment.agency_id) {
          const { data: agency } = await supabase
            .from("agencies")
            .select("name, email")
            .eq("id", fullPayment.agency_id)
            .single();
          recipientEmail = agency?.email ?? null;
          recipientName = agency?.name ?? "there";
        } else if (fullPayment.broker_id) {
          const { data: broker } = await supabase
            .from("profiles")
            .select("name, email_public")
            .eq("id", fullPayment.broker_id)
            .single();
          recipientEmail = broker?.email_public ?? null;
          recipientName = broker?.name ?? "there";
        }

        if (recipientEmail) {
          const listingRaw = fullPayment.listing as { title: string } | { title: string }[] | null;
          const listingTitle = Array.isArray(listingRaw)
            ? listingRaw[0]?.title
            : listingRaw?.title ?? "your listing";

          const formattedAmount = new Intl.NumberFormat("en-AU", {
            style: "currency",
            currency: (fullPayment.currency ?? "aud").toUpperCase(),
            minimumFractionDigits: 2,
          }).format((fullPayment.amount ?? 0) / 100);

          await resend.emails.send({
            from: EMAIL_FROM,
            to: [recipientEmail],
            subject: status === "paid"
              ? `Payment Confirmed — ${listingTitle}`
              : `Invoice Approved — ${listingTitle}`,
            html: invoiceStatusEmail({
              agencyName: recipientName,
              listingTitle: listingTitle ?? "your listing",
              status,
              amount: `${formattedAmount} ${(fullPayment.currency ?? "aud").toUpperCase()}`,
            }),
          });
        }
      }
    } catch (emailErr) {
      console.error("[updatePaymentStatus] Email error:", emailErr);
    }
  }

  return { ok: true };
}

/** Admin: update admin notes on a payment (for invoice tracking). */
export async function updatePaymentAdminNotes(
  paymentId: string,
  notes: string
): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const supabase = createServiceRoleClient();

  const { error } = await supabase
    .from("payments")
    .update({ invoice_admin_notes: notes.trim() || null })
    .eq("id", paymentId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
