"use client";

import { useEffect, useState, useTransition } from "react";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ClipboardList, Loader2 } from "lucide-react";
import { logFeedback, type FeedbackSubtype } from "@/lib/actions/crm";
import { getListingsByBroker } from "@/lib/actions/listings";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactId?: string | null;
  buyerUserId?: string | null;
  contactName: string | null;
  /** Pre-selected listing — defaults to "no listing" when null. */
  listingId?: string | null;
  /**
   * When `lockListing` is true the dialog hides the listing picker and uses
   * `listingId` as-is. Use this from listing-scoped callers (the listing
   * insights page, the per-listing dropdown menu) so the broker can't
   * accidentally re-tag feedback onto a different listing.
   *
   * `listingTitle` is shown as a read-only label when locked.
   */
  lockListing?: boolean;
  listingTitle?: string | null;
  onSaved?: () => void;
};

const SUBTYPE_LABELS: Record<FeedbackSubtype, string> = {
  feedback: "General feedback",
  objection: "Objection",
  concern: "Concern",
  lost_interest: "Why they lost interest",
  common_question: "Common question / theme",
};

const PLACEHOLDERS: Record<FeedbackSubtype, string> = {
  feedback: "e.g. Buyer thinks asking price is high but is keen overall.",
  objection: "e.g. Doesn't want to take on the existing lease.",
  concern: "e.g. Worried about staff retention post-acquisition.",
  lost_interest: "e.g. Decided revenue trend isn't strong enough.",
  common_question: "e.g. Asking about owner involvement post-sale.",
};

const NO_LISTING_VALUE = "__none__";

type ListingOption = { id: string; title: string };

export function AddFeedbackDialog({
  open,
  onOpenChange,
  contactId,
  buyerUserId,
  contactName,
  listingId,
  lockListing,
  listingTitle,
  onSaved,
}: Props) {
  const [subtype, setSubtype] = useState<FeedbackSubtype>("feedback");
  const [body, setBody] = useState("");
  const [selectedListingId, setSelectedListingId] = useState<string | null>(
    listingId ?? null,
  );
  const [listings, setListings] = useState<ListingOption[] | null>(null);
  const [isSaving, startSave] = useTransition();
  // Loading is derived: while the dialog is open in non-locked mode and we
  // haven't received a list back yet, we're loading. Avoids an extra
  // useState that the react-hooks/set-state-in-effect rule complains about.
  const listingsLoading = open && !lockListing && listings === null;

  // Keep the local selection in sync with the prop if the caller swaps it
  // (e.g. opening the dialog for a different listing from a parent table).
  // Resetting local state on a prop change is the intended behaviour here.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedListingId(listingId ?? null);
  }, [listingId]);

  // Fetch the broker's listings the first time the dialog opens (when it's
  // not locked to a single listing). One-shot — listings don't change while
  // the dialog is on screen.
  useEffect(() => {
    if (!open) return;
    if (lockListing) return;
    if (listings !== null) return;
    let cancelled = false;
    getListingsByBroker()
      .then((rows) => {
        if (cancelled) return;
        setListings(rows.map((r) => ({ id: r.id, title: r.title })));
      })
      .catch(() => {
        if (!cancelled) setListings([]);
      });
    return () => {
      cancelled = true;
    };
  }, [open, lockListing, listings]);

  function handleOpenChange(next: boolean) {
    if (!next) {
      setBody("");
      setSubtype("feedback");
      // Re-anchor the selection to the prop when re-opened later.
      setSelectedListingId(listingId ?? null);
    }
    onOpenChange(next);
  }

  const handleSave = () => {
    const trimmed = body.trim();
    if (!trimmed) {
      toast.error("Feedback can't be empty");
      return;
    }
    // Feedback can be tagged to a buyer, a listing, both, or neither. AI
    // insights consume all three flavours (per-buyer, per-listing, and
    // broker-wide), so we don't gate on any specific link being present.
    const resolvedListingId = lockListing
      ? listingId ?? null
      : selectedListingId;
    startSave(async () => {
      const res = await logFeedback({
        contactId: contactId ?? null,
        buyerUserId: buyerUserId ?? null,
        listingId: resolvedListingId,
        subtype,
        body: trimmed,
      });
      if (res.ok) {
        toast.success("Feedback logged");
        handleOpenChange(false);
        onSaved?.();
      } else {
        toast.error(res.error);
      }
    });
  };

  // Display label when locked: prefer explicit listingTitle, otherwise fall
  // back to the contactName (some legacy callers passed it there).
  const lockedListingLabel =
    lockListing && listingId
      ? listingTitle ?? contactName ?? "this listing"
      : null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <ClipboardList className="size-4" />
            {contactName && !lockListing
              ? `Log feedback from ${contactName}`
              : lockedListingLabel
                ? `Log feedback for ${lockedListingLabel}`
                : "Log buyer feedback"}
          </DialogTitle>
          <DialogDescription>
            {contactName && !lockListing
              ? "Lands on the buyer's timeline. Pick a listing if this feedback is about a specific business, so it feeds that listing's AI insights too."
              : lockListing
                ? "Lands on this listing's AI insights. Optionally attach a buyer if this came from a specific person."
                : "Tag a listing if this feedback is about a specific business. Leave it blank for general feedback overheard on a call."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="feedback-type">Type</Label>
            <Select
              value={subtype}
              onValueChange={(v) => setSubtype(v as FeedbackSubtype)}
            >
              <SelectTrigger id="feedback-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(SUBTYPE_LABELS) as FeedbackSubtype[]).map((k) => (
                  <SelectItem key={k} value={k}>
                    {SUBTYPE_LABELS[k]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="feedback-listing">Listing (optional)</Label>
            {lockListing ? (
              <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
                {lockedListingLabel ?? "No specific listing"}
              </div>
            ) : listingsLoading ? (
              <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground inline-flex items-center gap-2">
                <Loader2 className="size-3.5 animate-spin" />
                Loading your listings…
              </div>
            ) : (
              <Select
                value={selectedListingId ?? NO_LISTING_VALUE}
                onValueChange={(v) =>
                  setSelectedListingId(v === NO_LISTING_VALUE ? null : v)
                }
              >
                <SelectTrigger id="feedback-listing">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_LISTING_VALUE}>
                    No specific listing
                  </SelectItem>
                  {(listings ?? []).map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {!lockListing && (
              <p className="text-[11px] text-muted-foreground">
                Picking a listing makes this feedback feed that listing&apos;s
                AI insights and seller update.
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="feedback-body">Details</Label>
            <Textarea
              id="feedback-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={PLACEHOLDERS[subtype]}
              rows={5}
              autoFocus
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-1.5 size-4 animate-spin" />}
            Save feedback
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
