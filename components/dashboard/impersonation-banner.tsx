"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Loader2, UserCog, LogOut } from "lucide-react";
import { stopImpersonation } from "@/lib/actions/impersonation";

/**
 * Sticky banner shown whenever the current session is a managed ("manage as
 * broker") session. Makes the impersonation impossible to miss and gives a
 * one-click exit back to the real account. Renders nothing for normal sessions.
 */
export function ImpersonationBanner() {
  const { data: session, update } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const impersonator = session?.user?.impersonator;
  if (!impersonator) return null;

  const managedName = session.user.name ?? session.user.email ?? "this broker";

  async function handleExit() {
    setLoading(true);
    try {
      await stopImpersonation();
      await update({ stopImpersonating: true });
      toast.success("Returned to your own account.");
      // Admins land back in /admin; agency owners back in their dashboard.
      router.push(impersonator?.role === "admin" ? "/admin/brokers" : "/dashboard/workspace?tab=team");
      router.refresh();
    } catch {
      toast.error("Could not exit the managed session.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-amber-500 px-4 py-2 text-center text-sm font-medium text-amber-950">
      <span className="inline-flex items-center gap-1.5">
        <UserCog className="h-4 w-4" />
        You are managing <strong>{managedName}</strong> as {impersonator.name ?? "yourself"}.
      </span>
      <Button
        variant="outline"
        size="sm"
        onClick={handleExit}
        disabled={loading}
        className="h-7 border-amber-700/40 bg-amber-50 px-2 text-xs text-amber-950 hover:bg-amber-100"
      >
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <>
            <LogOut className="h-3.5 w-3.5 mr-1" />
            Exit
          </>
        )}
      </Button>
    </div>
  );
}
