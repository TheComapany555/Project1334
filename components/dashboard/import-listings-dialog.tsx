"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
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
  chunkRows,
  downloadListingsTemplate,
  normalizeListings,
  parseListingsFile,
  MAX_IMPORT_ROWS,
  type ParsedFile,
} from "@/lib/listings-import-client";
import {
  autoDetectMapping,
  buildListingFieldDefs,
  unmappedHeaders,
  type ColumnMapping,
  type ListingFieldDef,
  type ListingImportPreviewRow,
  type ListingImportRow,
} from "@/lib/listings-import";
import { importListings } from "@/lib/actions/listings-import";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported?: () => void;
};

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const SKIP_VALUE = "__skip__";

type Step = "upload" | "map" | "review";
type Progress = { chunksDone: number; chunksTotal: number; rowsDone: number; rowsTotal: number };

export function ImportListingsDialog({ open, onOpenChange, onImported }: Props) {
  const [fileName, setFileName] = useState<string | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const [parsed, setParsed] = useState<ParsedFile | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping | null>(null);
  const [rows, setRows] = useState<ListingImportRow[]>([]);
  const [preview, setPreview] = useState<ListingImportPreviewRow[]>([]);
  const [submitting, startSubmit] = useTransition();
  const [progress, setProgress] = useState<Progress | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const fieldDefs = useMemo<ListingFieldDef[]>(() => buildListingFieldDefs(), []);
  const step: Step = !parsed ? "upload" : preview.length === 0 ? "map" : "review";

  const titleMapped = mapping != null && mapping.title != null && mapping.title >= 0;
  const unmapped = useMemo(
    () => (parsed && mapping ? unmappedHeaders(parsed.headers, mapping) : []),
    [parsed, mapping],
  );
  const readyCount = preview.filter((p) => p.status === "ready").length;
  const skippedCount = preview.filter((p) => p.status === "skipped").length;
  const progressPct = progress
    ? Math.round((progress.chunksDone / Math.max(1, progress.chunksTotal)) * 100)
    : 0;

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
    if (submitting) return;
    if (!next) resetAll();
    onOpenChange(next);
  }

  async function handleFile(file: File) {
    resetAll();
    setFileName(file.name);
    if (file.size > MAX_FILE_BYTES) {
      setParseError(
        `File is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max is ${(MAX_FILE_BYTES / 1024 / 1024).toFixed(0)} MB.`,
      );
      return;
    }
    setParsing(true);
    try {
      const result = await parseListingsFile(file);
      if (!result.ok) {
        setParseError(result.error);
        return;
      }
      setParsed(result.parsed);
      setMapping(autoDetectMapping(result.parsed.headers));
    } finally {
      setParsing(false);
    }
  }

  function handleConfirmMapping() {
    if (!parsed || !mapping) return;
    if (!titleMapped) {
      toast.error("Pick a column for Title before continuing.");
      return;
    }
    const result = normalizeListings(parsed, mapping);
    if (result.rows.length === 0) {
      toast.error("No rows have a title after mapping. Pick a different column or check the file.");
      return;
    }
    setRows(result.rows);
    setPreview(result.preview);
  }

  function handleSubmit() {
    if (rows.length === 0) return;
    startSubmit(async () => {
      const chunks = [...chunkRows(rows)];
      const totals = { created: 0, skipped: 0, categoryMatched: 0, categoryUnmatched: 0 };
      setProgress({ chunksDone: 0, chunksTotal: chunks.length, rowsDone: 0, rowsTotal: rows.length });

      for (let i = 0; i < chunks.length; i++) {
        const res = await importListings(chunks[i]);
        if (!res.ok) {
          toast.error(
            chunks.length === 1 ? res.error : `Batch ${i + 1}/${chunks.length} failed: ${res.error}`,
          );
          setProgress(null);
          return;
        }
        totals.created += res.created;
        totals.skipped += res.skipped;
        totals.categoryMatched += res.categoryMatched;
        totals.categoryUnmatched += res.categoryUnmatched;
        setProgress((prev) =>
          prev
            ? { ...prev, chunksDone: i + 1, rowsDone: Math.min(prev.rowsTotal, (i + 1) * chunks[i].length) }
            : prev,
        );
      }

      const parts = [`${totals.created} listing${totals.created === 1 ? "" : "s"} imported as drafts`];
      if (totals.categoryUnmatched > 0) parts.push(`${totals.categoryUnmatched} without a matched category`);
      if (totals.skipped > 0) parts.push(`${totals.skipped} skipped`);
      toast.success("Import complete", { description: parts.join(" · ") });
      setProgress(null);
      handleOpenChange(false);
      onImported?.();
    });
  }

  function previewCellsForIndex(idx: number | null | undefined): string {
    if (!parsed || idx == null || idx < 0) return "";
    const samples = parsed.dataRows
      .slice(0, 3)
      .map((r) => (r[idx] == null ? "" : String(r[idx]).trim()))
      .filter((s) => s.length > 0);
    return samples.length > 0 ? samples.join(" · ") : "(empty)";
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-3xl flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <FileSpreadsheet className="size-4" />
            Import listings
          </DialogTitle>
          <DialogDescription>
            Upload any .xlsx or .csv. We&apos;ll auto-detect your columns and let you confirm the
            mapping. Listings are imported as drafts you can review and publish.
          </DialogDescription>
        </DialogHeader>

        <StepRibbon step={step} />

        {/* STEP: Upload */}
        {step === "upload" && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3 rounded-md border bg-muted/30 p-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">Need a starting point?</p>
                <p className="text-xs text-muted-foreground">
                  Download the template, or upload any spreadsheet (up to{" "}
                  {MAX_IMPORT_ROWS.toLocaleString()} rows) and map columns in the next step.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={downloadListingsTemplate}
                className="gap-1"
              >
                <Download className="size-3.5" />
                Template
              </Button>
            </div>

            <div className="rounded-md border border-dashed p-6 text-center">
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
              <Upload className="mx-auto mb-2 size-6 text-muted-foreground" />
              <p className="text-sm font-medium">Choose a spreadsheet</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Any column layout — we&apos;ll map fields next.
              </p>
              <Button
                type="button"
                size="sm"
                onClick={() => inputRef.current?.click()}
                className="mt-3 gap-1"
                disabled={parsing}
              >
                {parsing ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />}
                {parsing ? "Reading…" : fileName ? "Choose a different file" : "Browse"}
              </Button>
              {fileName && !parsing && (
                <p className="mt-2 truncate text-xs text-muted-foreground">{fileName}</p>
              )}
            </div>

            {parseError && (
              <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-2.5 text-xs text-destructive">
                <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
                <span>{parseError}</span>
              </div>
            )}
          </div>
        )}

        {/* STEP: Map */}
        {step === "map" && parsed && mapping && (
          <div className="flex min-h-0 flex-1 flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 text-xs">
              <FileSpreadsheet className="size-3.5 text-muted-foreground" />
              <span className="max-w-[260px] truncate font-medium">{fileName ?? "uploaded file"}</span>
              <span className="text-muted-foreground">
                · {parsed.dataRows.length.toLocaleString()} row{parsed.dataRows.length === 1 ? "" : "s"} ·{" "}
                {parsed.headers.length} column{parsed.headers.length === 1 ? "" : "s"}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setMapping(autoDetectMapping(parsed.headers))}
                className="ml-auto h-7 gap-1 px-2"
              >
                <Sparkles className="size-3.5" />
                Auto-detect
              </Button>
            </div>

            {!titleMapped && (
              <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-2.5 text-xs text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300">
                <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
                <span>
                  Pick a column for <b>Title</b> — it&apos;s the only required field.
                </span>
              </div>
            )}

            <div className="min-h-0 flex-1 overflow-y-auto rounded-md border">
              <table className="w-full text-xs">
                <thead className="sticky top-0 border-b bg-background">
                  <tr className="text-left text-muted-foreground">
                    <th className="w-[34%] px-3 py-2 font-medium">Listing field</th>
                    <th className="w-[34%] px-3 py-2 font-medium">Column from your file</th>
                    <th className="px-3 py-2 font-medium">First values</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {fieldDefs.map((fd) => {
                    const current = mapping[fd.key];
                    const selectValue = current == null || current < 0 ? SKIP_VALUE : String(current);
                    const sample = previewCellsForIndex(current);
                    return (
                      <tr key={fd.key}>
                        <td className="px-3 py-2 align-top">
                          <div className="flex items-center gap-1.5 font-medium">
                            {fd.label}
                            {fd.required && <span className="text-red-600 dark:text-red-400">*</span>}
                          </div>
                          {fd.hint && (
                            <div className="mt-0.5 text-[10px] text-muted-foreground">{fd.hint}</div>
                          )}
                        </td>
                        <td className="px-3 py-2 align-top">
                          <Select
                            value={selectValue}
                            onValueChange={(v) =>
                              setMapping((prev) =>
                                prev ? { ...prev, [fd.key]: v === SKIP_VALUE ? null : Number(v) } : prev,
                              )
                            }
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Pick a column…" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={SKIP_VALUE}>— Skip this field —</SelectItem>
                              {parsed.headers.map((h, i) => (
                                <SelectItem key={i} value={String(i)}>
                                  {h || `Column ${i + 1}`}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-3 py-2 align-top text-muted-foreground">
                          {sample ? (
                            <span className="inline-block max-w-[260px] truncate">{sample}</span>
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

            {unmapped.length > 0 && (
              <p className="text-[11px] text-muted-foreground">
                Unmapped columns we&apos;ll ignore:{" "}
                <span className="font-medium text-foreground/80">
                  {unmapped.slice(0, 6).join(", ")}
                  {unmapped.length > 6 && ` +${unmapped.length - 6} more`}
                </span>
              </p>
            )}
          </div>
        )}

        {/* STEP: Review */}
        {step === "review" && (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border">
            <div className="flex flex-wrap items-center gap-2 border-b bg-muted/30 px-3 py-2">
              <p className="text-sm font-medium">Review and import</p>
              <div className="ml-auto flex flex-wrap items-center gap-1.5">
                {readyCount > 0 && (
                  <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                    {readyCount} ready
                  </Badge>
                )}
                {skippedCount > 0 && (
                  <Badge variant="secondary" className="bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300">
                    {skippedCount} skipped
                  </Badge>
                )}
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 border-b bg-background">
                  <tr className="text-left text-muted-foreground">
                    <th className="w-12 px-3 py-2 font-medium">Row</th>
                    <th className="w-20 px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium">Title</th>
                    <th className="px-3 py-2 font-medium">Category</th>
                    <th className="px-3 py-2 font-medium">Price</th>
                    <th className="px-3 py-2 font-medium">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {preview.map((row) => (
                    <tr
                      key={row.rowNumber}
                      className={row.status === "skipped" ? "bg-red-50/40 dark:bg-red-950/10" : ""}
                    >
                      <td className="px-3 py-1.5 align-top tabular-nums text-muted-foreground">
                        {row.rowNumber}
                      </td>
                      <td className="px-3 py-1.5 align-top">
                        <span
                          className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${
                            row.status === "skipped"
                              ? "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300"
                              : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                          }`}
                        >
                          {row.status === "skipped" ? "Skipped" : "Ready"}
                        </span>
                      </td>
                      <td className="max-w-[220px] truncate px-3 py-1.5 align-top">
                        {row.data.title ?? <span className="italic text-muted-foreground">missing</span>}
                      </td>
                      <td className="max-w-[140px] truncate px-3 py-1.5 align-top">
                        {row.data.category ?? "—"}
                      </td>
                      <td className="px-3 py-1.5 align-top tabular-nums">{row.data.price ?? "—"}</td>
                      <td className="px-3 py-1.5 align-top text-muted-foreground">
                        {row.reason ? (
                          <span>{row.reason}</span>
                        ) : row.warnings && row.warnings.length > 0 ? (
                          <span className="block text-[10px] text-amber-700 dark:text-amber-300">
                            {row.warnings.join(" · ")}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {parsed?.truncated && step !== "upload" && (
          <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-2.5 text-xs text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300">
            <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
            <span>
              Only the first {MAX_IMPORT_ROWS.toLocaleString()} rows will be processed. Split larger
              files into multiple uploads.
            </span>
          </div>
        )}

        {progress && (
          <div className="space-y-2 rounded-md border bg-muted/30 p-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium">
                Importing batch {progress.chunksDone} of {progress.chunksTotal}
              </span>
              <span className="tabular-nums text-muted-foreground">
                {progress.rowsDone.toLocaleString()} / {progress.rowsTotal.toLocaleString()} rows ·{" "}
                {progressPct}%
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
          </div>
        )}

        <DialogFooter className="flex-row justify-between gap-2 sm:justify-between">
          <div>
            {step === "review" && !submitting && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setRows([]);
                  setPreview([]);
                }}
                className="gap-1"
              >
                <ArrowLeft className="size-3.5" />
                Back to mapping
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={submitting}>
              <X className="size-3.5" />
              Cancel
            </Button>
            {step === "map" && (
              <Button type="button" onClick={handleConfirmMapping} disabled={!titleMapped} className="gap-1">
                <CheckCircle2 className="size-3.5" />
                Continue
              </Button>
            )}
            {step === "review" && (
              <Button type="button" onClick={handleSubmit} disabled={readyCount === 0 || submitting} className="gap-1">
                {submitting ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />}
                {submitting
                  ? progress
                    ? `Importing… ${progressPct}%`
                    : "Importing…"
                  : `Import ${readyCount.toLocaleString()} listing${readyCount === 1 ? "" : "s"}`}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

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
                active ? "font-medium text-foreground" : done ? "text-foreground/80" : "text-muted-foreground"
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
            {i < items.length - 1 && <span className="h-px w-6 bg-border" aria-hidden />}
          </div>
        );
      })}
    </div>
  );
}
