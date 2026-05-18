"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Users } from "lucide-react";
import {
  getMySubscriptionPricing,
  type CurrentSubscriptionPricing,
} from "@/lib/actions/subscription-pricing";

function formatPrice(cents: number, currency: string): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: 0,
  }).format(cents / 100);
}

/**
 * Shows the agency owner how their next invoice will change as they invite
 * brokers. Only renders when the agency is on a tiered_seats plan. Flat plans
 * are unaffected by seat changes.
 *
 * Re-fetches when `brokerCount` changes so the projection stays in sync as
 * brokers accept invitations.
 */
export function SeatStatusBanner({ brokerCount }: { brokerCount: number }) {
  const [pricing, setPricing] = useState<CurrentSubscriptionPricing | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getMySubscriptionPricing()
      .then((p) => {
        if (!cancelled) {
          setPricing(p);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [brokerCount]);

  if (loading || !pricing || pricing.pricing_model !== "tiered_seats") {
    return null;
  }

  const included = pricing.included_seats ?? 0;
  const extraNow = Math.max(0, brokerCount - included);
  const extraSeatPrice = pricing.extra_seat_price_cents ?? 0;
  const projectedTotal = pricing.base_price_cents + extraNow * extraSeatPrice;
  const withinIncluded = brokerCount <= included;

  return (
    <Card className="border-primary/20 bg-primary/[0.03]">
      <CardContent className="py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <Users className="h-4 w-4 text-primary" />
          </div>
          <div className="text-sm">
            <p className="font-medium">
              {pricing.plan_name} · {brokerCount} broker
              {brokerCount === 1 ? "" : "s"} ({included} included
              {extraNow > 0 ? `, ${extraNow} extra` : ""})
            </p>
            {withinIncluded ? (
              <p className="text-xs text-muted-foreground">
                You can invite{" "}
                <strong>{Math.max(0, included - brokerCount)}</strong> more
                broker{included - brokerCount === 1 ? "" : "s"} at no extra
                cost. Beyond that, each extra broker adds{" "}
                {formatPrice(extraSeatPrice, pricing.currency)}/month.
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Each new broker adds{" "}
                {formatPrice(extraSeatPrice, pricing.currency)} to next
                month&apos;s invoice. Projected:{" "}
                <strong>
                  {formatPrice(projectedTotal, pricing.currency)}/mo
                </strong>
                .
              </p>
            )}
          </div>
        </div>
        <Button asChild size="sm" variant="ghost" className="shrink-0">
          <Link href="/dashboard/subscribe">
            <Sparkles className="h-3.5 w-3.5" />
            Manage plan
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
