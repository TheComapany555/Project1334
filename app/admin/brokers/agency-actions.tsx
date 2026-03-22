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
import { setAgencyStatus } from "@/lib/actions/admin-brokers";
import { Loader2, DollarSign } from "lucide-react";
import Link from "next/link";

type Props = { agencyId: string; status: string };

export function AgencyActions({ agencyId, status }: Props) {
  const router = useRouter();
  const isActive = status === "active";
  const isPending = status === "pending";
  const [confirmDisable, setConfirmDisable] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSetStatus(newStatus: "active" | "disabled") {
    setLoading(true);
    const result = await setAgencyStatus(agencyId, newStatus);
    setLoading(false);
    if (result.ok) {
      toast.success(
        newStatus === "active"
          ? isPending
            ? "Agency approved. Their brokers can sign in now."
            : "Agency enabled."
          : "Agency disabled. All brokers in this agency are blocked."
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
          <DropdownMenuItem asChild>
            <Link href={`/admin/agencies/${agencyId}/pricing`} className="flex items-center gap-2">
              <DollarSign className="h-3.5 w-3.5" />
              Custom pricing
            </Link>
          </DropdownMenuItem>
          {isPending && (
            <DropdownMenuItem onClick={() => handleSetStatus("active")}>
              Approve agency
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
              Disable agency
            </DropdownMenuItem>
          ) : !isPending ? (
            <DropdownMenuItem onClick={() => handleSetStatus("active")}>
              Enable agency
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirmDisable} onOpenChange={setConfirmDisable}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disable agency?</AlertDialogTitle>
            <AlertDialogDescription>
              All brokers in this agency will be blocked from signing in or
              managing listings. You can re-enable the agency later.
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
                "Disable agency"
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
