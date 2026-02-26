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

  async function handleSetStatus(newStatus: "active" | "disabled") {
    const result = await setBrokerStatus(brokerId, newStatus);
    if (result.ok) {
      toast.success(newStatus === "active" ? "Broker enabled." : "Broker disabled.");
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
        {isActive ? (
          <DropdownMenuItem
            onClick={() => handleSetStatus("disabled")}
            className="text-destructive focus:text-destructive"
          >
            Disable broker
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onClick={() => handleSetStatus("active")}>
            Enable broker
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
