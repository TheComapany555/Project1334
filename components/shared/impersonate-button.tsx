"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Loader2, UserCog } from "lucide-react";
import { startImpersonation } from "@/lib/actions/impersonation";

/**
 * "Manage as broker" — starts a managed (impersonation) session and sends the
 * actor into the broker's dashboard. The server action authorizes + audits; the
 * `update()` call drives the NextAuth jwt callback to swap the session identity.
 */
export function ImpersonateButton({
  brokerId,
  brokerName,
  label = "Manage",
  variant = "ghost",
  size = "sm",
  className = "h-8 px-2 text-xs",
}: {
  brokerId: string;
  brokerName: string | null;
  label?: string;
  variant?: React.ComponentProps<typeof Button>["variant"];
  size?: React.ComponentProps<typeof Button>["size"];
  className?: string;
}) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { update } = useSession();

  async function handleManage() {
    setLoading(true);
    try {
      const result = await startImpersonation(brokerId);
      if (!result.ok) {
        toast.error(result.error ?? "Could not start managing this broker.");
        return;
      }
      // Swap the session identity to the broker, then land in their dashboard.
      await update({ impersonate: brokerId });
      toast.success(`You are now managing ${result.brokerName ?? brokerName ?? "this broker"}.`);
      router.push("/dashboard");
      router.refresh();
    } catch {
      toast.error("Could not start managing this broker.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleManage}
      disabled={loading}
      className={className}
      title={`Sign in as ${brokerName ?? "this broker"} to manage their listings and profile`}
    >
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <>
          <UserCog className="h-3.5 w-3.5 mr-1" />
          {label}
        </>
      )}
    </Button>
  );
}
