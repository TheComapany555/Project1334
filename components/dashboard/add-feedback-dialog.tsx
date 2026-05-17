"use client";

import { useState, useTransition } from "react";
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

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactId?: string | null;
  buyerUserId?: string | null;
  contactName: string | null;
  listingId?: string | null;
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

export function AddFeedbackDialog({
  open,
  onOpenChange,
  contactId,
  buyerUserId,
  contactName,
  listingId,
  onSaved,
}: Props) {
  const [subtype, setSubtype] = useState<FeedbackSubtype>("feedback");
  const [body, setBody] = useState("");
  const [isSaving, startSave] = useTransition();

  function handleOpenChange(next: boolean) {
    if (!next) {
      setBody("");
      setSubtype("feedback");
    }
    onOpenChange(next);
  }

  const handleSave = () => {
    const trimmed = body.trim();
    if (!trimmed) {
      toast.error("Feedback can't be empty");
      return;
    }
    if (!contactId && !buyerUserId) {
      toast.error("Couldn't save — contact missing");
      return;
    }
    startSave(async () => {
      const res = await logFeedback({
        contactId: contactId ?? null,
        buyerUserId: buyerUserId ?? null,
        listingId: listingId ?? null,
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

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <ClipboardList className="size-4" />
            Log feedback from {contactName || "buyer"}
          </DialogTitle>
          <DialogDescription>
            Lands on the buyer&apos;s timeline. AI insights pull from these to
            spot patterns across all your buyers (pricing concerns, common
            objections, etc.).
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
