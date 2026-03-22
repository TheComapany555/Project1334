"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Lock, Crown, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SubscriptionStatus } from "@/lib/types/subscriptions";

type Props = {
  status: SubscriptionStatus | null;
  isOwner: boolean;
  children: React.ReactNode;
};

// Pages that are accessible without an active subscription
const ALLOWED_PATHS = ["/dashboard/subscribe", "/dashboard/profile"];

export function SubscriptionGate({ status, isOwner, children }: Props) {
  const pathname = usePathname();

  const isSubscriptionOk = ["active", "trialing", "past_due"].includes(
    status ?? ""
  );

  const isAllowedPath = ALLOWED_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );

  // If subscription is OK or we're on an allowed path, render children
  if (isSubscriptionOk || isAllowedPath) {
    return <>{children}</>;
  }

  // Block access — show inline gate
  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <Lock className="h-7 w-7 text-muted-foreground" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-semibold tracking-tight">
            Subscription required
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {isOwner
              ? "Your agency needs an active subscription to access this feature. Subscribe to unlock all platform features."
              : "Your agency's subscription is not active. Please ask your agency owner to subscribe."}
          </p>
        </div>

        {isOwner && (
          <Button asChild size="lg" className="gap-2">
            <Link href="/dashboard/subscribe">
              <Crown className="h-4 w-4" />
              Subscribe now
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}
