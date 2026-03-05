"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { setAgencyStatus } from "@/lib/actions/admin-brokers";

type Props = { agencyId: string; status: string };

export function AgencyActions({ agencyId, status }: Props) {
  const router = useRouter();
  const isActive = status === "active";
  const isPending = status === "pending";

  async function handleSetStatus(newStatus: "active" | "disabled") {
    const result = await setAgencyStatus(agencyId, newStatus);
    if (result.ok) {
      toast.success(
        newStatus === "active"
          ? isPending
            ? "Agency approved. Their brokers can sign in now."
            : "Agency enabled."
          : "Agency disabled. All brokers in this agency are blocked."
      );
      router.refresh();
    } else {
      toast.error(result.error ?? "Failed to update.");
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          Actions
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {isPending && (
          <DropdownMenuItem onClick={() => handleSetStatus("active")}>
            Approve agency
          </DropdownMenuItem>
        )}
        {isActive ? (
          <DropdownMenuItem
            onClick={() => handleSetStatus("disabled")}
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
  );
}
