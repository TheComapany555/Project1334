"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createTicket } from "@/lib/actions/support";
import {
  TICKET_CATEGORY_LABELS,
  TICKET_PRIORITY_LABELS,
  type SupportTicketCategory,
  type SupportTicketPriority,
} from "@/lib/types/support";

const CATEGORIES = Object.entries(TICKET_CATEGORY_LABELS) as [
  SupportTicketCategory,
  string,
][];
const PRIORITIES = Object.entries(TICKET_PRIORITY_LABELS) as [
  SupportTicketPriority,
  string,
][];

export function NewTicketDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState<SupportTicketCategory>("general");
  const [priority, setPriority] = useState<SupportTicketPriority>("normal");
  const [description, setDescription] = useState("");
  const [isSubmitting, startSubmit] = useTransition();

  function reset() {
    setSubject("");
    setCategory("general");
    setPriority("normal");
    setDescription("");
  }

  function handleOpenChange(next: boolean) {
    if (!next && !isSubmitting) reset();
    setOpen(next);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!subject.trim()) {
      toast.error("Please enter a subject.");
      return;
    }
    if (!description.trim()) {
      toast.error("Please describe your issue.");
      return;
    }
    startSubmit(async () => {
      const res = await createTicket({
        subject: subject.trim(),
        category,
        priority,
        description: description.trim(),
      });
      if (res.ok) {
        toast.success(`Ticket #${res.ticketNo} created`);
        setOpen(false);
        reset();
        router.push(`/dashboard/support/${res.id}`);
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="gap-1.5">
          <Plus className="size-4" />
          New ticket
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New support ticket</DialogTitle>
          <DialogDescription>
            Tell us what you need help with and our team will get back to you.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="ticket-subject">Subject *</Label>
            <Input
              id="ticket-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Short summary of your issue"
              maxLength={200}
              disabled={isSubmitting}
              autoFocus
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="ticket-category">Category</Label>
              <Select
                value={category}
                onValueChange={(v) => setCategory(v as SupportTicketCategory)}
              >
                <SelectTrigger id="ticket-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="ticket-priority">Priority</Label>
              <Select
                value={priority}
                onValueChange={(v) => setPriority(v as SupportTicketPriority)}
              >
                <SelectTrigger id="ticket-priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="ticket-description">Description *</Label>
            <Textarea
              id="ticket-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the issue in as much detail as you can…"
              rows={6}
              maxLength={5000}
              disabled={isSubmitting}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                isSubmitting || !subject.trim() || !description.trim()
              }
            >
              {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
              Submit ticket
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
