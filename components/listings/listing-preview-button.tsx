"use client";

import { useEffect, useState } from "react";
import { Eye } from "lucide-react";
import {
  getListingPreviewContext,
  type ListingPreviewContext,
} from "@/lib/actions/listings";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ListingDetailView,
  EnquiryPreviewPlaceholder,
  type ListingDetailData,
} from "@/components/listings/listing-detail-view";
import { cn } from "@/lib/utils";

export type ListingPreviewInput = Omit<ListingDetailData, "broker" | "agency">;

type Props = {
  /** Read at click time, so the preview always reflects the current (unsaved) form. */
  getData: () => ListingPreviewInput;
  /** Existing listing: the preview uses its assignee. Omit for a new listing. */
  listingId?: string;
  isPrivate?: boolean;
  variant?: React.ComponentProps<typeof Button>["variant"];
  size?: React.ComponentProps<typeof Button>["size"];
  className?: string;
  disabled?: boolean;
};

/**
 * "Preview" for the listing create/edit forms: opens a full-screen view of the
 * listing exactly as buyers will see it, built from the form's unsaved values.
 */
export function ListingPreviewButton({
  getData,
  listingId,
  isPrivate = false,
  variant = "outline",
  size,
  className,
  disabled,
}: Props) {
  const [open, setOpen] = useState(false);
  const [snapshot, setSnapshot] = useState<ListingPreviewInput | null>(null);
  const [context, setContext] = useState<ListingPreviewContext | null>(null);

  // Broker/agency details for the contact card. Fetched once up front so the
  // preview opens complete, without the card popping in afterwards.
  useEffect(() => {
    let cancelled = false;
    getListingPreviewContext(listingId)
      .then((ctx) => !cancelled && setContext(ctx))
      .catch(() => !cancelled && setContext({ broker: null, agency: null }));
    return () => {
      cancelled = true;
    };
  }, [listingId]);

  function openPreview() {
    setSnapshot(getData());
    setOpen(true);
  }

  const data: ListingDetailData | null = snapshot && {
    ...snapshot,
    title: snapshot.title.trim() || "Untitled listing",
    broker: context?.broker ?? null,
    agency: context?.agency ?? null,
  };

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        className={cn("gap-2", className)}
        onClick={openPreview}
        disabled={disabled}
      >
        <Eye className="size-4" aria-hidden />
        Preview
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          showCloseButton={false}
          className="top-0 left-0 flex h-dvh w-screen max-w-none translate-x-0 translate-y-0 flex-col gap-0 rounded-none p-0 ring-0 sm:max-w-none motion-reduce:animate-none"
        >
          <header className="z-10 shrink-0 border-b border-border bg-background/95 supports-backdrop-filter:bg-background/80 supports-backdrop-filter:backdrop-blur">
            <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-4 py-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Eye className="size-4" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <DialogTitle className="text-base font-semibold">
                  Listing preview
                </DialogTitle>
                <DialogDescription className="sm:truncate">
                  {isPrivate
                    ? "Private listing. Only you and your agency can see it."
                    : "How buyers will see it. Not published yet."}
                </DialogDescription>
              </div>
              <Button
                type="button"
                className="shrink-0"
                onClick={() => setOpen(false)}
              >
                Back to editing
              </Button>
            </div>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-background">
            {data && (
              <div className="mx-auto w-full min-w-0 max-w-6xl space-y-6 overflow-x-clip px-4 py-8 sm:py-10">
                <ListingDetailView
                  data={data}
                  mode="preview"
                  enquiry={<EnquiryPreviewPlaceholder />}
                />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
