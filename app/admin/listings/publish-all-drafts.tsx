"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  adminBulkPublishDrafts,
  type BulkPublishSkipReason,
} from "@/lib/actions/admin-listings";
import { Loader2, Upload } from "lucide-react";

const SKIP_REASON_LABELS: Record<BulkPublishSkipReason, string> = {
  payment_required: "Payment required",
  subscription_inactive: "Subscription inactive",
};

type SkippedListing = { id: string; title: string; reason: BulkPublishSkipReason };

export function PublishAllDraftsButton({ draftCount }: { draftCount: number }) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ published: number; skipped: SkippedListing[] } | null>(null);

  function handleOpenChange(open: boolean) {
    if (loading) return;
    setConfirmOpen(open);
    if (!open) setResult(null);
  }

  async function handlePublish() {
    setLoading(true);
    const res = await adminBulkPublishDrafts();
    setLoading(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    router.refresh();
    if (res.skipped.length === 0) {
      toast.success(`Published ${res.published} listing${res.published === 1 ? "" : "s"}.`);
      setConfirmOpen(false);
    } else {
      toast.success(`Published ${res.published}, skipped ${res.skipped.length}.`);
      setResult({ published: res.published, skipped: res.skipped });
    }
  }

  return (
    <>
      <Button size="sm" disabled={draftCount === 0} onClick={() => setConfirmOpen(true)}>
        <Upload className="mr-1.5 h-3.5 w-3.5" />
        Publish all drafts ({draftCount})
      </Button>

      <AlertDialog open={confirmOpen} onOpenChange={handleOpenChange}>
        <AlertDialogContent>
          {result ? (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  Published {result.published}, skipped {result.skipped.length}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  The listings below were not published because billing requirements are unmet.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="max-h-60 overflow-y-auto rounded-md border divide-y">
                {result.skipped.map((s) => (
                  <div key={s.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                    <span className="truncate">{s.title}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {SKIP_REASON_LABELS[s.reason]}
                    </span>
                  </div>
                ))}
              </div>
              <AlertDialogFooter>
                <Button onClick={() => handleOpenChange(false)}>Done</Button>
              </AlertDialogFooter>
            </>
          ) : (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>Publish all draft listings?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will publish all {draftCount} draft listings platform-wide. Listings that
                  require tier payment or belong to an agency without an active subscription will
                  be skipped — billing rules are not bypassed.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
                <Button onClick={handlePublish} disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Publishing…
                    </>
                  ) : (
                    "Publish all"
                  )}
                </Button>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
