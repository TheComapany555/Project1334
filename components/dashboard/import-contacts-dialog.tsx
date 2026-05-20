"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Loader2,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import {
  chunkRows,
  downloadContactsTemplate,
  normalizeContacts,
  parseContactsFile,
  summariseRows,
  type ParsedFile,
} from "@/lib/contacts-import-client";
import {
  autoDetectMapping,
  buildFieldDefs,
  unmappedHeaders,
  MAX_IMPORT_ROWS,
  type ColumnMapping,
  type ContactImportRow,
  type FieldDef,
  type ImportCustomField,
  type ImportPreviewRow,
} from "@/lib/contacts-import-template";
import {
  getImportCustomFields,
  importContacts,
  type ImportContactsResult,
} from "@/lib/actions/contacts-import";
import { getMyContactEmails } from "@/lib/actions/contacts";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported?: () => void;
};

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB

const SKIP_VALUE = "__skip__";

const STATUS_BADGE: Record<
  ImportPreviewRow["status"],
  { label: string; cls: string }
> = {
  new: {
    label: "New",
    cls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
  },
  update: {
    label: "Update",
    cls: "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300",
  },
  skipped: {
    label: "Skipped",
    cls: "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300",
  },
};

type SuccessResult = Extract<ImportContactsResult, { ok: true }>;
type Totals = Omit<SuccessResult, "ok">;
const EMPTY_TOTALS: Totals = {
  inserted: 0,
  updated: 0,
  matched_no_op: 0,
  skipped: 0,
  tags_created: 0,
  custom_field_values_set: 0,
};

type Progress = {
  chunksDone: number;
  chunksTotal: number;
  rowsDone: number;
  rowsTotal: number;
};

type Step = "upload" | "map" | "review";

export function ImportContactsDialog({
  open,
  onOpenChange,
  onImported,
}: Props) {
  const [fileName, setFileName] = useState<string | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const [parsed, setParsed] = useState<ParsedFile | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping | null>(null);
  const [rows, setRows] = useState<ContactImportRow[]>([]);
  const [preview, setPreview] = useState<ImportPreviewRow[]>([]);
  const [submitting, startSubmit] = useTransition();
  const [progress, setProgress] = useState<Progress | null>(null);
  const [customFields, setCustomFields] = useState<ImportCustomField[]>([]);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [existingSet, setExistingSet] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    Promise.all([getMyContactEmails(), getImportCustomFields()])
      .then(([emails, fields]) => {
        if (cancelled) return;
        setExistingSet(new Set(emails.map((e) => e.trim().toLowerCase())));
        setCustomFields(fields);
      })
      .catch(() => {
        // Worst case the preview labels everything as "new" and the field list
        // misses custom fields; the server still enforces dedup so no data is
        // at risk.
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const fieldDefs = useMemo<FieldDef[]>(
    () => buildFieldDefs(customFields),
    [customFields],
  );

  const step: Step = !parsed ? "upload" : preview.length === 0 ? "map" : "review";

  function resetAll() {
    setFileName(null);
    setParseError(null);
    setParsed(null);
    setMapping(null);
    setRows([]);
    setPreview([]);
    setProgress(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  function handleOpenChange(next: boolean) {
    if (submitting) return; // never close mid-import
    if (!next) resetAll();
    onOpenChange(next);
  }

  async function handleFile(file: File) {
    resetAll();
    setFileName(file.name);
    if (file.size > MAX_FILE_BYTES) {
      setParseError(
        `File is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max is ${(MAX_FILE_BYTES / 1024 / 1024).toFixed(0)} MB — split larger lists into multiple files.`,
      );
      return;
    }
    setParsing(true);
    try {
      const result = await parseContactsFile(file);
      if (!result.ok) {
        setParseError(result.error);
        return;
      }
      setParsed(result.parsed);
      setMapping(autoDetectMapping(result.parsed.headers, customFields));
    } finally {
      setParsing(false);
    }
  }

  function handlePicker() {
    inputRef.current?.click();
  }

  const updateMapping = useCallback(
    (key: string, columnIndex: number | null) => {
      setMapping((prev) => (prev ? { ...prev, [key]: columnIndex } : prev));
    },
    [],
  );

  const emailMapped =
    mapping != null && mapping.email != null && mapping.email >= 0;

  const mappedFieldCount = useMemo(() => {
    if (!mapping) return 0;
    return Object.values(mapping).filter((v) => v != null && v >= 0).length;
  }, [mapping]);

  const unmapped = useMemo(() => {
    if (!parsed || !mapping) return [] as string[];
    return unmappedHeaders(parsed.headers, mapping);
  }, [parsed, mapping]);

  function handleConfirmMapping() {
    if (!parsed || !mapping) return;
    if (!emailMapped) {
      toast.error("Pick a column for Email before continuing.");
      return;
    }
    const result = normalizeContacts(
      parsed,
      mapping,
      customFields,
      existingSet,
    );
    if (result.rows.length === 0) {
      toast.error(
        "No rows have a valid email after mapping. Pick a different column or check the file.",
      );
      return;
    }
    setRows(result.rows);
    setPreview(result.preview);
  }

  function handleBackToMapping() {
    setRows([]);
    setPreview([]);
  }

  async function handleSubmit() {
    if (rows.length === 0) return;
    startSubmit(async () => {
      const chunks = [...chunkRows(rows)];
      const totals: Totals = { ...EMPTY_TOTALS };
      setProgress({
        chunksDone: 0,
        chunksTotal: chunks.length,
        rowsDone: 0,
        rowsTotal: rows.length,
      });

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const res = await importContacts(chunk);
        if (!res.ok) {
          toast.error(
            chunks.length === 1
              ? res.error
              : `Chunk ${i + 1}/${chunks.length} failed: ${res.error}`,
          );
          setProgress(null);
          return;
        }
        totals.inserted += res.inserted;
        totals.updated += res.updated;
        totals.matched_no_op += res.matched_no_op;
        totals.skipped += res.skipped;
        totals.tags_created += res.tags_created;
        totals.custom_field_values_set += res.custom_field_values_set;
        setProgress((prev) =>
          prev
            ? {
                ...prev,
                chunksDone: i + 1,
                rowsDone: Math.min(prev.rowsTotal, (i + 1) * chunk.length),
              }
            : prev,
        );
      }

      const parts: string[] = [];
      if (totals.inserted > 0) parts.push(`${totals.inserted} added`);
      if (totals.updated > 0) parts.push(`${totals.updated} updated`);
      if (totals.matched_no_op > 0)
        parts.push(`${totals.matched_no_op} unchanged`);
      if (totals.skipped > 0) parts.push(`${totals.skipped} skipped`);
      const tail: string[] = [];
      if (totals.tags_created > 0)
        tail.push(
          `${totals.tags_created} new tag${totals.tags_created === 1 ? "" : "s"}`,
        );
      if (totals.custom_field_values_set > 0)
        tail.push(
          `${totals.custom_field_values_set} custom value${totals.custom_field_values_set === 1 ? "" : "s"}`,
        );
      const description = tail.length > 0 ? tail.join(" · ") : undefined;
      toast.success(parts.join(" · ") || "Import complete", { description });
      setProgress(null);
      handleOpenChange(false);
      onImported?.();
    });
  }

  const counts = useMemo(() => {
    const c = { new: 0, update: 0, skipped: 0 };
    for (const p of preview) c[p.status] += 1;
    return c;
  }, [preview]);

  const summary = useMemo(() => summariseRows(rows), [rows]);
  const canImport = rows.length > 0 && !submitting;
  const progressPct = progress
    ? Math.round((progress.chunksDone / Math.max(1, progress.chunksTotal)) * 100)
    : 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <FileSpreadsheet className="size-4" />
            Import contacts
          </DialogTitle>
          <DialogDescription>
            Upload any .xlsx or .csv. We&apos;ll auto-detect your columns and
            let you confirm the mapping before importing.
          </DialogDescription>
        </DialogHeader>

        {/* Step ribbon */}
        <StepRibbon step={step} />

        {/* STEP: Upload */}
        {step === "upload" && (
          <div className="space-y-3">
            <div className="rounded-md border border-border bg-muted/30 p-3 flex flex-wrap items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">Got your own spreadsheet?</p>
                <p className="text-xs text-muted-foreground">
                  Upload any .xlsx or .csv up to {MAX_IMPORT_ROWS.toLocaleString()}{" "}
                  rows. We&apos;ll auto-match your columns to CRM fields and let
                  you fix anything that&apos;s off.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => downloadContactsTemplate(customFields)}
                className="gap-1"
              >
                <Download className="size-3.5" />
                Sample file
              </Button>
            </div>

            <div className="rounded-md border border-dashed border-border p-6 text-center">
              <input
                ref={inputRef}
                type="file"
                accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
              />
              <Upload className="size-6 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm font-medium">Choose a spreadsheet</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Any column layout — we&apos;ll map fields in the next step.
              </p>
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={handlePicker}
                className="mt-3 gap-1"
                disabled={parsing}
              >
                {parsing ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Upload className="size-3.5" />
                )}
                {parsing ? "Reading…" : fileName ? "Choose a different file" : "Browse"}
              </Button>
              {fileName && !parsing && (
                <p className="mt-2 text-xs text-muted-foreground truncate">
                  {fileName}
                </p>
              )}
            </div>

            {parseError && (
              <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-2.5 text-xs text-destructive">
                <AlertCircle className="size-3.5 mt-0.5 shrink-0" />
                <span>{parseError}</span>
              </div>
            )}
          </div>
        )}

        {/* STEP: Map columns */}
        {step === "map" && parsed && mapping && (
          <MapStep
            parsed={parsed}
            mapping={mapping}
            fieldDefs={fieldDefs}
            mappedFieldCount={mappedFieldCount}
            unmapped={unmapped}
            fileName={fileName}
            emailMapped={emailMapped}
            onChange={updateMapping}
            onAutoDetect={() =>
              setMapping(autoDetectMapping(parsed.headers, customFields))
            }
            onChooseAnother={handlePicker}
          />
        )}

        {/* STEP: Review */}
        {step === "review" && (
          <div className="flex-1 min-h-0 flex flex-col rounded-md border border-border overflow-hidden">
            <div className="border-b border-border bg-muted/30 px-3 py-2 flex flex-wrap items-center gap-2">
              <p className="text-sm font-medium">Review and import</p>
              <div className="flex items-center gap-1.5 ml-auto flex-wrap">
                {counts.new > 0 && (
                  <Badge variant="secondary" className={STATUS_BADGE.new.cls}>
                    {counts.new} new
                  </Badge>
                )}
                {counts.update > 0 && (
                  <Badge
                    variant="secondary"
                    className={STATUS_BADGE.update.cls}
                  >
                    {counts.update} updates
                  </Badge>
                )}
                {counts.skipped > 0 && (
                  <Badge
                    variant="secondary"
                    className={STATUS_BADGE.skipped.cls}
                  >
                    {counts.skipped} skipped
                  </Badge>
                )}
                {summary.withConsent > 0 && (
                  <Badge variant="outline" className="text-[10px]">
                    {summary.withConsent} consenting
                  </Badge>
                )}
                {summary.withCustomFields > 0 && (
                  <Badge
                    variant="outline"
                    className="text-[10px] gap-1 border-purple-300 text-purple-700 dark:border-purple-800 dark:text-purple-300"
                  >
                    <Sparkles className="size-2.5" />
                    {summary.withCustomFields} with custom fields
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-background border-b border-border">
                  <tr className="text-left text-muted-foreground">
                    <th className="px-3 py-2 font-medium w-12">Row</th>
                    <th className="px-3 py-2 font-medium w-20">Status</th>
                    <th className="px-3 py-2 font-medium">Email</th>
                    <th className="px-3 py-2 font-medium">Name</th>
                    <th className="px-3 py-2 font-medium">Tags</th>
                    <th className="px-3 py-2 font-medium w-16 text-center">
                      Custom
                    </th>
                    <th className="px-3 py-2 font-medium">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {preview.map((row) => {
                    const badge = STATUS_BADGE[row.status];
                    const cfCount = row.data.custom_field_count ?? 0;
                    const cfWarnings = row.data.custom_field_warnings;
                    return (
                      <tr
                        key={row.rowNumber}
                        className={
                          row.status === "skipped"
                            ? "bg-red-50/40 dark:bg-red-950/10"
                            : ""
                        }
                      >
                        <td className="px-3 py-1.5 tabular-nums text-muted-foreground align-top">
                          {row.rowNumber}
                        </td>
                        <td className="px-3 py-1.5 align-top">
                          <span
                            className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${badge.cls}`}
                          >
                            {badge.label}
                          </span>
                        </td>
                        <td className="px-3 py-1.5 truncate max-w-[200px] align-top">
                          {row.data.email ?? (
                            <span className="text-muted-foreground italic">
                              missing
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-1.5 truncate max-w-[160px] align-top">
                          {row.data.name ?? "—"}
                        </td>
                        <td className="px-3 py-1.5 align-top">
                          {row.data.tags && row.data.tags.length > 0 ? (
                            <span className="truncate inline-block max-w-[180px]">
                              {row.data.tags.join(", ")}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-3 py-1.5 text-center align-top">
                          {cfCount > 0 ? (
                            <span className="inline-block rounded px-1.5 py-0.5 text-[10px] font-medium bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300">
                              {cfCount}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-3 py-1.5 text-muted-foreground align-top">
                          {row.reason ? (
                            <span>{row.reason}</span>
                          ) : (
                            <>
                              {row.data.notes ? (
                                <span className="block truncate max-w-[280px]">
                                  {row.data.notes.slice(0, 60)}
                                </span>
                              ) : null}
                              {cfWarnings && cfWarnings.length > 0 && (
                                <span className="mt-1 block text-[10px] text-amber-700 dark:text-amber-300">
                                  {cfWarnings.join(" · ")}
                                </span>
                              )}
                              {!row.data.notes &&
                                (!cfWarnings || cfWarnings.length === 0) &&
                                "—"}
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Truncation warning lives outside steps so it's visible during map + review */}
        {parsed?.truncated && step !== "upload" && (
          <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-950/30 p-2.5 text-xs text-amber-800 dark:text-amber-300">
            <AlertCircle className="size-3.5 mt-0.5 shrink-0" />
            <span>
              Only the first {MAX_IMPORT_ROWS.toLocaleString()} rows of your
              file will be processed. Split larger files into multiple uploads.
            </span>
          </div>
        )}

        {/* Progress bar — visible while chunks are uploading */}
        {progress && (
          <div className="rounded-md border border-border bg-muted/30 p-3 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium">
                Importing chunk {progress.chunksDone} of {progress.chunksTotal}
              </span>
              <span className="tabular-nums text-muted-foreground">
                {progress.rowsDone.toLocaleString()} /{" "}
                {progress.rowsTotal.toLocaleString()} rows · {progressPct}%
              </span>
            </div>
            <div
              className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
              role="progressbar"
              aria-valuenow={progressPct}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="h-full bg-primary transition-all duration-300 ease-out"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              You can leave this dialog open — we&apos;ll keep going in the
              background.
            </p>
          </div>
        )}

        <DialogFooter className="flex-row justify-between sm:justify-between gap-2">
          <div className="flex items-center gap-2">
            {step === "review" && !submitting && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleBackToMapping}
                className="gap-1"
              >
                <ArrowLeft className="size-3.5" />
                Back to mapping
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={submitting}
            >
              <X className="size-3.5" />
              Cancel
            </Button>
            {step === "map" && (
              <Button
                type="button"
                onClick={handleConfirmMapping}
                disabled={!emailMapped}
                className="gap-1"
              >
                <CheckCircle2 className="size-3.5" />
                Continue
              </Button>
            )}
            {step === "review" && (
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={!canImport}
                className="gap-1"
              >
                {submitting ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="size-3.5" />
                )}
                {submitting
                  ? progress
                    ? `Importing… ${progressPct}%`
                    : "Importing…"
                  : `Import ${rows.length.toLocaleString()} contact${rows.length === 1 ? "" : "s"}`}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ───────────────────────── helpers / subcomponents ─────────────────────────

function StepRibbon({ step }: { step: Step }) {
  const items: { key: Step; label: string }[] = [
    { key: "upload", label: "Upload" },
    { key: "map", label: "Map columns" },
    { key: "review", label: "Review" },
  ];
  const activeIdx = items.findIndex((i) => i.key === step);
  return (
    <div className="flex items-center gap-2 text-xs">
      {items.map((item, i) => {
        const done = i < activeIdx;
        const active = i === activeIdx;
        return (
          <div key={item.key} className="flex items-center gap-2">
            <span
              className={`flex items-center gap-1.5 ${
                active
                  ? "font-medium text-foreground"
                  : done
                    ? "text-foreground/80"
                    : "text-muted-foreground"
              }`}
            >
              <span
                className={`inline-flex size-5 items-center justify-center rounded-full border text-[10px] ${
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : done
                      ? "border-emerald-500 bg-emerald-500 text-white"
                      : "border-border bg-background text-muted-foreground"
                }`}
              >
                {done ? "✓" : i + 1}
              </span>
              {item.label}
            </span>
            {i < items.length - 1 && (
              <span className="h-px w-6 bg-border" aria-hidden />
            )}
          </div>
        );
      })}
    </div>
  );
}

function MapStep({
  parsed,
  mapping,
  fieldDefs,
  mappedFieldCount,
  unmapped,
  fileName,
  emailMapped,
  onChange,
  onAutoDetect,
  onChooseAnother,
}: {
  parsed: ParsedFile;
  mapping: ColumnMapping;
  fieldDefs: FieldDef[];
  mappedFieldCount: number;
  unmapped: string[];
  fileName: string | null;
  emailMapped: boolean;
  onChange: (key: string, columnIndex: number | null) => void;
  onAutoDetect: () => void;
  onChooseAnother: () => void;
}) {
  function previewCellsForIndex(idx: number | null | undefined): string {
    if (idx == null || idx < 0) return "";
    const samples = parsed.dataRows
      .slice(0, 3)
      .map((r) => (r[idx] == null ? "" : String(r[idx]).trim()))
      .filter((s) => s.length > 0);
    return samples.length > 0 ? samples.join(" · ") : "(empty)";
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-3">
      {/* File summary + actions */}
      <div className="rounded-md border border-border bg-muted/30 px-3 py-2 flex flex-wrap items-center gap-2 text-xs">
        <FileSpreadsheet className="size-3.5 text-muted-foreground" />
        <span className="font-medium truncate max-w-[260px]">
          {fileName ?? "uploaded file"}
        </span>
        <span className="text-muted-foreground">
          · {parsed.dataRows.length.toLocaleString()} row
          {parsed.dataRows.length === 1 ? "" : "s"} · {parsed.headers.length}{" "}
          column{parsed.headers.length === 1 ? "" : "s"}
        </span>
        <span className="ml-auto flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onAutoDetect}
            className="gap-1 h-7 px-2"
          >
            <Sparkles className="size-3.5" />
            Auto-detect
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onChooseAnother}
            className="gap-1 h-7 px-2"
          >
            <Upload className="size-3.5" />
            Replace file
          </Button>
        </span>
      </div>

      {!emailMapped && (
        <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-950/30 p-2.5 text-xs text-amber-800 dark:text-amber-300">
          <AlertCircle className="size-3.5 mt-0.5 shrink-0" />
          <span>
            Pick a column for <b>Email</b> — it&apos;s the only required field
            and it&apos;s what we use to merge with existing contacts.
          </span>
        </div>
      )}

      {/* Mapping table — scrolls if it overflows */}
      <div className="flex-1 min-h-0 overflow-y-auto rounded-md border border-border">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-background border-b border-border">
            <tr className="text-left text-muted-foreground">
              <th className="px-3 py-2 font-medium w-[34%]">CRM field</th>
              <th className="px-3 py-2 font-medium w-[34%]">
                Column from your file
              </th>
              <th className="px-3 py-2 font-medium">First values</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {fieldDefs.map((fd) => {
              const current = mapping[fd.key];
              const selectValue =
                current == null || current < 0
                  ? SKIP_VALUE
                  : String(current);
              const sample = previewCellsForIndex(current);
              return (
                <tr key={fd.key}>
                  <td className="px-3 py-2 align-top">
                    <div className="font-medium flex items-center gap-1.5">
                      {fd.label}
                      {fd.required && (
                        <span className="text-red-600 dark:text-red-400">
                          *
                        </span>
                      )}
                      {fd.customField && (
                        <Sparkles className="size-3 text-purple-600 dark:text-purple-400" />
                      )}
                    </div>
                    {fd.hint && (
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        {fd.hint}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2 align-top">
                    <Select
                      value={selectValue}
                      onValueChange={(v) =>
                        onChange(fd.key, v === SKIP_VALUE ? null : Number(v))
                      }
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Pick a column…" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={SKIP_VALUE}>
                          — Skip this field —
                        </SelectItem>
                        {parsed.headers.map((h, i) => (
                          <SelectItem key={i} value={String(i)}>
                            {h || `Column ${i + 1}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground align-top">
                    {sample ? (
                      <span className="truncate inline-block max-w-[260px]">
                        {sample}
                      </span>
                    ) : (
                      <span className="text-muted-foreground/60">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
        <Badge variant="outline" className="text-[10px]">
          {mappedFieldCount} field{mappedFieldCount === 1 ? "" : "s"} mapped
        </Badge>
        {unmapped.length > 0 && (
          <span>
            Unmapped columns we&apos;ll ignore:{" "}
            <span className="font-medium text-foreground/80">
              {unmapped.slice(0, 5).join(", ")}
              {unmapped.length > 5 && ` +${unmapped.length - 5} more`}
            </span>
          </span>
        )}
      </div>
    </div>
  );
}
