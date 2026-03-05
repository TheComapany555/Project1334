"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { resendInvitation, revokeInvitation } from "@/lib/actions/agencies";
import { Loader2, RotateCw, X } from "lucide-react";

export function ResendButton({ invitationId }: { invitationId: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleResend() {
    setLoading(true);
    try {
      const result = await resendInvitation(invitationId);
      if (result.ok) {
        toast.success("Invitation resent");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error("Failed to resend invitation.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleResend}
      disabled={loading}
      className="h-8 px-2 text-xs"
    >
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <>
          <RotateCw className="h-3.5 w-3.5 mr-1" />
          Resend
        </>
      )}
    </Button>
  );
}

export function RevokeButton({ invitationId }: { invitationId: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleRevoke() {
    setLoading(true);
    try {
      const result = await revokeInvitation(invitationId);
      if (result.ok) {
        toast.success("Invitation revoked");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error("Failed to revoke invitation.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleRevoke}
      disabled={loading}
      className="h-8 px-2 text-xs text-destructive hover:text-destructive"
    >
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <>
          <X className="h-3.5 w-3.5 mr-1" />
          Revoke
        </>
      )}
    </Button>
  );
}

export function RemoveBrokerButton({
  brokerId,
  brokerName,
}: {
  brokerId: string;
  brokerName: string | null;
}) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleRemove() {
    const confirmed = window.confirm(
      `Remove ${brokerName ?? "this broker"} from your agency? They will lose access to all agency listings.`
    );
    if (!confirmed) return;

    setLoading(true);
    try {
      const { removeAgencyBroker } = await import("@/lib/actions/agencies");
      const result = await removeAgencyBroker(brokerId);
      if (result.ok) {
        toast.success("Broker removed from agency");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error("Failed to remove broker.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleRemove}
      disabled={loading}
      className="h-8 px-2 text-xs text-destructive hover:text-destructive"
    >
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <>
          <X className="h-3.5 w-3.5 mr-1" />
          Remove
        </>
      )}
    </Button>
  );
}
