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
import { setBrokerStatus } from "@/lib/actions/admin-brokers";

type Props = { brokerId: string; status: string };

export function BrokerActions({ brokerId, status }: Props) {
  const router = useRouter();
  const isActive = status === "active";
  const isPending = status === "pending";

  async function handleSetStatus(newStatus: "active" | "disabled") {
    const result = await setBrokerStatus(brokerId, newStatus);
    if (result.ok) {
      toast.success(
        newStatus === "active"
          ? isPending
            ? "Broker approved. They can sign in now."
            : "Broker enabled."
          : "Broker disabled."
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
            Approve broker
          </DropdownMenuItem>
        )}
        {isActive ? (
          <DropdownMenuItem
            onClick={() => handleSetStatus("disabled")}
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
  );
}
