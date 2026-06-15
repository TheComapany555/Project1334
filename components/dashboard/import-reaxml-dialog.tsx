"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  FileCode2,
  Loader2,
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
import { parseReaxmlPreview, importReaxml } from "@/lib/actions/reaxml-import";
import {
  REAXML_IMPORT_CHUNK,
  type ReaxmlPreviewRow,
} from "@/lib/reaxml-import-shared";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported?: () => void;
};

const MAX_FILE_BYTES = 10 * 1024 * 1024;

type Step = "upload" | "review";
type Progress = { done: number; total: number };

export function ImportReaxmlDialog({ open, onOpenChange, onImported }: Props) {
  const [fileName, setFileName] = useState<string | null>(null);
  const [xmlText, setXmlText] = useState<string | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const [preview, setPreview] = useState<ReaxmlPreviewRow[] | null>(null);
  const [submitting, startSubmit] = useTransition();
  const [progress, setProgress] = useState<Progress | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const step: Step = preview ? "review" : "upload";
  const readyCount = preview?.filter((p) => p.status === "ready").length ?? 0;
  const skippedCount = preview?.filter((p) => p.status === "skip").length ?? 0;
  const progressPct = progress
    ? Math.round((progress.done / Math.max(1, progress.total)) * 100)
    : 0;

  function resetAll() {
    setFileName(null);
    setXmlText(null);
    setParseError(null);
    setPreview(null);
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
      const text = await file.text();
      const res = await parseReaxmlPreview(text);
      if (!res.ok) {
        setParseError(res.error);
        return;
      }
      if (res.readyCount === 0) {
        setParseError("No importable listings found in this file.");
      }
      setXmlText(text);
      setPreview(res.preview);
    } catch {
      setParseError("Couldn't read this file.");
    } finally {
      setParsing(false);
    }
  }

  function handleSubmit() {
    if (!xmlText || !preview) return;
    const total = preview.length;
    startSubmit(async () => {
      const totals = { created: 0, updated: 0, skipped: 0, imagesAdded: 0, imageFailures: 0 };
      setProgress({ done: 0, total });
      for (let start = 0; start < total; start += REAXML_IMPORT_CHUNK) {
        const res = await importReaxml(xmlText, { startIndex: start, count: REAXML_IMPORT_CHUNK });
        if (!res.ok) {
          toast.error(res.error);
          setProgress(null);
          return;
        }
        totals.created += res.created;
        totals.updated += res.updated;
        totals.skipped += res.skipped;
        totals.imagesAdded += res.imagesAdded;
        totals.imageFailures += res.imageFailures;
        setProgress({ done: Math.min(total, start + REAXML_IMPORT_CHUNK), total });
      }

      const parts: string[] = [];
      if (totals.created) parts.push(`${totals.created} created`);
      if (totals.updated) parts.push(`${totals.updated} updated`);
      if (totals.imagesAdded) parts.push(`${totals.imagesAdded} images`);
      if (totals.skipped) parts.push(`${totals.skipped} skipped`);
      if (totals.imageFailures) parts.push(`${totals.imageFailures} images failed`);
      toast.success("REAXML import complete", {
        description: (parts.join(" · ") || "Nothing to import") + ". Imported as drafts.",
      });
      setProgress(null);
      handleOpenChange(false);
      onImported?.();
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-3xl flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <FileCode2 className="size-4" />
            Import REAXML file
          </DialogTitle>
          <DialogDescription>
            Upload a REAXML (.xml) business-listing file. We&apos;ll read it, show a preview, and
            import the listings as drafts you can review and publish.
          </DialogDescription>
        </DialogHeader>

        {/* STEP: Upload */}
        {step === "upload" && (
          <div className="space-y-3">
            <div className="rounded-md border border-dashed p-6 text-center">
              <input
                ref={inputRef}
                type="file"
                accept=".xml,application/xml,text/xml"
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
              />
              <Upload className="mx-auto mb-2 size-6 text-muted-foreground" />
              <p className="text-sm font-medium">Choose a REAXML file</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Single listing or a batch — up to {(MAX_FILE_BYTES / 1024 / 1024).toFixed(0)} MB.
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

        {/* STEP: Review */}
        {step === "review" && preview && (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border">
            <div className="flex flex-wrap items-center gap-2 border-b bg-muted/30 px-3 py-2">
              <p className="text-sm font-medium">Review and import</p>
              <span className="truncate text-xs text-muted-foreground">{fileName}</span>
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
                    <th className="w-12 px-3 py-2 font-medium">#</th>
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
                      key={row.index}
                      className={row.status === "skip" ? "bg-red-50/40 dark:bg-red-950/10" : ""}
                    >
                      <td className="px-3 py-1.5 align-top tabular-nums text-muted-foreground">
                        {row.index + 1}
                      </td>
                      <td className="px-3 py-1.5 align-top">
                        <span
                          className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${
                            row.status === "skip"
                              ? "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300"
                              : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                          }`}
                        >
                          {row.status === "skip" ? "Skip" : row.statusLabel}
                        </span>
                      </td>
                      <td className="max-w-[220px] truncate px-3 py-1.5 align-top">
                        {row.title ?? <span className="italic text-muted-foreground">missing</span>}
                      </td>
                      <td className="max-w-[160px] truncate px-3 py-1.5 align-top">
                        {row.category ?? "—"}
                        {row.subcategory ? (
                          <span className="text-muted-foreground"> · {row.subcategory}</span>
                        ) : null}
                      </td>
                      <td className="px-3 py-1.5 align-top tabular-nums">{row.price}</td>
                      <td className="px-3 py-1.5 align-top text-muted-foreground">
                        {row.reason ? (
                          <span>{row.reason}</span>
                        ) : row.warnings.length > 0 ? (
                          <span className="block text-[10px] text-amber-700 dark:text-amber-300">
                            {row.warnings.join(" · ")}
                          </span>
                        ) : row.images > 0 ? (
                          `${row.images} image${row.images === 1 ? "" : "s"}`
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

        {progress && (
          <div className="space-y-2 rounded-md border bg-muted/30 p-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium">Importing…</span>
              <span className="tabular-nums text-muted-foreground">
                {progress.done} / {progress.total} · {progressPct}%
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
              <Button type="button" variant="ghost" size="sm" onClick={resetAll} className="gap-1">
                <ArrowLeft className="size-3.5" />
                Choose another file
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={submitting}>
              <X className="size-3.5" />
              Cancel
            </Button>
            {step === "review" && (
              <Button type="button" onClick={handleSubmit} disabled={readyCount === 0 || submitting} className="gap-1">
                {submitting ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />}
                {submitting
                  ? progress
                    ? `Importing… ${progressPct}%`
                    : "Importing…"
                  : `Import ${readyCount} listing${readyCount === 1 ? "" : "s"}`}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
