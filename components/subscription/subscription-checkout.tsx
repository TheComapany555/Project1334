"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import stripePromise from "@/lib/stripe-client";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  Loader2,
  Lock,
  CheckCircle2,
  AlertCircle,
  Shield,
  Check,
  Users,
  CreditCard,
  FileText,
} from "lucide-react";
import type { Product } from "@/lib/types/products";

function formatPrice(cents: number, currency: string): string {
  const formatted = new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
  }).format(cents / 100);
  return `${formatted} ${currency.toUpperCase()}`;
}

// ─── Payment Form ────────────────────────────────────────────────────────────

function SubscriptionPaymentForm({
  product,
  onSuccess,
}: {
  product: Product;
  onSuccess: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);
    setError(null);

    const { error: submitError } = await elements.submit();
    if (submitError) {
      setError(submitError.message ?? "Validation failed.");
      setProcessing(false);
      return;
    }

    const { error: confirmError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/dashboard?subscription=active`,
      },
      redirect: "if_required",
    });

    if (confirmError) {
      setError(confirmError.message ?? "Payment failed.");
      setProcessing(false);
    } else {
      onSuccess();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <PaymentElement
        options={{
          layout: "tabs",
        }}
      />

      {error && (
        <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/5 px-3 py-2.5 rounded-lg">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <Button
        type="submit"
        className="w-full h-12 text-sm font-semibold gap-2"
        disabled={!stripe || processing}
      >
        {processing ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Processing…
          </>
        ) : (
          <>
            <Lock className="h-4 w-4" />
            Subscribe for {formatPrice(product.price, product.currency)}/month
          </>
        )}
      </Button>

      <p className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
        <Shield className="h-3 w-3" />
        Secured by Stripe · 256-bit SSL encryption
      </p>
    </form>
  );
}

// ─── Success View ────────────────────────────────────────────────────────────

function SuccessView() {
  const router = useRouter();

  useEffect(() => {
    // Force NextAuth session refresh so the JWT picks up the new subscription status,
    // then redirect to dashboard
    const t = setTimeout(async () => {
      // Trigger a session update by hitting the session endpoint
      await fetch("/api/auth/session");
      // Use window.location for a full page reload so middleware gets the fresh JWT
      window.location.href = "/dashboard";
    }, 3000);
    return () => clearTimeout(t);
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
      <div className="h-16 w-16 rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center">
        <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
      </div>
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">Subscription activated!</h2>
        <p className="text-sm text-muted-foreground">
          Your agency now has full access to the platform.
        </p>
      </div>
      <p className="text-xs text-muted-foreground">
        Redirecting to dashboard…
      </p>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

type Props = {
  product: Product;
};

export function SubscriptionCheckout({ product }: Props) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [paymentMode, setPaymentMode] = useState<"card" | "invoice">("card");
  const [invoiceNotes, setInvoiceNotes] = useState("");
  const [invoiceSubmitting, setInvoiceSubmitting] = useState(false);
  const [invoiceSubmitted, setInvoiceSubmitted] = useState(false);
  const [invoiceError, setInvoiceError] = useState<string | null>(null);
  const initCalledRef = useRef(false);

  const initializePayment = useCallback(async () => {
    if (initCalledRef.current) return;
    initCalledRef.current = true;
    setIsInitializing(true);
    setInitError(null);
    try {
      const res = await fetch("/api/stripe/create-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setInitError(data.error ?? "Failed to initialize checkout");
        initCalledRef.current = false;
        return;
      }
      setClientSecret(data.clientSecret);
    } catch {
      setInitError("Network error. Please try again.");
      initCalledRef.current = false;
    } finally {
      setIsInitializing(false);
    }
  }, [product.id]);

  useEffect(() => {
    initializePayment();
  }, [initializePayment]);

  if (showSuccess) {
    return <SuccessView />;
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Left: Order Summary */}
        <div className="lg:col-span-2 order-2 lg:order-1 space-y-4">
          <div className="rounded-xl border bg-card p-5 space-y-4">
            <h3 className="font-semibold text-sm">Subscription details</h3>
            <Separator />
            <div className="space-y-2.5">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{product.name}</span>
                <span className="font-medium">
                  {formatPrice(product.price, product.currency)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Billed monthly · Cancel anytime
              </p>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Total</span>
              <span className="text-xl font-bold">
                {formatPrice(product.price, product.currency)}/mo
              </span>
            </div>
          </div>

          <div className="rounded-xl border bg-primary/[0.02] dark:bg-primary/[0.04] p-5 space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              What&apos;s included
            </h3>
            <ul className="space-y-2.5">
              <li className="flex items-center gap-2.5 text-sm">
                <Check className="h-4 w-4 text-primary shrink-0" />
                Unlimited broker accounts
              </li>
              <li className="flex items-center gap-2.5 text-sm">
                <Check className="h-4 w-4 text-primary shrink-0" />
                Create and manage listings
              </li>
              <li className="flex items-center gap-2.5 text-sm">
                <Check className="h-4 w-4 text-primary shrink-0" />
                Buyer enquiry management
              </li>
              <li className="flex items-center gap-2.5 text-sm">
                <Users className="h-4 w-4 text-primary shrink-0" />
                Team management
              </li>
            </ul>
          </div>
        </div>

        {/* Right: Payment Form */}
        <div className="lg:col-span-3 order-1 lg:order-2">
          <div className="rounded-xl border bg-card p-5 sm:p-7">
            <h2 className="text-lg font-semibold mb-1">Payment details</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Choose how to pay for your subscription
            </p>

            {/* Payment mode toggle */}
            <div className="flex gap-2 mb-6">
              <button
                type="button"
                onClick={() => setPaymentMode("card")}
                className={cn(
                  "flex-1 rounded-lg border px-3 py-2.5 text-sm font-medium transition-all",
                  paymentMode === "card"
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border text-muted-foreground hover:border-border/80"
                )}
              >
                <CreditCard className="h-3.5 w-3.5 inline mr-1.5 -mt-0.5" />
                Pay by card
              </button>
              <button
                type="button"
                onClick={() => setPaymentMode("invoice")}
                className={cn(
                  "flex-1 rounded-lg border px-3 py-2.5 text-sm font-medium transition-all",
                  paymentMode === "invoice"
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border text-muted-foreground hover:border-border/80"
                )}
              >
                <FileText className="h-3.5 w-3.5 inline mr-1.5 -mt-0.5" />
                Request invoice
              </button>
            </div>

            {paymentMode === "invoice" ? (
              invoiceSubmitted ? (
                <div className="flex flex-col items-center justify-center py-12 gap-4 text-center">
                  <div className="h-14 w-14 rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center">
                    <CheckCircle2 className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-base font-semibold">Invoice requested</p>
                    <p className="text-sm text-muted-foreground max-w-xs">
                      Our team will send you an invoice. Your subscription will be activated once payment is received.
                    </p>
                  </div>
                </div>
              ) : (
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    setInvoiceSubmitting(true);
                    setInvoiceError(null);
                    try {
                      const res = await fetch("/api/stripe/request-subscription-invoice", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ productId: product.id, notes: invoiceNotes.trim() || undefined }),
                      });
                      const data = await res.json();
                      if (!res.ok) {
                        setInvoiceError(data.error ?? "Failed to request invoice.");
                        return;
                      }
                      setInvoiceSubmitted(true);
                    } catch {
                      setInvoiceError("Network error. Please try again.");
                    } finally {
                      setInvoiceSubmitting(false);
                    }
                  }}
                  className="space-y-5"
                >
                  <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
                    <p className="text-sm font-medium">How it works</p>
                    <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal list-inside">
                      <li>Submit your invoice request below</li>
                      <li>We&apos;ll generate and send you an invoice</li>
                      <li>Pay via bank transfer</li>
                      <li>Your subscription activates once payment is confirmed</li>
                    </ol>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="sub-invoice-notes" className="text-sm font-medium">
                      Notes <span className="text-muted-foreground font-normal">(optional)</span>
                    </label>
                    <textarea
                      id="sub-invoice-notes"
                      value={invoiceNotes}
                      onChange={(e) => setInvoiceNotes(e.target.value)}
                      placeholder="PO number, billing details…"
                      className="flex min-h-[80px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                      maxLength={1000}
                    />
                  </div>

                  {invoiceError && (
                    <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/5 px-3 py-2.5 rounded-lg">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <p>{invoiceError}</p>
                    </div>
                  )}

                  <Button type="submit" variant="outline" className="w-full h-11 gap-2" disabled={invoiceSubmitting}>
                    {invoiceSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                    {invoiceSubmitting ? "Submitting…" : `Request invoice (${formatPrice(product.price, product.currency)}/mo)`}
                  </Button>

                  <p className="text-center text-[11px] text-muted-foreground">
                    Subscription activates once payment is confirmed by admin.
                  </p>
                </form>
              )
            ) : isInitializing ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">
                  Preparing secure checkout…
                </p>
              </div>
            ) : initError ? (
              <div className="flex flex-col items-center justify-center py-12 gap-4 text-center">
                <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
                  <AlertCircle className="h-6 w-6 text-destructive" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">Checkout unavailable</p>
                  <p className="text-xs text-muted-foreground max-w-xs">
                    {initError}
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={initializePayment}>
                  Try again
                </Button>
              </div>
            ) : clientSecret ? (
              <Elements
                stripe={stripePromise}
                options={{
                  clientSecret,
                  fonts: [
                    {
                      cssSrc:
                        "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap",
                    },
                  ],
                  appearance: {
                    theme: "stripe",
                    variables: {
                      colorPrimary: "hsl(152, 60%, 36%)",
                      colorBackground: "hsl(0, 0%, 100%)",
                      colorText: "hsl(0, 0%, 10%)",
                      colorDanger: "hsl(0, 84%, 60%)",
                      fontFamily: "Inter, system-ui, sans-serif",
                      borderRadius: "6px",
                      spacingUnit: "4px",
                      fontSizeBase: "14px",
                    },
                    rules: {
                      ".Input": {
                        border: "1px solid hsl(0, 0%, 85%)",
                        boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.04)",
                        padding: "10px 12px",
                      },
                      ".Input:focus": {
                        border: "1px solid hsl(152, 60%, 36%)",
                        boxShadow: "0 0 0 3px hsla(152, 60%, 36%, 0.15)",
                      },
                      ".Label": {
                        fontWeight: "500",
                        fontSize: "12px",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        color: "hsl(0, 0%, 45%)",
                        marginBottom: "6px",
                      },
                      ".Tab": {
                        border: "1px solid hsl(0, 0%, 85%)",
                        boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.04)",
                      },
                      ".Tab--selected": {
                        borderColor: "hsl(152, 60%, 36%)",
                        boxShadow: "0 0 0 1px hsl(152, 60%, 36%)",
                      },
                    },
                  },
                }}
              >
                <SubscriptionPaymentForm
                  product={product}
                  onSuccess={() => setShowSuccess(true)}
                />
              </Elements>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
