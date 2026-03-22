"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  CreditCard,
  Shield,
  Users,
  Loader2,
  Zap,
  ArrowLeft,
  BarChart3,
  Mail,
  Crown,
  CalendarDays,
  RefreshCw,
  ExternalLink,
  AlertTriangle,
  Sparkles,
  ListChecks,
} from "lucide-react";
import { getMySubscription } from "@/lib/actions/subscriptions";
import { getActiveProducts } from "@/lib/actions/products";
import type { AgencySubscription } from "@/lib/types/subscriptions";
import type { Product } from "@/lib/types/products";
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

const PLAN_FEATURES = [
  { icon: ListChecks, text: "Unlimited listings" },
  { icon: Users, text: "Unlimited broker accounts" },
  { icon: Mail, text: "Buyer enquiry management" },
  { icon: BarChart3, text: "Dashboard analytics" },
  { icon: Shield, text: "Team management & roles" },
  { icon: Zap, text: "Priority support" },
];

// ─── Active Subscription View ────────────────────────────────────────────────

function ActiveSubscriptionView({
  subscription,
  onManage,
  managing,
}: {
  subscription: AgencySubscription;
  onManage: () => void;
  managing: boolean;
}) {
  const isActive = ["active", "trialing"].includes(subscription.status);
  const isPastDue = subscription.status === "past_due";

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-primary/10 mx-auto mb-2">
          <Crown className="h-6 w-6 text-primary" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Your subscription</h1>
        <p className="text-sm text-muted-foreground">
          Manage your agency&apos;s subscription and billing.
        </p>
      </div>

      {/* Past due warning */}
      {isPastDue && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30 p-4">
          <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
              Payment failed
            </p>
            <p className="text-xs text-amber-700/80 dark:text-amber-400/80 mt-0.5">
              Please update your payment method to avoid losing access to the platform.
            </p>
          </div>
        </div>
      )}

      {/* Plan card */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg">
                  {subscription.plan_product?.name ?? "Agency Subscription"}
                </CardTitle>
                <Badge
                  variant={isActive ? "default" : "secondary"}
                  className={
                    isActive
                      ? "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800"
                      : ""
                  }
                >
                  {isActive ? "Active" : isPastDue ? "Past due" : subscription.status}
                </Badge>
              </div>
              {subscription.plan_product && (
                <CardDescription>
                  {formatPrice(subscription.plan_product.price, subscription.plan_product.currency)}
                  /month
                </CardDescription>
              )}
            </div>
          </div>
        </CardHeader>
        <Separator />
        <CardContent className="pt-5 space-y-5">
          {/* Billing details */}
          <div className="grid gap-3 sm:grid-cols-2">
            {subscription.current_period_start && (
              <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
                <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">
                    Current period
                  </p>
                  <p className="text-sm font-medium">
                    {format(new Date(subscription.current_period_start), "d MMM yyyy")}
                  </p>
                </div>
              </div>
            )}
            {subscription.current_period_end && (
              <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
                <RefreshCw className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">
                    {subscription.cancel_at_period_end ? "Ends on" : "Next billing"}
                  </p>
                  <p className="text-sm font-medium">
                    {format(new Date(subscription.current_period_end), "d MMM yyyy")}
                  </p>
                </div>
              </div>
            )}
          </div>

          {subscription.cancel_at_period_end && (
            <div className="flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-950/20 p-3 text-sm">
              <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
              <p className="text-amber-700 dark:text-amber-400">
                Your subscription will not renew. Access ends on{" "}
                {subscription.current_period_end &&
                  format(new Date(subscription.current_period_end), "d MMMM yyyy")}
                .
              </p>
            </div>
          )}

          {/* What's included */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Your plan includes
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {PLAN_FEATURES.map((f) => (
                <div key={f.text} className="flex items-center gap-2.5 text-sm">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/10">
                    <f.icon className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <span>{f.text}</span>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Manage button */}
          {subscription.stripe_customer_id ? (
            <Button
              variant="outline"
              onClick={onManage}
              disabled={managing}
              className="w-full sm:w-auto gap-2"
            >
              {managing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ExternalLink className="h-4 w-4" />
              )}
              Manage billing & invoices
            </Button>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-2">
              This subscription is managed by an administrator. Contact support for changes.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── No Subscription View ────────────────────────────────────────────────────

function NoSubscriptionView({
  plans,
  onSelectPlan,
}: {
  plans: Product[];
  onSelectPlan: (plan: Product) => void;
}) {
  if (plans.length === 0) {
    return (
      <div className="max-w-lg mx-auto">
        <Card>
          <CardContent className="py-16 text-center">
            <Shield className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="font-medium">No plans available</p>
            <p className="text-sm text-muted-foreground mt-1">
              Please contact support for subscription access.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const plan = plans[0];

  return (
    <div className="max-w-xl mx-auto space-y-6">
      {/* Hero */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary">
          <Sparkles className="h-3.5 w-3.5" />
          Get started today
        </div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Unlock your agency&apos;s potential
        </h1>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Subscribe to access all platform features. List businesses, manage your
          team, and connect with buyers across Australia.
        </p>
      </div>

      {/* Single plan — full width card */}
      <Card className="border-primary/30 shadow-md">
        <CardContent className="p-6 sm:p-8 space-y-6">
          {/* Price header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <Crown className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">{plan.name}</h2>
                {plan.description && (
                  <p className="text-sm text-muted-foreground">
                    {plan.description}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-baseline gap-1 sm:text-right">
              <span className="text-3xl sm:text-4xl font-bold tracking-tight">
                {formatPrice(plan.price, plan.currency)}
              </span>
              <span className="text-muted-foreground">/mo</span>
            </div>
          </div>

          <Separator />

          {/* Features grid */}
          <div className="grid gap-3 sm:grid-cols-2">
            {PLAN_FEATURES.map((f) => (
              <div key={f.text} className="flex items-center gap-3 text-sm">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/10">
                  <f.icon className="h-3.5 w-3.5 text-primary" />
                </div>
                <span>{f.text}</span>
              </div>
            ))}
          </div>

          <Separator />

          {/* CTA */}
          <div className="space-y-3">
            <Button
              className="w-full h-12 gap-2 font-semibold"
              size="lg"
              onClick={() => onSelectPlan(plan)}
            >
              <Zap className="h-4 w-4" />
              Subscribe now
            </Button>
            <p className="text-center text-[11px] text-muted-foreground">
              Cancel anytime · No lock-in contract
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Multiple plans — grid (for future) */}
      {plans.length > 1 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {plans.slice(1).map((p) => (
            <Card key={p.id} className="flex flex-col">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{p.name}</CardTitle>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold">
                    {formatPrice(p.price, p.currency)}
                  </span>
                  <span className="text-sm text-muted-foreground">/mo</span>
                </div>
                {p.description && (
                  <CardDescription className="text-xs pt-1">
                    {p.description}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="flex-1 pt-0">
                <Button
                  variant="outline"
                  className="w-full mt-4"
                  onClick={() => onSelectPlan(p)}
                >
                  Select plan
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Trust */}
      <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Shield className="h-3.5 w-3.5" />
          256-bit SSL
        </span>
        <span className="flex items-center gap-1.5">
          <CreditCard className="h-3.5 w-3.5" />
          Powered by Stripe
        </span>
        <span className="flex items-center gap-1.5">
          <RefreshCw className="h-3.5 w-3.5" />
          Cancel anytime
        </span>
      </div>
    </div>
  );
}

// ─── Checkout View ───────────────────────────────────────────────────────────

function CheckoutView({
  plan,
  onBack,
}: {
  plan: Product;
  onBack: () => void;
}) {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Button
        variant="ghost"
        size="sm"
        onClick={onBack}
        className="gap-1.5 text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to plans
      </Button>

      <div className="text-center space-y-1 pb-2">
        <h1 className="text-2xl font-bold tracking-tight">
          Complete your subscription
        </h1>
        <p className="text-sm text-muted-foreground">
          Enter your payment details to activate your agency.
        </p>
      </div>

      <SubscriptionCheckout product={plan} />
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function SubscribePage() {
  const searchParams = useSearchParams();
  const [subscription, setSubscription] =
    useState<AgencySubscription | null>(null);
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
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading subscription…</p>
      </div>
    );
  }

  const isActive = ["active", "trialing"].includes(subscription?.status ?? "");
  const isPastDue = subscription?.status === "past_due";

  // Active subscription
  if (subscription && (isActive || isPastDue)) {
    return (
      <ActiveSubscriptionView
        subscription={subscription}
        onManage={handleManage}
        managing={managing}
      />
    );
  }

  // Checkout
  if (selectedPlan) {
    return (
      <CheckoutView plan={selectedPlan} onBack={() => setSelectedPlan(null)} />
    );
  }

  // No subscription
  return (
    <NoSubscriptionView plans={plans} onSelectPlan={setSelectedPlan} />
  );
}
