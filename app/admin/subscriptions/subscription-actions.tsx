"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  adminCancelSubscription,
  adminExtendSubscription,
  adminReactivateSubscription,
} from "@/lib/actions/subscriptions";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { MoreHorizontal, RefreshCw, CalendarPlus, XCircle, Ban } from "lucide-react";

type Props = {
  subscriptionId: string;
  status: string;
  hasStripe: boolean;
};

export function SubscriptionActions({ subscriptionId, status, hasStripe }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [confirmAction, setConfirmAction] = useState<
    "cancel" | "cancel_immediately" | "extend" | "reactivate" | null
  >(null);

  async function handleAction() {
    setLoading(true);
    let result: { ok: boolean; error?: string };

    switch (confirmAction) {
      case "cancel":
        result = await adminCancelSubscription(subscriptionId, false);
        break;
      case "cancel_immediately":
        result = await adminCancelSubscription(subscriptionId, true);
        break;
      case "extend":
        result = await adminExtendSubscription(subscriptionId, 30);
        break;
      case "reactivate":
        result = await adminReactivateSubscription(subscriptionId);
        break;
      default:
        result = { ok: false, error: "Unknown action" };
    }

    setLoading(false);
    setConfirmAction(null);

    if (result.ok) {
      toast.success("Subscription updated.");
      router.refresh();
    } else {
      toast.error(result.error ?? "Failed to update subscription.");
    }
  }

  const isActive = ["active", "trialing", "past_due"].includes(status);
  const isCancelled = ["cancelled", "expired"].includes(status);

  const confirmMessages: Record<string, { title: string; description: string }> = {
    cancel: {
      title: "Cancel at period end?",
      description: "The subscription will remain active until the current billing period ends, then expire.",
    },
    cancel_immediately: {
      title: "Cancel immediately?",
      description: "The subscription will be cancelled right now and the agency will lose access immediately. This cannot be undone.",
    },
    extend: {
      title: "Extend by 30 days?",
      description: "This will add 30 days to the subscription's current period end date and set the status to active.",
    },
    reactivate: {
      title: "Reactivate subscription?",
      description: "This will reactivate the subscription with a new 30-day period starting now.",
    },
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-7 w-7">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {isActive && (
            <>
              <DropdownMenuItem onSelect={() => setConfirmAction("extend")}>
                <CalendarPlus className="h-4 w-4" />
                Extend 30 days
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setConfirmAction("cancel")}>
                <XCircle className="h-4 w-4" />
                Cancel at period end
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                onSelect={() => setConfirmAction("cancel_immediately")}
              >
                <Ban className="h-4 w-4" />
                Cancel immediately
              </DropdownMenuItem>
            </>
          )}
          {isCancelled && (
            <DropdownMenuItem onSelect={() => setConfirmAction("reactivate")}>
              <RefreshCw className="h-4 w-4" />
              Reactivate
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {confirmAction && (
        <AlertDialog open onOpenChange={(open) => !open && setConfirmAction(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {confirmMessages[confirmAction]?.title}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {confirmMessages[confirmAction]?.description}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleAction} disabled={loading}>
                {loading ? "Processing…" : "Confirm"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}
