"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import {
  IMPORT_CHUNK_SIZE,
  MAX_IMPORT_ROWS,
  type ContactImportRow,
} from "@/lib/contacts-import-template";

export type ImportContactsResult =
  | {
      ok: true;
      /** Brand-new contacts created in this chunk. */
      inserted: number;
      /** Existing contacts that had at least one empty field filled in. */
      updated: number;
      /** Existing contacts matched, but nothing changed (we never overwrite
       *  the broker's manual edits). */
      matched_no_op: number;
      /** Rows skipped because email was missing/invalid. */
      skipped: number;
      tags_created: number;
      /** Custom-field values upserted into crm_custom_field_values. */
      custom_field_values_set: number;
    }
  | { ok: false; error: string };

/**
 * Bulk-import broker contacts from a parsed spreadsheet chunk.
 *
 * The client splits the upload into `IMPORT_CHUNK_SIZE`-row chunks and calls
 * this once per chunk so the broker sees a progress bar instead of a long
 * blank loading state.
 *
 * - Authorisation: scoped to the calling broker only.
 * - Dedup key is (broker_id, email). Existing contact rows are *merged* —
 *   only empty fields are filled, never overwriting the broker's manual
 *   edits. Custom-field values, by contrast, *are* overwritten — the broker's
 *   intent in shipping a value in the CSV is clearly to set it.
 * - Tags are get-or-created per-broker by lowercased name.
 * - Consent: when the row sets consent_marketing=true, we stamp
 *   consent_source = "import" + consent_given_at = now() so brokers have an
 *   audit trail for AU spam-act compliance.
 * - source column is now "import" (requires migration
 *   20260520000001_broker_contacts_import_source.sql).
 */
export async function importContacts(
  rows: ContactImportRow[],
): Promise<ImportContactsResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "broker") {
    return { ok: false, error: "Unauthorized" };
  }
  const brokerId = session.user.id;

  if (rows.length === 0) {
    return { ok: false, error: "No rows to import." };
  }
  if (rows.length > MAX_IMPORT_ROWS) {
    return {
      ok: false,
      error: `Too many rows per chunk — max ${IMPORT_CHUNK_SIZE.toLocaleString()}.`,
    };
  }

  const supabase = createServiceRoleClient();
  const nowIso = new Date().toISOString();

  // ─── Normalise + dedupe within the chunk (last occurrence wins) ──────────
  const byEmail = new Map<string, ContactImportRow>();
  for (const r of rows) {
    const email = r.email?.trim().toLowerCase();
    if (!email) continue;
    byEmail.set(email, { ...r, email });
  }
  const totalSkipped = rows.length - byEmail.size;
  if (byEmail.size === 0) {
    return {
      ok: true,
      inserted: 0,
      updated: 0,
      matched_no_op: 0,
      skipped: totalSkipped,
      tags_created: 0,
      custom_field_values_set: 0,
    };
  }

  const emails = [...byEmail.keys()];

  // ─── Fetch existing contacts for this broker by email ─────────────────────
  const { data: existing } = await supabase
    .from("broker_contacts")
    .select("id, email, name, phone, company, interest, notes, consent_marketing")
    .eq("broker_id", brokerId)
    .in("email", emails);
  type ExistingRow = {
    id: string;
    email: string;
    name: string | null;
    phone: string | null;
    company: string | null;
    interest: string | null;
    notes: string | null;
    consent_marketing: boolean | null;
  };
  const existingByEmail = new Map<string, ExistingRow>(
    ((existing ?? []) as ExistingRow[]).map((r) => [r.email, r]),
  );

  // ─── Partition into inserts and updates ──────────────────────────────────
  type InsertRow = {
    broker_id: string;
    email: string;
    name: string | null;
    phone: string | null;
    company: string | null;
    interest: string | null;
    notes: string | null;
    source: "import";
    consent_marketing: boolean;
    consent_source: string | null;
    consent_given_at: string | null;
  };
  type UpdatePatch = Partial<InsertRow> & { updated_at: string };

  const toInsert: InsertRow[] = [];
  const toUpdate: { id: string; patch: UpdatePatch }[] = [];

  for (const row of byEmail.values()) {
    const existingRow = existingByEmail.get(row.email);
    if (existingRow) {
      const patch: UpdatePatch = { updated_at: nowIso };
      if (!existingRow.name && row.name) patch.name = row.name;
      if (!existingRow.phone && row.phone) patch.phone = row.phone;
      if (!existingRow.company && row.company) patch.company = row.company;
      if (!existingRow.interest && row.interest) patch.interest = row.interest;
      if (!existingRow.notes && row.notes) patch.notes = row.notes;
      if (!existingRow.consent_marketing && row.consent_marketing) {
        patch.consent_marketing = true;
        patch.consent_source = "import";
        patch.consent_given_at = nowIso;
      }
      toUpdate.push({ id: existingRow.id, patch });
    } else {
      toInsert.push({
        broker_id: brokerId,
        email: row.email,
        name: row.name,
        phone: row.phone,
        company: row.company,
        interest: row.interest,
        notes: row.notes,
        source: "import",
        consent_marketing: row.consent_marketing,
        consent_source: row.consent_marketing ? "import" : null,
        consent_given_at: row.consent_marketing ? nowIso : null,
      });
    }
  }

  // ─── Insert new contacts ─────────────────────────────────────────────────
  let insertedIds: { id: string; email: string }[] = [];
  if (toInsert.length > 0) {
    const { data: inserted, error } = await supabase
      .from("broker_contacts")
      .insert(toInsert)
      .select("id, email");
    if (error) {
      return { ok: false, error: `Insert failed: ${error.message}` };
    }
    insertedIds = (inserted ?? []) as { id: string; email: string }[];
  }

  // ─── Update existing contacts (parallelised in small batches) ───────────
  //
  // Supabase has no native bulk-update-by-id syntax. Running 500 updates
  // serially against a remote DB is too slow (≈seconds per chunk). Running
  // all 500 in parallel risks overwhelming the connection pool. Sweet spot
  // is small parallel batches.
  const UPDATE_CONCURRENCY = 16;
  let updatedCount = 0;
  let matchedNoOpCount = 0;
  for (let i = 0; i < toUpdate.length; i += UPDATE_CONCURRENCY) {
    const batch = toUpdate.slice(i, i + UPDATE_CONCURRENCY);
    await Promise.all(
      batch.map(async ({ id, patch }) => {
        // Only `updated_at` in the patch = nothing actually changed.
        if (Object.keys(patch).length <= 1) {
          matchedNoOpCount += 1;
          return;
        }
        const { error } = await supabase
          .from("broker_contacts")
          .update(patch)
          .eq("id", id);
        if (!error) updatedCount += 1;
      }),
    );
  }

  // ─── Build contact_id-by-email map across both inserted + existing ──────
  const contactIdByEmail = new Map<string, string>();
  for (const r of insertedIds) contactIdByEmail.set(r.email, r.id);
  for (const [email, r] of existingByEmail) contactIdByEmail.set(email, r.id);

  // ─── Tag handling: get-or-create per broker by lowercased name ──────────
  const wantedTagsByLower = new Map<string, string>();
  for (const row of byEmail.values()) {
    for (const t of row.tags) {
      const trimmed = t.trim();
      if (!trimmed) continue;
      const key = trimmed.toLowerCase();
      if (!wantedTagsByLower.has(key)) wantedTagsByLower.set(key, trimmed);
    }
  }

  let tagsCreated = 0;
  const tagIdByLowerName = new Map<string, string>();
  if (wantedTagsByLower.size > 0) {
    const { data: existingTags } = await supabase
      .from("contact_tags")
      .select("id, name")
      .eq("broker_id", brokerId);
    for (const t of (existingTags ?? []) as { id: string; name: string }[]) {
      tagIdByLowerName.set(t.name.toLowerCase(), t.id);
    }

    const toCreate = [...wantedTagsByLower.entries()]
      .filter(([lower]) => !tagIdByLowerName.has(lower))
      .map(([, original]) => original);
    if (toCreate.length > 0) {
      const { data: created, error } = await supabase
        .from("contact_tags")
        .insert(toCreate.map((name) => ({ broker_id: brokerId, name })))
        .select("id, name");
      if (!error && created) {
        for (const t of created as { id: string; name: string }[]) {
          tagIdByLowerName.set(t.name.toLowerCase(), t.id);
        }
        tagsCreated = created.length;
      }
    }
  }

  // ─── Link tags to contacts ──────────────────────────────────────────────
  const tagLinks: { contact_id: string; tag_id: string }[] = [];
  for (const row of byEmail.values()) {
    const contactId = contactIdByEmail.get(row.email);
    if (!contactId) continue;
    for (const tag of row.tags) {
      const tagId = tagIdByLowerName.get(tag.trim().toLowerCase());
      if (tagId) tagLinks.push({ contact_id: contactId, tag_id: tagId });
    }
  }
  if (tagLinks.length > 0) {
    await supabase
      .from("broker_contact_tag_map")
      .upsert(tagLinks, {
        onConflict: "contact_id,tag_id",
        ignoreDuplicates: true,
      });
  }

  // ─── Custom-field values ────────────────────────────────────────────────
  //
  // crm_custom_field_values stores values as JSONB with shape `{ v: ... }`.
  // We upsert (contact_id, field_id) — overwriting an existing value if one
  // is already there: shipping a value in the CSV is the broker's intent
  // to set it.
  let customFieldValuesSet = 0;
  const cfvInserts: {
    contact_id: string;
    field_id: string;
    value: { v: string | number | boolean };
    updated_at: string;
  }[] = [];
  for (const row of byEmail.values()) {
    const contactId = contactIdByEmail.get(row.email);
    if (!contactId) continue;
    for (const [fieldId, v] of Object.entries(row.custom_fields)) {
      cfvInserts.push({
        contact_id: contactId,
        field_id: fieldId,
        value: { v },
        updated_at: nowIso,
      });
    }
  }
  if (cfvInserts.length > 0) {
    const CFV_CHUNK = 500;
    for (let i = 0; i < cfvInserts.length; i += CFV_CHUNK) {
      const slice = cfvInserts.slice(i, i + CFV_CHUNK);
      const { error } = await supabase
        .from("crm_custom_field_values")
        .upsert(slice, { onConflict: "contact_id,field_id" });
      if (!error) customFieldValuesSet += slice.length;
    }
  }

  return {
    ok: true,
    inserted: insertedIds.length,
    updated: updatedCount,
    matched_no_op: matchedNoOpCount,
    skipped: totalSkipped,
    tags_created: tagsCreated,
    custom_field_values_set: customFieldValuesSet,
  };
}

/**
 * Read-side helper: returns the broker's custom fields formatted for the
 * import template (id + key + label + field_type + select options).
 *
 * Lives here so the client dialog only has to import one module.
 */
export async function getImportCustomFields(): Promise<
  {
    id: string;
    key: string;
    label: string;
    field_type: "text" | "number" | "boolean" | "select" | "date";
    options: { value: string; label: string }[] | null;
  }[]
> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "broker") return [];

  const broker = {
    id: session.user.id,
    agencyId: session.user.agencyId ?? null,
  };

  const supabase = createServiceRoleClient();
  let q = supabase
    .from("crm_custom_fields")
    .select("id, key, label, field_type, options")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (broker.agencyId) q = q.eq("agency_id", broker.agencyId);
  else q = q.eq("broker_id", broker.id);

  const { data } = await q;
  type Row = {
    id: string;
    key: string;
    label: string;
    field_type: "text" | "number" | "boolean" | "select" | "date";
    options: unknown;
  };
  const rows = (data ?? []) as Row[];
  return rows.map((r) => ({
    id: r.id,
    key: r.key,
    label: r.label,
    field_type: r.field_type,
    options: Array.isArray(r.options)
      ? (r.options as { value: string; label: string }[])
      : null,
  }));
}
