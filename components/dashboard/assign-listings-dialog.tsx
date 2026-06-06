"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Loader2, UserCheck, Users } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { assignListings } from "@/lib/actions/listings";
import type { AgencyBroker } from "@/lib/types/agencies";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Listings to (re)assign. */
  listingIds: string[];
  /** Brokers in the agency the owner can assign to. */
  brokers: AgencyBroker[];
  /** Called after a successful assignment (clear selection + refresh). */
  onAssigned: () => void;
};

function brokerLabel(b: AgencyBroker): string {
  return b.name?.trim() || b.email || "Unnamed broker";
}

export function AssignListingsDialog({
  open,
  onOpenChange,
  listingIds,
  brokers,
  onAssigned,
}: Props) {
  const [brokerId, setBrokerId] = useState<string>("");
  const [isAssigning, startAssign] = useTransition();

  const count = listingIds.length;
  const noBrokers = brokers.length === 0;

  // Reset the picker on close so the next open starts fresh (no effect needed).
  function handleOpenChange(next: boolean) {
    if (!next) setBrokerId("");
    onOpenChange(next);
  }

  function handleAssign() {
    if (!brokerId) {
      toast.error("Choose a broker to assign to.");
      return;
    }
    if (count === 0) {
      toast.error("Select at least one listing.");
      return;
    }
    startAssign(async () => {
      const res = await assignListings(listingIds, brokerId);
      if (res.ok) {
        const broker = brokers.find((b) => b.id === brokerId);
        toast.success(
          res.assigned === 1
            ? `Listing assigned to ${broker ? brokerLabel(broker) : "broker"}`
            : `${res.assigned} listings assigned to ${broker ? brokerLabel(broker) : "broker"}`,
        );
        handleOpenChange(false);
        onAssigned();
      } else {
        toast.error(res.error ?? "Failed to assign listings");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Assign {count} {count === 1 ? "listing" : "listings"} to a broker
          </DialogTitle>
          <DialogDescription>
            The broker becomes the owner of {count === 1 ? "this listing" : "these listings"} —
            enquiries, editing, and the public contact all move to them.
          </DialogDescription>
        </DialogHeader>

        {noBrokers ? (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed bg-muted/40 px-4 py-8 text-center">
            <div className="flex size-10 items-center justify-center rounded-full bg-muted">
              <Users className="size-5 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              You don&apos;t have any brokers in your agency yet.
            </p>
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/workspace?tab=team">Add a broker</Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-1.5">
            <Label htmlFor="assign-broker">Broker</Label>
            <Select value={brokerId} onValueChange={setBrokerId}>
              <SelectTrigger id="assign-broker" className="w-full">
                <SelectValue placeholder="Choose a broker…" />
              </SelectTrigger>
              <SelectContent>
                {brokers.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {brokerLabel(b)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isAssigning}
          >
            Cancel
          </Button>
          <Button
            onClick={handleAssign}
            disabled={isAssigning || noBrokers || !brokerId}
          >
            {isAssigning ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <UserCheck className="mr-2 size-4" />
            )}
            Assign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
