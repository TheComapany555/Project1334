"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { format } from "date-fns";
import { Check, CreditCard, Shield, Users, Loader2 } from "lucide-react";
import { getMySubscription } from "@/lib/actions/subscriptions";
import { getActiveProducts } from "@/lib/actions/products";
import type { AgencySubscription } from "@/lib/types/subscriptions";
import type { Product } from "@/lib/types/products";
import { PageHeader } from "@/components/admin/page-header";
import { SubscriptionCheckout } from "@/components/subscription/subscription-checkout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

function formatPrice(cents: number, currency: string): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: 0,
  }).format(cents / 100);
}

export default function SubscribePage() {
  const searchParams = useSearchParams();
  const [subscription, setSubscription] = useState<AgencySubscription | null>(null);
  const [plans, setPlans] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [managing, setManaging] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Product | null>(null);

  useEffect(() => {
    if (searchParams.get("cancelled") === "true") {
      toast.error("Subscription checkout was cancelled.");
    }
  }, [searchParams]);

  useEffect(() => {
    Promise.all([getMySubscription(), getActiveProducts()]).then(
      ([sub, products]) => {
        setSubscription(sub);
        setPlans(products.filter((p) => p.product_type === "subscription"));
        setLoading(false);
      }
    );
  }, []);

  async function handleManage() {
    setManaging(true);
    try {
      const res = await fetch("/api/stripe/manage-subscription", {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to open billing portal");
        return;
      }
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setManaging(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isActive = ["active", "trialing"].includes(subscription?.status ?? "");
  const isPastDue = subscription?.status === "past_due";

  // Active subscription view
  if (subscription && (isActive || isPastDue)) {
    return (
      <div className="space-y-8">
        <PageHeader
          title="Subscription"
          description="Manage your agency's subscription."
        />

        {isPastDue && (
          <div className="flex items-center gap-3 border border-amber-300/40 bg-amber-50/50 dark:bg-amber-950/20 px-4 py-3 rounded-lg">
            <Shield className="h-4 w-4 text-amber-500" />
            <p className="text-sm text-amber-700 dark:text-amber-400">
              Your payment failed. Please update your payment method to avoid losing access.
            </p>
          </div>
        )}

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Current plan</CardTitle>
                <CardDescription>
                  {subscription.plan_product?.name ?? "Agency Subscription"}
                </CardDescription>
              </div>
              <Badge variant={isActive ? "default" : "secondary"}>
                {isActive ? "Active" : "Past due"}
              </Badge>
            </div>
          </CardHeader>
          <Separator />
          <CardContent className="pt-4 space-y-3">
            {subscription.plan_product && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Price</span>
                <span className="font-medium">
                  {formatPrice(subscription.plan_product.price, subscription.plan_product.currency)}/month
                </span>
              </div>
            )}
            {subscription.current_period_end && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {subscription.cancel_at_period_end ? "Ends on" : "Renews on"}
                </span>
                <span className="font-medium">
                  {format(new Date(subscription.current_period_end), "d MMMM yyyy")}
                </span>
              </div>
            )}
            {subscription.cancel_at_period_end && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                Your subscription will not renew. You will lose access after the end date.
              </p>
            )}
            <div className="pt-2">
              {subscription.stripe_customer_id ? (
                <Button
                  variant="outline"
                  onClick={handleManage}
                  disabled={managing}
                  className="w-full sm:w-auto"
                >
                  {managing ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <CreditCard className="h-4 w-4 mr-2" />
                  )}
                  Manage billing
                </Button>
              ) : (
                <p className="text-xs text-muted-foreground">
                  This subscription is managed by an administrator.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Embedded checkout view — user selected a plan
  if (selectedPlan) {
    return (
      <div className="space-y-8">
        <PageHeader
          title="Complete your subscription"
          description="Enter your payment details to activate your agency."
        />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSelectedPlan(null)}
          className="mb-2"
        >
          ← Back to plans
        </Button>
        <SubscriptionCheckout product={selectedPlan} />
      </div>
    );
  }

  // No subscription — show plans
  return (
    <div className="space-y-8">
      <PageHeader
        title="Subscribe"
        description="Choose a plan to access all platform features for your agency."
      />

      {plans.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              No subscription plans are available at this time. Please contact support.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => (
            <Card key={plan.id} className="relative flex flex-col">
              <CardHeader>
                <CardTitle className="text-lg">{plan.name}</CardTitle>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold">
                    {formatPrice(plan.price, plan.currency)}
                  </span>
                  <span className="text-sm text-muted-foreground">/month</span>
                </div>
                {plan.description && (
                  <CardDescription className="pt-1">
                    {plan.description}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="flex-1 space-y-4">
                <ul className="space-y-2.5 text-sm">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary shrink-0" />
                    <span>Unlimited broker accounts</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary shrink-0" />
                    <span>Create and manage listings</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary shrink-0" />
                    <span>Buyer enquiry management</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary shrink-0" />
                    <span>Team management</span>
                  </li>
                </ul>
                <Button
                  className="w-full"
                  onClick={() => setSelectedPlan(plan)}
                >
                  Subscribe
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
