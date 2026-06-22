"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { setBrokerStatus } from "@/lib/actions/admin-brokers";
import { useResendSetPasswordLink } from "@/components/admin/use-resend-set-password-link";
import { Loader2, KeyRound } from "lucide-react";

type Props = { brokerId: string; status: string };

export function BrokerActions({ brokerId, status }: Props) {
  const router = useRouter();
  const isActive = status === "active";
  const isPending = status === "pending";
  const [confirmDisable, setConfirmDisable] = useState(false);
  const [loading, setLoading] = useState(false);
  const {
    resend: resendSetPassword,
    pending: resending,
    dialog: resendDialog,
  } = useResendSetPasswordLink();

  async function handleSetStatus(newStatus: "active" | "disabled") {
    setLoading(true);
    const result = await setBrokerStatus(brokerId, newStatus);
    setLoading(false);
    if (result.ok) {
      toast.success(
        newStatus === "active"
          ? isPending
            ? "Broker approved. They can sign in now."
            : "Broker enabled."
          : "Broker disabled."
      );
      setConfirmDisable(false);
      router.refresh();
    } else {
      toast.error(result.error ?? "Failed to update.");
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            Actions
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={() => resendSetPassword(brokerId)}
            disabled={resending}
            className="flex items-center gap-2"
          >
            {resending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <KeyRound className="h-3.5 w-3.5" />
            )}
            Resend set-password link
          </DropdownMenuItem>
          {isPending && (
            <DropdownMenuItem onClick={() => handleSetStatus("active")}>
              Approve broker
            </DropdownMenuItem>
          )}
          {isActive ? (
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault();
                setConfirmDisable(true);
              }}
              className="text-destructive focus:text-destructive"
            >
              Disable broker
            </DropdownMenuItem>
          ) : !isPending ? (
            <DropdownMenuItem onClick={() => handleSetStatus("active")}>
              Enable broker
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirmDisable} onOpenChange={setConfirmDisable}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disable broker?</AlertDialogTitle>
            <AlertDialogDescription>
              This broker will no longer be able to sign in or manage their
              listings. You can re-enable them later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={() => handleSetStatus("disabled")}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Disabling…
                </>
              ) : (
                "Disable broker"
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {resendDialog}
    </>
  );
}
