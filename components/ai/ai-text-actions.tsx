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

type AITextKind =
  | "broker_bio"
  | "agency_bio"
  | "outreach_listing_share"
  | "outreach_bulk_send"
  | "ad_copy";

type Mode = "rewrite" | "generate";

type Props = {
  /** Identifies which prompt + role check the API will use. */
  kind: AITextKind;
  /** Returns the latest text in the field. Required if `enableImprove`. */
  getCurrentText: () => string;
  /** Returns structured context to ground the AI. Optional but recommended. */
  getContext?: () => Record<string, unknown>;
  /** Called with the accepted result text. */
  onAccept: (text: string) => void;
  /** Hide the Improve button (e.g. for kinds that only make sense to generate). */
  enableImprove?: boolean;
  /** Hide the Generate button (e.g. for kinds where we only want rewrite). */
  enableGenerate?: boolean;
  /** Override default button labels. */
  improveLabel?: string;
  generateLabel?: string;
  /** Compact mode: smaller button, no icon labels. */
  compact?: boolean;
  className?: string;
};

const DIALOG_TITLES: Record<AITextKind, { rewrite: string; generate: string }> = {
  broker_bio: {
    rewrite: "Improve your bio",
    generate: "Generate a broker bio",
  },
  agency_bio: {
    rewrite: "Improve your agency bio",
    generate: "Generate an agency bio",
  },
  outreach_listing_share: {
    rewrite: "Improve your message",
    generate: "Write the outreach message",
  },
  outreach_bulk_send: {
    rewrite: "Improve your note",
    generate: "Write the outreach note",
  },
  ad_copy: {
    rewrite: "Improve ad copy",
    generate: "Write ad copy",
  },
};

export function AITextActions({
  kind,
  getCurrentText,
  getContext,
  onAccept,
  enableImprove = true,
  enableGenerate = true,
  improveLabel = "Improve with AI",
  generateLabel = "Write with AI",
  compact = false,
  className,
}: Props) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("generate");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runAI(nextMode: Mode) {
    setMode(nextMode);
    setOpen(true);
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const payload: Record<string, unknown> = { kind, mode: nextMode };
      if (nextMode === "rewrite") {
        payload.text = getCurrentText();
      }
      if (getContext) {
        payload.context = getContext();
      }

      const res = await fetch("/api/ai/text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }
      setResult((data as { text?: string }).text ?? "");
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
    toast.success("AI content applied.");
  }

  function handleClose() {
    setOpen(false);
    setResult(null);
    setError(null);
  }

  const buttonSize = compact ? "sm" : "sm";

  return (
    <>
      <div className={cn("flex flex-wrap items-center gap-2", className)}>
        {enableImprove && (
          <Button
            type="button"
            variant="outline"
            size={buttonSize}
            onClick={() => runAI("rewrite")}
            className="gap-1.5 cursor-pointer"
          >
            <Wand2 className="h-3.5 w-3.5" />
            {improveLabel}
          </Button>
        )}
        {enableGenerate && (
          <Button
            type="button"
            variant="outline"
            size={buttonSize}
            onClick={() => runAI("generate")}
            className="gap-1.5 cursor-pointer"
          >
            <Sparkles className="h-3.5 w-3.5" />
            {generateLabel}
          </Button>
        )}
      </div>

      <Dialog
        open={open}
        onOpenChange={(v) => (v ? setOpen(true) : handleClose())}
      >
        <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-6 pt-6 pb-4 space-y-1.5">
            <DialogTitle className="flex items-center gap-2 text-base">
              {mode === "rewrite" ? (
                <Wand2 className="h-4 w-4 text-primary" />
              ) : (
                <Sparkles className="h-4 w-4 text-primary" />
              )}
              {DIALOG_TITLES[kind][mode]}
            </DialogTitle>
            <DialogDescription>
              Review the suggested copy below. Your existing content stays in
              place until you click Use this version.
            </DialogDescription>
          </DialogHeader>

          <Separator />

          <div className="flex-1 overflow-y-auto px-6 py-5">
            {loading && <LoadingState mode={mode} />}
            {!loading && error && (
              <ErrorState message={error} onRetry={() => runAI(mode)} />
            )}
            {!loading && !error && result !== null && (
              <ResultPreview text={result} />
            )}
          </div>

          {!loading && !error && result !== null && (
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

function LoadingState({ mode }: { mode: Mode }) {
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
            : "Writing your content..."}
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

function ResultPreview({ text }: { text: string }) {
  return (
    <div className="text-sm leading-relaxed space-y-3 bg-muted/40 rounded-md px-3 py-3 border">
      {text.split(/\n{2,}/).map((para, i) => (
        <p key={i} className="whitespace-pre-wrap">
          {para}
        </p>
      ))}
    </div>
  );
}
