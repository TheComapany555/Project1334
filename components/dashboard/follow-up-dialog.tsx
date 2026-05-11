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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import { Loader2, CalendarClock } from "lucide-react";
import { setFollowUp } from "@/lib/actions/crm";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactId?: string | null;
  buyerUserId?: string | null;
  contactName: string | null;
  listingId?: string | null;
  /** Pre-fill the due date (e.g. when called from "Schedule for tomorrow"). */
  defaultDueAt?: Date;
  onSaved?: () => void;
};

export function FollowUpDialog({
  open,
  onOpenChange,
  contactId,
  buyerUserId,
  contactName,
  listingId,
  defaultDueAt,
  onSaved,
}: Props) {
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [dueAt, setDueAt] = useState<Date | undefined>(defaultDueAt);
  const [isSaving, startSave] = useTransition();

  useEffect(() => {
    if (open) return;
    setTitle("");
    setNotes("");
    setDueAt(defaultDueAt);
  }, [open, defaultDueAt]);

  const handleSave = () => {
    if (!title.trim()) {
      toast.error("Give the follow-up a title");
      return;
    }
    if (!dueAt) {
      toast.error("Pick a due date");
      return;
    }
    if (!contactId && !buyerUserId) {
      toast.error("Couldn't save — contact missing");
      return;
    }
    startSave(async () => {
      const res = await setFollowUp({
        contactId: contactId ?? null,
        buyerUserId: buyerUserId ?? null,
        listingId: listingId ?? null,
        dueAt: dueAt.toISOString(),
        title: title.trim(),
        notes: notes.trim() || null,
      });
      if (res.ok) {
        toast.success("Follow-up scheduled");
        onOpenChange(false);
        onSaved?.();
      } else {
        toast.error(res.error);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <CalendarClock className="h-4 w-4" />
            Follow up with {contactName || "buyer"}
          </DialogTitle>
          <DialogDescription>
            You'll get a notification when it's due. Mark complete from the CRM.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="fu-title">Title *</Label>
            <Input
              id="fu-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Send Q3 P&L"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label>Due *</Label>
            <DatePicker value={dueAt} onChange={setDueAt} placeholder="Pick a date" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="fu-notes">Notes</Label>
            <Textarea
              id="fu-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional context"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
            Schedule
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
