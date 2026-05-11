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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { Loader2, PhoneCall } from "lucide-react";
import { logCall, type CallOutcome } from "@/lib/actions/crm";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactId?: string | null;
  buyerUserId?: string | null;
  contactName: string | null;
  contactPhone?: string | null;
  listingId?: string | null;
  onLogged?: () => void;
};

const OUTCOMES: { value: CallOutcome; label: string }[] = [
  { value: "connected", label: "Connected" },
  { value: "no_answer", label: "No answer" },
  { value: "voicemail", label: "Left voicemail" },
  { value: "wrong_number", label: "Wrong number" },
  { value: "callback_requested", label: "Callback requested" },
];

export function CallLogDialog({
  open,
  onOpenChange,
  contactId,
  buyerUserId,
  contactName,
  contactPhone,
  listingId,
  onLogged,
}: Props) {
  const [outcome, setOutcome] = useState<CallOutcome>("connected");
  const [notes, setNotes] = useState("");
  const [followUp, setFollowUp] = useState<Date | undefined>(undefined);
  const [followUpTitle, setFollowUpTitle] = useState("");
  const [isSaving, startSave] = useTransition();

  useEffect(() => {
    if (open) return;
    setOutcome("connected");
    setNotes("");
    setFollowUp(undefined);
    setFollowUpTitle("");
  }, [open]);

  const handleSave = () => {
    if (!contactId && !buyerUserId) {
      toast.error("Couldn't log — contact missing");
      return;
    }
    startSave(async () => {
      const res = await logCall({
        contactId: contactId ?? null,
        buyerUserId: buyerUserId ?? null,
        listingId: listingId ?? null,
        outcome,
        notes: notes.trim() || null,
        followUp: followUp
          ? {
              dueAt: followUp.toISOString(),
              title: followUpTitle.trim() || "Follow up after call",
            }
          : null,
      });
      if (res.ok) {
        toast.success("Call logged");
        onOpenChange(false);
        onLogged?.();
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
            <PhoneCall className="h-4 w-4" />
            Log call with {contactName || "buyer"}
          </DialogTitle>
          <DialogDescription>
            Quick capture so the next person picking up the deal sees what
            happened on this call.
          </DialogDescription>
        </DialogHeader>

        {contactPhone && (
          <p className="text-xs text-muted-foreground">
            Number:{" "}
            <a
              href={`tel:${contactPhone.replace(/\s+/g, "").replace(/[^\d+]/g, "")}`}
              className="text-primary hover:underline font-mono"
            >
              {contactPhone}
            </a>
          </p>
        )}

        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="call-outcome">Outcome</Label>
            <Select
              value={outcome}
              onValueChange={(v) => setOutcome(v as CallOutcome)}
            >
              <SelectTrigger id="call-outcome">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {OUTCOMES.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="call-notes">Notes</Label>
            <Textarea
              id="call-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What was discussed? Any commitments?"
              rows={4}
            />
          </div>

          <div className="rounded-md border bg-muted/30 p-3 space-y-2">
            <Label className="text-xs">Schedule a follow-up (optional)</Label>
            <DatePicker
              value={followUp}
              onChange={setFollowUp}
              placeholder="No follow-up"
              clearable
            />
            {followUp && (
              <Input
                value={followUpTitle}
                onChange={(e) => setFollowUpTitle(e.target.value)}
                placeholder="Follow-up title (e.g. Send Q3 P&L)"
                className="text-sm"
              />
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
            Save call
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
