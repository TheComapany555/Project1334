"use client";

import Link from "next/link";
import { AlertTriangle, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SubscriptionStatus } from "@/lib/types/subscriptions";

type Props = {
  status: SubscriptionStatus | null;
  isOwner: boolean;
};

export function SubscriptionBanner({ status, isOwner }: Props) {
  if (status === "active" || status === "trialing") return null;

  if (status === "past_due") {
    return (
      <div className="flex items-center gap-3 border border-amber-300/40 bg-amber-50/50 dark:bg-amber-950/20 px-4 py-3 rounded-lg">
        <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
            Payment failed
          </p>
          <p className="text-xs text-muted-foreground">
            Your subscription payment failed. Please update your payment method to avoid losing access.
          </p>
        </div>
        {isOwner && (
          <Button size="sm" variant="outline" asChild className="shrink-0">
            <Link href="/dashboard/subscribe">
              <CreditCard className="h-3.5 w-3.5 mr-1.5" />
              Update payment
            </Link>
          </Button>
        )}
      </div>
    );
  }

  // No subscription or expired/cancelled
  return (
    <div className="flex items-center gap-3 border border-destructive/30 bg-destructive/5 px-4 py-3 rounded-lg">
      <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-destructive">
          No active subscription
        </p>
        <p className="text-xs text-muted-foreground">
          {isOwner
            ? "Subscribe to access all platform features."
            : "Your agency owner needs to subscribe to continue using the platform."}
        </p>
      </div>
      {isOwner && (
        <Button size="sm" asChild className="shrink-0">
          <Link href="/dashboard/subscribe">Subscribe now</Link>
        </Button>
      )}
    </div>
  );
}
