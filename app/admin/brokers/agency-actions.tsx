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
import { useSession } from "next-auth/react";
import {
  deleteAgencyByAdmin,
  setAgencyStatus,
  setAgencySubscriptionExempt,
} from "@/lib/actions/admin-brokers";
import { startImpersonation } from "@/lib/actions/impersonation";
import { useResendSetPasswordLink } from "@/components/admin/use-resend-set-password-link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Loader2,
  DollarSign,
  UserCog,
  ShieldCheck,
  ShieldOff,
  KeyRound,
} from "lucide-react";
import Link from "next/link";

type Props = {
  agencyId: string;
  agencyName: string;
  status: string;
  subscriptionExempt: boolean;
  ownerId?: string | null;
  ownerName?: string | null;
};

export function AgencyActions({
  agencyId,
  agencyName,
  status,
  subscriptionExempt,
  ownerId,
  ownerName,
}: Props) {
  const router = useRouter();
  const { update } = useSession();
  const isActive = status === "active";
  const isPending = status === "pending";
  const [confirmDisable, setConfirmDisable] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [managing, setManaging] = useState(false);
  const [togglingExempt, setTogglingExempt] = useState(false);
  const {
    resend: resendSetPassword,
    pending: resending,
    dialog: resendDialog,
  } = useResendSetPasswordLink();
  const deleteNameMatches =
    deleteConfirmName.trim().toLowerCase() === agencyName.trim().toLowerCase();

  async function handleManageAsOwner() {
    if (!ownerId) return;
    setManaging(true);
    try {
      const result = await startImpersonation(ownerId);
      if (!result.ok) {
        toast.error(result.error ?? "Could not start managing this owner.");
        return;
      }
      await update({ impersonate: ownerId });
      toast.success(
        `You are now managing ${result.brokerName ?? ownerName ?? "the agency owner"}.`,
      );
      router.push("/dashboard");
      router.refresh();
    } catch {
      toast.error("Could not start managing this owner.");
    } finally {
      setManaging(false);
    }
  }

  async function handleDelete() {
    if (!deleteNameMatches) return;
    setDeleting(true);
    const result = await deleteAgencyByAdmin(agencyId);
    setDeleting(false);
    if (result.ok) {
      toast.success("Agency deleted permanently.");
      setConfirmDelete(false);
      setDeleteConfirmName("");
      router.refresh();
    } else {
      toast.error(result.error ?? "Failed to delete agency.");
    }
  }

  async function handleToggleSubscriptionExempt() {
    setTogglingExempt(true);
    const result = await setAgencySubscriptionExempt(
      agencyId,
      !subscriptionExempt,
    );
    setTogglingExempt(false);
    if (result.ok) {
      toast.success(
        subscriptionExempt
          ? "Subscription is now required for this agency."
          : "Subscription waived. This agency can use the platform without paying.",
      );
      router.refresh();
    } else {
      toast.error(result.error ?? "Failed to update subscription setting.");
    }
  }

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
          : "Agency disabled. All brokers in this agency are blocked.",
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
            <Link
              href={`/admin/agencies/${agencyId}/pricing`}
              className="flex items-center gap-2"
            >
              <DollarSign className="h-3.5 w-3.5" />
              Custom pricing
            </Link>
          </DropdownMenuItem>
          {isActive && ownerId && (
            <DropdownMenuItem
              onClick={handleManageAsOwner}
              disabled={managing}
              className="flex items-center gap-2"
            >
              {managing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <UserCog className="h-3.5 w-3.5" />
              )}
              Manage as owner
            </DropdownMenuItem>
          )}
          {ownerId && (
            <DropdownMenuItem
              onClick={() => resendSetPassword(ownerId)}
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
          )}
          <DropdownMenuItem
            onClick={handleToggleSubscriptionExempt}
            disabled={togglingExempt}
            className="flex items-center gap-2"
          >
            {togglingExempt ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : subscriptionExempt ? (
              <ShieldOff className="h-3.5 w-3.5" />
            ) : (
              <ShieldCheck className="h-3.5 w-3.5" />
            )}
            {subscriptionExempt ? "Require subscription" : "Waive subscription"}
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
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              setDeleteConfirmName("");
              setConfirmDelete(true);
            }}
            className="text-destructive focus:text-destructive"
          >
            Delete agency
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {resendDialog}

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

      <AlertDialog
        open={confirmDelete}
        onOpenChange={(open) => {
          setConfirmDelete(open);
          if (!open) setDeleteConfirmName("");
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete agency permanently?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the agency, all broker logins in it, and their
              listings. This cannot be undone. Type the agency name to confirm.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor={`delete-agency-${agencyId}`}>Agency name</Label>
            <Input
              id={`delete-agency-${agencyId}`}
              value={deleteConfirmName}
              onChange={(e) => setDeleteConfirmName(e.target.value)}
              placeholder={agencyName}
              autoComplete="off"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting || !deleteNameMatches}
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting…
                </>
              ) : (
                "Delete agency"
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
