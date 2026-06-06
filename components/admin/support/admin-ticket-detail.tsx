"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Lock, SendHorizontal } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TicketMessages } from "@/components/support/ticket-messages";
import {
  assignTicket,
  replyToTicketAsAdmin,
  updateTicketStatus,
} from "@/lib/actions/support";
import {
  TICKET_STATUS_LABELS,
  TICKET_STATUS_TRANSITIONS,
  type SupportTicketDetail,
  type SupportTicketStatus,
} from "@/lib/types/support";

const UNASSIGNED = "__unassigned__";

export function AdminTicketDetail({
  ticket,
  admins,
}: {
  ticket: SupportTicketDetail;
  admins: { id: string; name: string | null }[];
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [isSending, startSend] = useTransition();
  const [isUpdating, startUpdate] = useTransition();

  const statusOptions = Array.from(
    new Set<SupportTicketStatus>([
      ticket.status,
      ...TICKET_STATUS_TRANSITIONS[ticket.status],
    ]),
  );

  function handleStatusChange(next: SupportTicketStatus) {
    if (next === ticket.status) return;
    startUpdate(async () => {
      const res = await updateTicketStatus(ticket.id, next);
      if (res.ok) {
        toast.success(`Status set to "${TICKET_STATUS_LABELS[next]}"`);
        router.refresh();
      } else {
        toast.error(res.error ?? "Failed to update status");
      }
    });
  }

  function handleAssign(value: string) {
    const adminId = value === UNASSIGNED ? null : value;
    startUpdate(async () => {
      const res = await assignTicket(ticket.id, adminId);
      if (res.ok) {
        toast.success(adminId ? "Ticket assigned" : "Ticket unassigned");
        router.refresh();
      } else {
        toast.error(res.error ?? "Failed to assign ticket");
      }
    });
  }

  function handleSend() {
    const text = body.trim();
    if (!text) {
      toast.error("Message can't be empty.");
      return;
    }
    startSend(async () => {
      const res = await replyToTicketAsAdmin(ticket.id, text, isInternal);
      if (res.ok) {
        setBody("");
        setIsInternal(false);
        toast.success(isInternal ? "Internal note added" : "Reply sent");
        router.refresh();
      } else {
        toast.error(res.error ?? "Failed to send the reply");
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card className="flex flex-col gap-4 p-4 sm:flex-row sm:items-end">
        <div className="grid flex-1 gap-1.5">
          <Label htmlFor="ticket-status">Status</Label>
          <Select
            value={ticket.status}
            onValueChange={(v) => handleStatusChange(v as SupportTicketStatus)}
            disabled={isUpdating}
          >
            <SelectTrigger id="ticket-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((s) => (
                <SelectItem key={s} value={s}>
                  {TICKET_STATUS_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid flex-1 gap-1.5">
          <Label htmlFor="ticket-assign">Assigned to</Label>
          <Select
            value={ticket.assigned_admin_id ?? UNASSIGNED}
            onValueChange={handleAssign}
            disabled={isUpdating}
          >
            <SelectTrigger id="ticket-assign">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
              {admins.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name?.trim() || "Admin"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Thread */}
      <Card className="p-4 sm:p-6">
        <TicketMessages
          messages={ticket.messages}
          viewer="admin"
          brokerName={ticket.broker?.name}
        />
      </Card>

      {/* Composer */}
      <Card className="grid gap-3 p-4">
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={
            isInternal ? "Internal note (not visible to the broker)…" : "Write a reply…"
          }
          rows={4}
          maxLength={5000}
          disabled={isSending}
          className={isInternal ? "border-amber-500/40 bg-amber-500/5" : undefined}
        />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <Checkbox
              checked={isInternal}
              onCheckedChange={(v) => setIsInternal(v === true)}
              disabled={isSending}
            />
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              <Lock className="size-3.5" />
              Internal note (admins only)
            </span>
          </label>
          <Button onClick={handleSend} disabled={isSending} className="gap-1.5">
            {isSending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <SendHorizontal className="size-4" />
            )}
            {isInternal ? "Add note" : "Send reply"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
