"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Lock, Crown, ArrowRight, LifeBuoy } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SubscriptionStatus } from "@/lib/types/subscriptions";

type Props = {
  status: SubscriptionStatus | null;
  isOwner: boolean;
  subscriptionExempt?: boolean;
  children: React.ReactNode;
};

// Pages accessible without an active paid subscription
const ALLOWED_PATHS = [
  "/dashboard/subscribe",
  "/dashboard/profile",
  "/dashboard/workspace",
  "/dashboard/support",
];

export function SubscriptionGate({
  status,
  isOwner,
  subscriptionExempt = false,
  children,
}: Props) {
  const pathname = usePathname();

  const isSubscriptionOk = ["active", "trialing", "past_due"].includes(
    status ?? "",
  );

  const isAllowedPath = ALLOWED_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );

  if (subscriptionExempt || isSubscriptionOk || isAllowedPath) {
    return <>{children}</>;
  }

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
              ? "Your agency needs an active subscription to access this feature. Subscribe to unlock all platform features, or contact support if you need help."
              : "Your agency's subscription is not active. Please ask your agency owner to subscribe."}
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          {isOwner && (
            <Button asChild size="lg" className="gap-2">
              <Link href="/dashboard/subscribe">
                <Crown className="h-4 w-4" />
                Subscribe now
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          )}
          <Button asChild size="lg" variant="outline" className="gap-2">
            <Link href="/dashboard/support">
              <LifeBuoy className="h-4 w-4" />
              Contact support
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
