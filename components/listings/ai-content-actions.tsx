"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Sparkles, Wand2, RefreshCw, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export type AIContext = {
  title?: string | null;
  categoryId?: string | null;
  askingPrice?: number | null;
  priceType?: "fixed" | "poa" | null;
  suburb?: string | null;
  state?: string | null;
  postcode?: string | null;
  highlightIds?: string[];
};

export type AIResult = {
  summary: string;
  description: string;
};

type Mode = "rewrite" | "generate";

type Props = {
  /** Resolved when called, gives the latest description text in the editor (plain text). */
  getCurrentDescription: () => string;
  /** Resolved when called, gives the latest summary text. */
  getCurrentSummary: () => string;
  /** Returns the latest structured listing context from the form. */
  getContext: () => AIContext;
  /** Called when the user accepts the AI output. Receives the plain-text result. */
  onAccept: (result: AIResult) => void;
  /** Optional: hide the rewrite button (e.g. on a totally empty form). */
  className?: string;
};

export function AIContentActions({
  getCurrentDescription,
  getCurrentSummary,
  getContext,
  onAccept,
  className,
}: Props) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("generate");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AIResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runAI(nextMode: Mode) {
    setMode(nextMode);
    setOpen(true);
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const ctx = getContext();
      const path =
        nextMode === "rewrite"
          ? "/api/ai/listings/rewrite"
          : "/api/ai/listings/generate";

      const payload =
        nextMode === "rewrite"
          ? {
              description: getCurrentDescription(),
              summary: getCurrentSummary(),
              context: ctx,
            }
          : { context: ctx };

      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }
      setResult(data as AIResult);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleAccept() {
    if (!result) return;
    onAccept(result);
    setOpen(false);
    toast.success("AI content applied to your listing.");
  }

  function handleClose() {
    setOpen(false);
    setResult(null);
    setError(null);
  }

  return (
    <>
      <div className={cn("flex flex-wrap items-center gap-2", className)}>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => runAI("rewrite")}
          className="gap-1.5 cursor-pointer"
        >
          <Wand2 className="h-3.5 w-3.5" />
          Improve with AI
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => runAI("generate")}
          className="gap-1.5 cursor-pointer"
        >
          <Sparkles className="h-3.5 w-3.5" />
          Generate with AI
        </Button>
      </div>

      <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : handleClose())}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-6 pt-6 pb-4 space-y-1.5">
            <DialogTitle className="flex items-center gap-2 text-base">
              {mode === "rewrite" ? (
                <Wand2 className="h-4 w-4 text-primary" />
              ) : (
                <Sparkles className="h-4 w-4 text-primary" />
              )}
              {mode === "rewrite"
                ? "Improve your description"
                : "Generate listing content"}
            </DialogTitle>
            <DialogDescription>
              {mode === "rewrite"
                ? "Review the rewritten copy below. Your existing content stays in the editor until you click Use this version."
                : "Review the generated copy below. Your existing content stays in the editor until you click Use this version."}
            </DialogDescription>
          </DialogHeader>

          <Separator />

          <div className="flex-1 overflow-y-auto px-6 py-5">
            {loading && <LoadingSkeleton mode={mode} />}
            {!loading && error && (
              <ErrorState message={error} onRetry={() => runAI(mode)} />
            )}
            {!loading && !error && result && <ResultPreview result={result} />}
          </div>

          {!loading && !error && result && (
            <>
              <Separator />
              <DialogFooter className="px-6 py-4 gap-2 sm:gap-2 sm:justify-between flex-row">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleClose}
                  className="gap-1.5 cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                  Discard
                </Button>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => runAI(mode)}
                    className="gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Try again
                  </Button>
                  <Button
                    type="button"
                    onClick={handleAccept}
                    className="gap-1.5 cursor-pointer"
                  >
                    <Check className="h-4 w-4" />
                    Use this version
                  </Button>
                </div>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function LoadingSkeleton({ mode }: { mode: Mode }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
      <div className="relative h-12 w-12">
        <div className="absolute inset-0 rounded-full bg-primary/10" />
        <Loader2 className="absolute inset-0 m-auto h-6 w-6 text-primary animate-spin" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium">
          {mode === "rewrite"
            ? "Improving your content..."
            : "Generating listing content..."}
        </p>
        <p className="text-xs text-muted-foreground">
          This usually takes a few seconds.
        </p>
      </div>
    </div>
  );
}

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-8 gap-4 text-center">
      <div className="h-11 w-11 rounded-full bg-destructive/10 flex items-center justify-center">
        <X className="h-5 w-5 text-destructive" />
      </div>
      <div className="space-y-1 max-w-sm">
        <p className="text-sm font-medium">Couldn&apos;t generate content</p>
        <p className="text-xs text-muted-foreground">{message}</p>
      </div>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={onRetry}
        className="gap-1.5 cursor-pointer"
      >
        <RefreshCw className="h-3.5 w-3.5" />
        Try again
      </Button>
    </div>
  );
}

function ResultPreview({ result }: { result: AIResult }) {
  return (
    <div className="space-y-5">
      <section className="space-y-1.5">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Summary
        </h3>
        <p className="text-sm leading-relaxed bg-muted/40 rounded-md px-3 py-2.5 border">
          {result.summary || (
            <span className="text-muted-foreground italic">
              No summary generated.
            </span>
          )}
        </p>
      </section>

      <section className="space-y-1.5">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Description
        </h3>
        <div className="text-sm leading-relaxed space-y-3 bg-muted/40 rounded-md px-3 py-3 border">
          {result.description.split(/\n{2,}/).map((para, i) => (
            <p key={i} className="whitespace-pre-wrap">
              {para}
            </p>
          ))}
        </div>
      </section>
    </div>
  );
}
