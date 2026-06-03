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
  Check,
} from "lucide-react";
import { getMySubscription } from "@/lib/actions/subscriptions";
import { getActiveProducts } from "@/lib/actions/products";
import {
  getMyPlanQuotes,
  getMySubscriptionPricing,
  type ResolvedPlanQuote,
  type CurrentSubscriptionPricing,
} from "@/lib/actions/subscription-pricing";
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
import { cn } from "@/lib/utils";

function formatPrice(cents: number, currency: string): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: 0,
  }).format(cents / 100);
}

// Where "Contact sales" emails go. Configurable via env so it's easy to point
// at the client's own sales address without a code change.
const SALES_EMAIL =
  process.env.NEXT_PUBLIC_SALES_EMAIL || "ghufran@cirqley.com";

const PLAN_FEATURES = [
  { icon: ListChecks, text: "Unlimited listings" },
  { icon: Mail, text: "Buyer enquiry management" },
  { icon: BarChart3, text: "Dashboard analytics" },
  { icon: Shield, text: "Team management & roles" },
  { icon: Zap, text: "Priority support" },
];

// ─── Active Subscription View ────────────────────────────────────────────────

function ActiveSubscriptionView({
  subscription,
  pricing,
  onManage,
  managing,
}: {
  subscription: AgencySubscription;
  pricing: CurrentSubscriptionPricing | null;
  onManage: () => void;
  managing: boolean;
}) {
  const isActive = ["active", "trialing"].includes(subscription.status);
  const isPastDue = subscription.status === "past_due";
  const tiered = pricing?.pricing_model === "tiered_seats";

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-primary/10 mx-auto mb-2">
          <Crown className="h-6 w-6 text-primary" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Your subscription</h1>
        <p className="text-sm text-muted-foreground">
          Manage your agency&apos;s subscription and billing.
        </p>
      </div>

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

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg">
                  {pricing?.plan_name ??
                    subscription.plan_product?.name ??
                    "Agency Subscription"}
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
              {pricing && (
                <CardDescription>
                  {formatPrice(pricing.current_period_total_cents, pricing.currency)}
                  /month
                  {tiered && (
                    <span className="text-muted-foreground">
                      {" "}— {pricing.billed_seats} broker
                      {pricing.billed_seats === 1 ? "" : "s"} (
                      {pricing.included_seats} included
                      {pricing.billed_seats > (pricing.included_seats ?? 0)
                        ? ` + ${pricing.billed_seats - (pricing.included_seats ?? 0)} extra`
                        : ""}
                      )
                    </span>
                  )}
                </CardDescription>
              )}
            </div>
          </div>
        </CardHeader>
        <Separator />
        <CardContent className="pt-5 space-y-5">
          {tiered && pricing && (
            <SeatBreakdown pricing={pricing} />
          )}

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

function SeatBreakdown({ pricing }: { pricing: CurrentSubscriptionPricing }) {
  const extraNow = pricing.extra_seats_now;
  const extraPrice = pricing.extra_seat_price_cents ?? 0;
  const willChange = extraNow !== pricing.billed_seats - (pricing.included_seats ?? 0);
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
        <Users className="h-3.5 w-3.5" />
        Seats
      </p>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <p className="text-xs text-muted-foreground">Brokers right now</p>
          <p className="font-medium">{pricing.current_seats}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Included in plan</p>
          <p className="font-medium">{pricing.included_seats}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Extra seats now</p>
          <p className="font-medium">
            {extraNow} × {formatPrice(extraPrice, pricing.currency)}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Next invoice (est.)</p>
          <p className="font-medium">
            {formatPrice(pricing.next_period_total_cents, pricing.currency)}
          </p>
        </div>
      </div>
      {willChange && (
        <p className="text-xs text-muted-foreground border-t border-border pt-2">
          Your seat count has changed since the current period started. The
          next invoice will reflect <strong>{pricing.current_seats}</strong>{" "}
          broker{pricing.current_seats === 1 ? "" : "s"}.
        </p>
      )}
    </div>
  );
}

// ─── No Subscription View ────────────────────────────────────────────────────

function NoSubscriptionView({
  plans,
  quotes,
  onSelectPlan,
}: {
  plans: Product[];
  quotes: ResolvedPlanQuote[];
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

  const quoteById = new Map(quotes.map((q) => [q.plan_product_id, q]));
  // Default-recommend the middle tier where possible (most agencies have 4–10 brokers).
  const tieredPlans = plans
    .filter((p) => p.pricing_model === "tiered_seats")
    .sort((a, b) => (a.tier_rank ?? 0) - (b.tier_rank ?? 0));
  const flatPlans = plans.filter((p) => p.pricing_model === "flat");
  const recommendedIndex = tieredPlans.length >= 3 ? 1 : 0;

  // Single-plan mode (the SaleBiz model: one agency fee + per-seat add-ons).
  // Adapt the copy and layout so one plan doesn't read like a tier picker.
  const isSinglePlan = tieredPlans.length === 1 && flatPlans.length === 0;

  const currentBrokers = quotes[0]?.current_seats ?? 0;

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary">
          <Sparkles className="h-3.5 w-3.5" />
          {isSinglePlan ? "Agency subscription" : "Choose your plan"}
        </div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          {isSinglePlan ? "Activate your agency subscription" : "Pick the plan that fits your team"}
        </h1>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          You have <strong>{currentBrokers}</strong> broker
          {currentBrokers === 1 ? "" : "s"} right now.{" "}
          {isSinglePlan
            ? "Your subscription covers your first broker — each additional broker is billed monthly as an extra seat."
            : "Pick a tier that covers your team — extra seats are billed monthly as an add-on."}
        </p>
      </div>

      {tieredPlans.length > 0 && (
        <div className={cn("grid gap-4", isSinglePlan ? "max-w-md mx-auto" : "md:grid-cols-3")}>
          {tieredPlans.map((plan, i) => {
            const q = quoteById.get(plan.id);
            const isRecommended = !isSinglePlan && i === recommendedIndex;
            const isCoveredByIncluded =
              q && currentBrokers <= (q.included_seats ?? 0);
            return (
              <Card
                key={plan.id}
                className={cn(
                  "flex flex-col",
                  isRecommended && "border-primary/40 shadow-md",
                )}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{plan.name}</CardTitle>
                    {isRecommended && (
                      <Badge className="bg-primary/10 text-primary border-primary/20">
                        Recommended
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-baseline gap-1 pt-2">
                    <span className="text-3xl font-bold tracking-tight">
                      {q
                        ? formatPrice(q.base_price_cents, q.currency)
                        : formatPrice(plan.price, plan.currency)}
                    </span>
                    <span className="text-sm text-muted-foreground">/mo</span>
                  </div>
                  <CardDescription className="text-xs pt-1">
                    {plan.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col gap-4 pt-0">
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Users className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>
                        <strong>{q?.included_seats ?? plan.included_seats}</strong>{" "}
                        broker
                        {(q?.included_seats ?? plan.included_seats) === 1
                          ? ""
                          : "s"}{" "}
                        included
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>
                        {q
                          ? formatPrice(q.extra_seat_price_cents ?? 0, q.currency)
                          : formatPrice(plan.extra_seat_price ?? 0, plan.currency)}
                        /extra broker/mo
                      </span>
                    </div>
                  </div>

                  {q && (
                    <div className="rounded-md bg-muted/40 p-2.5 text-xs space-y-0.5">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Base ({q.included_seats} included)
                        </span>
                        <span>{formatPrice(q.base_price_cents, q.currency)}</span>
                      </div>
                      {q.extra_seats > 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">
                            + {q.extra_seats} extra ×{" "}
                            {formatPrice(q.extra_seat_price_cents ?? 0, q.currency)}
                          </span>
                          <span>
                            {formatPrice(
                              q.extra_seats * (q.extra_seat_price_cents ?? 0),
                              q.currency,
                            )}
                          </span>
                        </div>
                      )}
                      <Separator className="my-1" />
                      <div className="flex justify-between font-medium">
                        <span>You&apos;d pay</span>
                        <span>
                          {formatPrice(q.monthly_total_cents, q.currency)}/mo
                        </span>
                      </div>
                    </div>
                  )}

                  {q && isCoveredByIncluded && (
                    <p className="text-xs text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                      <Check className="h-3 w-3" />
                      Your team fits within the included seats
                    </p>
                  )}

                  <Button
                    onClick={() => onSelectPlan(plan)}
                    variant={isRecommended ? "default" : "outline"}
                    className="mt-auto w-full"
                  >
                    Choose {plan.name}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Legacy flat plan, if any — shown collapsed below the tiers */}
      {flatPlans.length > 0 && (
        <details className="text-xs text-muted-foreground text-center">
          <summary className="cursor-pointer">
            Looking for the legacy flat-rate plan?
          </summary>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 max-w-xl mx-auto">
            {flatPlans.map((p) => {
              const q = quoteById.get(p.id);
              return (
                <Card key={p.id} className="text-left">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">{p.name}</CardTitle>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold">
                        {formatPrice(
                          q?.base_price_cents ?? p.price,
                          q?.currency ?? p.currency,
                        )}
                      </span>
                      <span className="text-sm text-muted-foreground">/mo</span>
                    </div>
                    {p.description && (
                      <CardDescription className="text-xs pt-1">
                        {p.description}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="pt-0">
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => onSelectPlan(p)}
                    >
                      Subscribe
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </details>
      )}

      <div className="rounded-xl border bg-muted/20 p-4 text-center text-sm">
        <p className="font-medium">Want a custom deal or have a large team?</p>
        <p className="text-muted-foreground mt-0.5">
          Talk to us about volume pricing or a discount code.{" "}
          <a
            href={`mailto:${SALES_EMAIL}?subject=${encodeURIComponent(
              "SaleBiz subscription enquiry",
            )}`}
            className="font-medium text-primary hover:underline"
          >
            Contact sales
          </a>
        </p>
      </div>

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
  quote,
  onBack,
}: {
  plan: Product;
  quote: ResolvedPlanQuote | null;
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
          {quote && quote.pricing_model === "tiered_seats" ? (
            <>
              {quote.plan_name}: {formatPrice(quote.base_price_cents, quote.currency)} base
              {quote.extra_seats > 0 && (
                <>
                  {" "}+ {quote.extra_seats} × {formatPrice(quote.extra_seat_price_cents ?? 0, quote.currency)}
                </>
              )}{" "}= <strong>{formatPrice(quote.monthly_total_cents, quote.currency)}/mo</strong>
            </>
          ) : (
            "Enter your payment details to activate your agency."
          )}
        </p>
      </div>

      <SubscriptionCheckout product={plan} quote={quote} />
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function SubscribePage() {
  const searchParams = useSearchParams();
  const [subscription, setSubscription] =
    useState<AgencySubscription | null>(null);
  const [pricing, setPricing] = useState<CurrentSubscriptionPricing | null>(null);
  const [plans, setPlans] = useState<Product[]>([]);
  const [quotes, setQuotes] = useState<ResolvedPlanQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [managing, setManaging] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Product | null>(null);

  useEffect(() => {
    if (searchParams.get("cancelled") === "true") {
      toast.error("Subscription checkout was cancelled.");
    }
  }, [searchParams]);

  useEffect(() => {
    Promise.all([
      getMySubscription(),
      getActiveProducts(),
      getMyPlanQuotes().catch(() => [] as ResolvedPlanQuote[]),
      getMySubscriptionPricing().catch(() => null),
    ]).then(([sub, products, q, p]) => {
      setSubscription(sub);
      setPricing(p);
      const subscriptionProducts = products.filter(
        (x) => x.product_type === "subscription",
      );
      // Sort by tier_rank ascending so cards render Starter → Growth → Scale.
      subscriptionProducts.sort(
        (a, b) => (a.tier_rank ?? 999) - (b.tier_rank ?? 999),
      );
      setPlans(subscriptionProducts);
      setQuotes(q);
      setLoading(false);
    });
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

  if (subscription && (isActive || isPastDue)) {
    return (
      <ActiveSubscriptionView
        subscription={subscription}
        pricing={pricing}
        onManage={handleManage}
        managing={managing}
      />
    );
  }

  if (selectedPlan) {
    const selectedQuote =
      quotes.find((q) => q.plan_product_id === selectedPlan.id) ?? null;
    return (
      <CheckoutView
        plan={selectedPlan}
        quote={selectedQuote}
        onBack={() => setSelectedPlan(null)}
      />
    );
  }

  return (
    <NoSubscriptionView
      plans={plans}
      quotes={quotes}
      onSelectPlan={setSelectedPlan}
    />
  );
}
