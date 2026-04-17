"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import type { ContactTag, TagColor } from "@/lib/types/contacts";

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

/** List all tags accessible to the current broker (own + agency-wide if owner). */
export async function getContactTags(): Promise<ContactTag[]> {
  const { userId, agencyId, agencyRole } = await requireBroker();
  const supabase = createServiceRoleClient();

  let query = supabase.from("contact_tags").select("*");

  if (agencyId && agencyRole === "owner") {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id")
      .eq("agency_id", agencyId);
    const brokerIds = (profiles ?? []).map((p) => p.id);
    query = brokerIds.length > 0 ? query.in("broker_id", brokerIds) : query.eq("broker_id", userId);
  } else {
    query = query.eq("broker_id", userId);
  }

  const { data } = await query.order("name", { ascending: true });
  return (data ?? []) as ContactTag[];
}

export async function createContactTag(
  name: string,
  color: TagColor = "primary"
): Promise<{ ok: true; tag: ContactTag } | { ok: false; error: string }> {
  const { userId } = await requireBroker();

  const trimmed = name?.trim();
  if (!trimmed) return { ok: false, error: "Tag name is required." };
  if (trimmed.length > 40) return { ok: false, error: "Tag name must be 40 characters or fewer." };

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("contact_tags")
    .insert({ broker_id: userId, name: trimmed, color })
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") return { ok: false, error: "A tag with that name already exists." };
    return { ok: false, error: "Failed to create tag." };
  }
  return { ok: true, tag: data as ContactTag };
}

export async function updateContactTag(
  id: string,
  patch: { name?: string; color?: TagColor }
): Promise<{ ok: true; tag: ContactTag } | { ok: false; error: string }> {
  const { userId } = await requireBroker();
  const update: { name?: string; color?: TagColor } = {};
  if (patch.name !== undefined) {
    const trimmed = patch.name.trim();
    if (!trimmed) return { ok: false, error: "Tag name is required." };
    update.name = trimmed;
  }
  if (patch.color !== undefined) update.color = patch.color;

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("contact_tags")
    .update(update)
    .eq("id", id)
    .eq("broker_id", userId)
    .select("*")
    .single();

  if (error || !data) return { ok: false, error: "Failed to update tag." };
  return { ok: true, tag: data as ContactTag };
}

export async function deleteContactTag(id: string): Promise<{ ok: boolean; error?: string }> {
  const { userId } = await requireBroker();
  const supabase = createServiceRoleClient();
  const { error } = await supabase
    .from("contact_tags")
    .delete()
    .eq("id", id)
    .eq("broker_id", userId);
  if (error) return { ok: false, error: "Failed to delete tag." };
  return { ok: true };
}

/**
 * Replace the full set of tags assigned to a contact.
 * The contact must belong to the current broker.
 */
export async function setContactTags(
  contactId: string,
  tagIds: string[]
): Promise<{ ok: boolean; error?: string }> {
  const { userId } = await requireBroker();
  const supabase = createServiceRoleClient();

  // Ensure contact belongs to broker
  const { data: contact } = await supabase
    .from("broker_contacts")
    .select("id")
    .eq("id", contactId)
    .eq("broker_id", userId)
    .single();
  if (!contact) return { ok: false, error: "Contact not found." };

  // Validate tags belong to broker (or their agency)
  if (tagIds.length > 0) {
    const { data: validTags } = await supabase
      .from("contact_tags")
      .select("id")
      .in("id", tagIds)
      .eq("broker_id", userId);
    const validIds = new Set((validTags ?? []).map((t) => t.id));
    const invalid = tagIds.filter((id) => !validIds.has(id));
    if (invalid.length > 0) return { ok: false, error: "One or more tags are invalid." };
  }

  // Replace assignments: delete then insert (small set, simple semantics)
  await supabase.from("broker_contact_tag_map").delete().eq("contact_id", contactId);
  if (tagIds.length > 0) {
    const rows = tagIds.map((tag_id) => ({ contact_id: contactId, tag_id }));
    const { error } = await supabase.from("broker_contact_tag_map").insert(rows);
    if (error) return { ok: false, error: "Failed to assign tags." };
  }
  return { ok: true };
}
