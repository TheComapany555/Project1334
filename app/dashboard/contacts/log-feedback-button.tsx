"use client";

import { useState } from "react";
import { ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AddFeedbackDialog } from "@/components/dashboard/add-feedback-dialog";

/**
 * Header button on the CRM page that opens the AddFeedbackDialog with no
 * pre-filled buyer or listing — for jotting down general feedback heard on
 * a call. The broker can still optionally tag a buyer/listing from inside
 * the dialog by closing it and using the buyer panel or listing insights
 * page instead. Feedback logged here feeds the broker-wide AI insights.
 */
export function LogFeedbackButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        size="sm"
        variant="outline"
        className="shrink-0"
        onClick={() => setOpen(true)}
      >
        <ClipboardList className="h-4 w-4" />
        Log feedback
      </Button>
      <AddFeedbackDialog
        open={open}
        onOpenChange={setOpen}
        contactId={null}
        buyerUserId={null}
        contactName={null}
        listingId={null}
      />
    </>
  );
}
