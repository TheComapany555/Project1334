import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { getMobileUser } from "@/lib/mobile-jwt";

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
    };

    const { listing_id, broker_id, reason, message, contact_name, contact_email, contact_phone } = body;

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
      .select("id, status, broker_id")
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
      ...(mobileUser ? { user_id: mobileUser.sub } : {}),
    });

    if (error) {
      console.error("[mobile/enquiries] insert error:", error);
      return NextResponse.json({ error: "Failed to submit enquiry" }, { status: 500 });
    }

    // Create notification for broker
    await supabase.from("notifications").insert({
      user_id: listing.broker_id,
      type: "enquiry_received",
      title: "New Enquiry Received",
      message: `${contact_name ?? "Someone"} sent an enquiry via the mobile app.`,
      data: { listing_id, contact_email },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[mobile/enquiries] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
