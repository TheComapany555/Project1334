"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServiceRoleClient } from "@/lib/supabase/admin";

// ─── Types ────────────────────────────────────────────────────────────────

export type CustomFieldType = "text" | "number" | "boolean" | "select" | "date";

export type CustomFieldOption = {
  value: string;
  label: string;
  color?: "primary" | "secondary" | "success" | "warning" | "danger" | "neutral";
};

export type CrmCustomField = {
  id: string;
  agency_id: string | null;
  broker_id: string | null;
  key: string;
  label: string;
  field_type: CustomFieldType;
  options: CustomFieldOption[] | null;
  sort_order: number;
  created_at: string;
};

export type CrmCustomFieldValue = {
  contact_id: string;
  field_id: string;
  value: unknown;
  updated_at: string;
};

// ─── Auth ────────────────────────────────────────────────────────────────

async function requireBroker() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "broker") {
    throw new Error("Unauthorized");
  }
  return {
    id: session.user.id,
    agencyId: session.user.agencyId ?? null,
    agencyRole: session.user.agencyRole ?? null,
  };
}

/**
 * Resolve who *owns* the field set — agency for in-agency brokers, the
 * broker themselves for solo. Mirrors the chk_crm_custom_fields_owner CHECK.
 */
function resolveOwnerScope(broker: {
  id: string;
  agencyId: string | null;
}): { agency_id: string | null; broker_id: string | null } {
  if (broker.agencyId) return { agency_id: broker.agencyId, broker_id: null };
  return { agency_id: null, broker_id: broker.id };
}

/** Slug-ify a label into a stable machine key. */
function slugifyKey(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60);
}

// ─── Reads (any broker; agency members see the agency's fields) ──────────

export async function listCustomFields(): Promise<CrmCustomField[]> {
  const broker = await requireBroker();
  const supabase = createServiceRoleClient();
  const scope = resolveOwnerScope(broker);

  let q = supabase
    .from("crm_custom_fields")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (scope.agency_id) q = q.eq("agency_id", scope.agency_id);
  else q = q.eq("broker_id", scope.broker_id!);

  const { data } = await q;
  return (data ?? []) as CrmCustomField[];
}

/** Bulk read of all values for a set of contacts. Returns a nested map. */
export async function getCustomFieldValuesForContacts(
  contactIds: string[],
): Promise<Record<string, Record<string, unknown>>> {
  await requireBroker();
  if (contactIds.length === 0) return {};
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("crm_custom_field_values")
    .select("contact_id, field_id, value")
    .in("contact_id", contactIds);

  const out: Record<string, Record<string, unknown>> = {};
  for (const row of (data ?? []) as CrmCustomFieldValue[]) {
    if (!out[row.contact_id]) out[row.contact_id] = {};
    out[row.contact_id][row.field_id] = row.value;
  }
  return out;
}

// ─── Writes — only agency owners + solo brokers may modify the schema ────

function canModifySchema(broker: {
  agencyId: string | null;
  agencyRole: string | null;
}): boolean {
  if (!broker.agencyId) return true; // solo broker manages their own
  return broker.agencyRole === "owner";
}

export async function createCustomField(input: {
  label: string;
  fieldType: CustomFieldType;
  options?: CustomFieldOption[];
  key?: string;
}): Promise<{ ok: true; field: CrmCustomField } | { ok: false; error: string }> {
  const broker = await requireBroker();
  if (!canModifySchema(broker)) {
    return { ok: false, error: "Only agency owners can manage CRM fields" };
  }

  const label = input.label?.trim();
  if (!label) return { ok: false, error: "Label is required" };
  if (label.length > 60) return { ok: false, error: "Label is too long" };

  if (
    !["text", "number", "boolean", "select", "date"].includes(input.fieldType)
  ) {
    return { ok: false, error: "Invalid field type" };
  }

  if (input.fieldType === "select") {
    if (!input.options?.length) {
      return { ok: false, error: "Select fields need at least one option" };
    }
    if (input.options.length > 30) {
      return { ok: false, error: "Too many options (max 30)" };
    }
  }

  const supabase = createServiceRoleClient();
  const scope = resolveOwnerScope(broker);
  const key = (input.key?.trim() || slugifyKey(label)).slice(0, 60);
  if (!key) return { ok: false, error: "Couldn't derive a key from the label" };

  // Find current max sort_order so the new field appears at the end.
  const { data: existing } = await supabase
    .from("crm_custom_fields")
    .select("sort_order")
    .match(scope)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextSort = (existing?.sort_order ?? -1) + 1;

  const { data: inserted, error } = await supabase
    .from("crm_custom_fields")
    .insert({
      ...scope,
      key,
      label,
      field_type: input.fieldType,
      options: input.fieldType === "select" ? (input.options ?? []) : null,
      sort_order: nextSort,
    })
    .select("*")
    .single();

  if (error || !inserted) {
    if (error?.code === "23505") {
      return { ok: false, error: "A field with this key already exists" };
    }
    return { ok: false, error: error?.message ?? "Couldn't create field" };
  }
  return { ok: true, field: inserted as CrmCustomField };
}

export async function updateCustomField(
  id: string,
  input: {
    label?: string;
    options?: CustomFieldOption[] | null;
    sortOrder?: number;
  },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const broker = await requireBroker();
  if (!canModifySchema(broker)) {
    return { ok: false, error: "Only agency owners can manage CRM fields" };
  }
  const supabase = createServiceRoleClient();
  const scope = resolveOwnerScope(broker);

  const patch: Record<string, unknown> = {};
  if (input.label !== undefined) {
    const v = input.label.trim();
    if (!v) return { ok: false, error: "Label is required" };
    if (v.length > 60) return { ok: false, error: "Label is too long" };
    patch.label = v;
  }
  if (input.options !== undefined) patch.options = input.options;
  if (input.sortOrder !== undefined) patch.sort_order = input.sortOrder;
  if (Object.keys(patch).length === 0) {
    return { ok: false, error: "Nothing to update" };
  }

  const { error } = await supabase
    .from("crm_custom_fields")
    .update(patch)
    .eq("id", id)
    .match(scope);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function deleteCustomField(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const broker = await requireBroker();
  if (!canModifySchema(broker)) {
    return { ok: false, error: "Only agency owners can manage CRM fields" };
  }
  const supabase = createServiceRoleClient();
  const scope = resolveOwnerScope(broker);
  const { error } = await supabase
    .from("crm_custom_fields")
    .delete()
    .eq("id", id)
    .match(scope);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** Reorder all fields in one go. `ids` is the new ordering, top → bottom. */
export async function reorderCustomFields(
  ids: string[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  const broker = await requireBroker();
  if (!canModifySchema(broker)) {
    return { ok: false, error: "Only agency owners can manage CRM fields" };
  }
  const supabase = createServiceRoleClient();
  const scope = resolveOwnerScope(broker);

  // Update each row sequentially. Cheap because the field count is small (≤ a few dozen).
  for (let i = 0; i < ids.length; i++) {
    const { error } = await supabase
      .from("crm_custom_fields")
      .update({ sort_order: i })
      .eq("id", ids[i])
      .match(scope);
    if (error) return { ok: false, error: error.message };
  }
  return { ok: true };
}

// ─── Per-contact values (any broker can write within their CRM) ─────────

export async function setCustomFieldValue(
  contactId: string,
  fieldId: string,
  value: unknown,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const broker = await requireBroker();
  const supabase = createServiceRoleClient();

  // Scope-check: contact belongs to this broker (or this broker's agency).
  const { data: contact } = await supabase
    .from("broker_contacts")
    .select("id, broker_id")
    .eq("id", contactId)
    .maybeSingle();
  if (!contact) return { ok: false, error: "Contact not found" };
  if (contact.broker_id !== broker.id) {
    if (broker.agencyId && broker.agencyRole === "owner") {
      const { data: ownerCheck } = await supabase
        .from("profiles")
        .select("agency_id")
        .eq("id", contact.broker_id)
        .maybeSingle();
      if (ownerCheck?.agency_id !== broker.agencyId) {
        return { ok: false, error: "Forbidden" };
      }
    } else {
      return { ok: false, error: "Forbidden" };
    }
  }

  // Field must belong to the same scope.
  const scope = resolveOwnerScope(broker);
  const { data: field } = await supabase
    .from("crm_custom_fields")
    .select("id, field_type, options")
    .eq("id", fieldId)
    .match(scope)
    .maybeSingle();
  if (!field) return { ok: false, error: "Field not found" };

  // Light type validation.
  if (value !== null) {
    if (field.field_type === "number" && typeof value !== "number") {
      return { ok: false, error: "Value must be a number" };
    }
    if (field.field_type === "boolean" && typeof value !== "boolean") {
      return { ok: false, error: "Value must be true/false" };
    }
    if (field.field_type === "select") {
      const allowed = ((field.options ?? []) as CustomFieldOption[]).map(
        (o) => o.value,
      );
      if (typeof value !== "string" || !allowed.includes(value)) {
        return { ok: false, error: "Value isn't one of the field's options" };
      }
    }
    if (field.field_type === "date" && typeof value !== "string") {
      return { ok: false, error: "Date must be an ISO string" };
    }
    if (field.field_type === "text" && typeof value !== "string") {
      return { ok: false, error: "Value must be text" };
    }
  }

  const { error } = await supabase.from("crm_custom_field_values").upsert(
    {
      contact_id: contactId,
      field_id: fieldId,
      value,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "contact_id,field_id" },
  );
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** True when the current broker is allowed to manage the field schema. */
export async function canManageCustomFields(): Promise<boolean> {
  const broker = await requireBroker();
  return canModifySchema(broker);
}
