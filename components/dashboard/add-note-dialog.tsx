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
import { Loader2, StickyNote } from "lucide-react";
import { addNote } from "@/lib/actions/crm";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactId?: string | null;
  buyerUserId?: string | null;
  contactName: string | null;
  listingId?: string | null;
  onSaved?: () => void;
};

export function AddNoteDialog({
  open,
  onOpenChange,
  contactId,
  buyerUserId,
  contactName,
  listingId,
  onSaved,
}: Props) {
  const [body, setBody] = useState("");
  const [isSaving, startSave] = useTransition();

  useEffect(() => {
    if (!open) setBody("");
  }, [open]);

  const handleSave = () => {
    const trimmed = body.trim();
    if (!trimmed) {
      toast.error("Note can't be empty");
      return;
    }
    if (!contactId && !buyerUserId) {
      toast.error("Couldn't save — contact missing");
      return;
    }
    startSave(async () => {
      const res = await addNote({
        contactId: contactId ?? null,
        buyerUserId: buyerUserId ?? null,
        listingId: listingId ?? null,
        body: trimmed,
      });
      if (res.ok) {
        toast.success("Note added");
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
            <StickyNote className="h-4 w-4" />
            Add note about {contactName || "buyer"}
          </DialogTitle>
          <DialogDescription>
            Internal — only your team sees these. Lands on the buyer’s timeline.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5 py-2">
          <Label htmlFor="note-body">Note</Label>
          <Textarea
            id="note-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="What did you observe? Anything to remember next time?"
            rows={5}
            autoFocus
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
            Save note
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
