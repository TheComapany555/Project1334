"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import type { StripePaymentElementOptions } from "@stripe/stripe-js";
import stripePromise from "@/lib/stripe-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Star,
  Loader2,
  Lock,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Shield,
  Clock,
  Sparkles,
  Search,
  BadgeCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Product } from "@/lib/types/products";

// ─── Types ───────────────────────────────────────────────────────────────────

type CheckoutPageProps = {
  listing: { id: string; title: string; slug: string };
  product: Product;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatPrice(cents: number, currency: string): string {
  const formatted = new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
  }).format(cents / 100);
  return `${formatted} ${currency.toUpperCase()}`;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ─── Floating Label Input ────────────────────────────────────────────────────

function FloatingInput({
  label,
  value,
  onChange,
  type = "text",
  error,
  valid,
  disabled,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
  type?: string;
  error?: string;
  valid?: boolean;
  disabled?: boolean;
  autoComplete?: string;
}) {
  const [focused, setFocused] = useState(false);
  const isFloating = focused || value.length > 0;

  return (
    <div className="relative">
      <div className="relative">
        <Input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          disabled={disabled}
          autoComplete={autoComplete}
          aria-invalid={!!error}
          aria-label={label}
          className={cn(
            "h-12 px-3 pt-5 pb-1 text-sm peer transition-all",
            error &&
              "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20",
            valid &&
              !error &&
              "border-emerald-500 focus-visible:border-emerald-500 focus-visible:ring-emerald-500/20"
          )}
        />
        <label
          className={cn(
            "absolute left-3 transition-all duration-200 pointer-events-none text-muted-foreground",
            isFloating
              ? "top-1.5 text-[10px] font-medium"
              : "top-1/2 -translate-y-1/2 text-sm",
            error && "text-destructive",
            valid && !error && focused && "text-emerald-600"
          )}
        >
          {label}
        </label>
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {error && <AlertCircle className="h-4 w-4 text-destructive" />}
          {valid && !error && (
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          )}
        </div>
      </div>
      {error && (
        <p className="text-[11px] text-destructive mt-1 ml-1">{error}</p>
      )}
    </div>
  );
}

// ─── Payment Form (inside Elements) ─────────────────────────────────────────

function PaymentForm({
  product,
  paymentId,
  onSuccess,
  disabled: externalDisabled,
}: {
  product: Product;
  paymentId: string;
  onSuccess: () => void;
  disabled?: boolean;
}) {
  const stripe = useStripe();
  const elements = useElements();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [nameError, setNameError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [nameTouched, setNameTouched] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [paymentReady, setPaymentReady] = useState(false);

  const disabled = isProcessing || !!externalDisabled;

  useEffect(() => {
    if (!nameTouched) return;
    setNameError(
      name.trim().length < 2 ? "Please enter your full name" : ""
    );
  }, [name, nameTouched]);

  useEffect(() => {
    if (!emailTouched) return;
    if (!email.trim()) setEmailError("Email is required");
    else if (!isValidEmail(email)) setEmailError("Please enter a valid email");
    else setEmailError("");
  }, [email, emailTouched]);

  const nameValid = nameTouched && name.trim().length >= 2;
  const emailValid = emailTouched && isValidEmail(email);
  const formValid = nameValid && emailValid && paymentReady;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPaymentError("");
    setNameTouched(true);
    setEmailTouched(true);

    if (!stripe || !elements || !formValid) return;

    setIsProcessing(true);
    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          payment_method_data: {
            billing_details: {
              name: name.trim(),
              email: email.trim(),
            },
          },
          return_url: `${window.location.origin}/dashboard/payments?success=true&payment_id=${paymentId}`,
        },
        redirect: "if_required",
      });

      if (error) {
        setPaymentError(
          error.type === "card_error" || error.type === "validation_error"
            ? error.message ?? "Payment failed"
            : "An unexpected error occurred. Please try again."
        );
      } else {
        onSuccess();
      }
    } catch {
      setPaymentError("Something went wrong. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  }

  const paymentElementOptions: StripePaymentElementOptions = {
    layout: "tabs",
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Contact */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Contact Information
        </h3>
        <FloatingInput
          label="Full Name"
          value={name}
          onChange={(val) => {
            setName(val);
            if (!nameTouched && val.length > 0) setNameTouched(true);
          }}
          error={nameError}
          valid={nameValid}
          disabled={disabled}
          autoComplete="name"
        />
        <FloatingInput
          label="Email Address"
          value={email}
          onChange={(val) => {
            setEmail(val);
            if (!emailTouched && val.length > 0) setEmailTouched(true);
          }}
          type="email"
          error={emailError}
          valid={emailValid}
          disabled={disabled}
          autoComplete="email"
        />
      </div>

      <Separator />

      {/* Stripe Payment Element */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Payment Details
        </h3>
        <div className="rounded-lg border p-3 bg-background">
          <PaymentElement
            options={paymentElementOptions}
            onReady={() => setPaymentReady(true)}
            onChange={(event) => {
              if (event.complete) setPaymentError("");
            }}
          />
        </div>
      </div>

      {/* Error */}
      {paymentError && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive animate-in fade-in slide-in-from-top-1 duration-200">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <p>{paymentError}</p>
        </div>
      )}

      {/* Submit */}
      <Button
        type="submit"
        disabled={isProcessing || !stripe || !elements}
        className={cn(
          "h-12 w-full gap-2 text-sm font-semibold transition-all",
          isProcessing && "opacity-90"
        )}
      >
        {isProcessing ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Processing payment…
          </>
        ) : (
          <>
            <Lock className="h-4 w-4" />
            Pay {formatPrice(product.price, product.currency)}
          </>
        )}
      </Button>

      {/* Security */}
      <div className="flex items-center justify-center gap-1.5 pt-1 text-[11px] text-muted-foreground/60">
        <Shield className="h-3.5 w-3.5" />
        <span>Secured by Stripe · 256-bit SSL encryption</span>
      </div>
    </form>
  );
}

// ─── Success View ────────────────────────────────────────────────────────────

function SuccessView({ listing }: { listing: { title: string } }) {
  const router = useRouter();

  useEffect(() => {
    const t = setTimeout(() => router.push("/dashboard/listings"), 5000);
    return () => clearTimeout(t);
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center space-y-6 animate-in fade-in zoom-in-95 duration-500">
        <div className="mx-auto h-20 w-20 rounded-full bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center">
          <CheckCircle2 className="h-10 w-10 text-emerald-500" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Payment Successful!</h1>
          <p className="text-muted-foreground">
            <span className="font-medium text-foreground">{listing.title}</span>{" "}
            has been upgraded to a featured listing.
          </p>
        </div>
        <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground space-y-2">
          <p>Your listing now has:</p>
          <ul className="space-y-1.5 text-left">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
              Featured badge displayed
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
              Priority ranking in search
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
              Highlighted listing display
            </li>
          </ul>
        </div>
        <Button asChild className="gap-2">
          <Link href="/dashboard/listings">
            <ArrowLeft className="h-4 w-4" />
            Back to Listings
          </Link>
        </Button>
        <p className="text-xs text-muted-foreground">
          Redirecting automatically in a few seconds…
        </p>
      </div>
    </div>
  );
}

// ─── Main Page Component ─────────────────────────────────────────────────────

export function CheckoutPage({ listing, product }: CheckoutPageProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [initError, setInitError] = useState("");
  const [isInitializing, setIsInitializing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const hasInitialized = useRef(false);

  const initializePayment = useCallback(async () => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;
    setIsInitializing(true);
    setInitError("");

    try {
      const res = await fetch("/api/stripe/create-payment-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId: listing.id, productId: product.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setInitError(data.error ?? "Failed to initialize checkout");
        return;
      }
      setClientSecret(data.clientSecret);
      setPaymentId(data.paymentId);
    } catch {
      setInitError("Network error. Please try again.");
    } finally {
      setIsInitializing(false);
    }
  }, [listing.id, product.id]);

  useEffect(() => {
    initializePayment();
  }, [initializePayment]);

  if (showSuccess) {
    return <SuccessView listing={listing} />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="mx-auto max-w-5xl flex items-center justify-between h-14 px-4 sm:px-6">
          <Link href="/dashboard/listings" className="flex items-center gap-2">
            <Image
              src="https://g44yi0ry58orcc8h.public.blob.vercel-storage.com/Salebizsvg.svg"
              alt="Salebiz"
              width={100}
              height={28}
              className="h-6 w-auto"
            />
          </Link>
          <Link
            href="/dashboard/listings"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to listings
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-5xl px-4 sm:px-6 py-8 sm:py-12">
        <div className="grid gap-8 lg:grid-cols-5 lg:gap-12">
          {/* Left: Order Summary */}
          <div className="lg:col-span-2 order-2 lg:order-1">
            <div className="lg:sticky lg:top-24 space-y-6">
              {/* Product card */}
              <div className="rounded-xl border bg-card p-5 space-y-4">
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Order Summary
                </h2>
                <Separator />
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Listing</p>
                    <p className="text-sm font-medium mt-0.5 line-clamp-2">
                      {listing.title}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Package</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                      <p className="text-sm font-medium">{product.name}</p>
                    </div>
                    {product.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {product.description}
                      </p>
                    )}
                  </div>
                  {product.duration_days && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      <span>{product.duration_days} days of featured visibility</span>
                    </div>
                  )}
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Total</span>
                  <span className="text-xl font-bold">
                    {formatPrice(product.price, product.currency)}
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground text-right">
                  One-time payment in {product.currency.toUpperCase()} · No recurring charges
                </p>
              </div>

              {/* Benefits */}
              <div className="rounded-xl border bg-primary/[0.02] dark:bg-primary/[0.04] p-5 space-y-3">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  What you get
                </h3>
                <ul className="space-y-2.5">
                  <li className="flex items-start gap-2.5 text-sm">
                    <BadgeCheck className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium">Featured Badge</p>
                      <p className="text-xs text-muted-foreground">
                        Stand out with a prominent badge on your listing
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start gap-2.5 text-sm">
                    <Search className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium">Priority Ranking</p>
                      <p className="text-xs text-muted-foreground">
                        Appear first in search results and homepage
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start gap-2.5 text-sm">
                    <Sparkles className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium">Enhanced Visibility</p>
                      <p className="text-xs text-muted-foreground">
                        Highlighted display to attract more buyers
                      </p>
                    </div>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Right: Payment Form */}
          <div className="lg:col-span-3 order-1 lg:order-2">
            <div className="rounded-xl border bg-card p-5 sm:p-7">
              <h1 className="text-lg font-semibold mb-1">Secure Checkout</h1>
              <p className="text-sm text-muted-foreground mb-6">
                Complete your payment to feature your listing
              </p>

              {isInitializing ? (
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
                    <p className="text-xs text-muted-foreground">
                      {initError}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link href="/dashboard/listings">Go back</Link>
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        hasInitialized.current = false;
                        initializePayment();
                      }}
                    >
                      Try again
                    </Button>
                  </div>
                </div>
              ) : clientSecret && paymentId ? (
                <Elements
                  stripe={stripePromise}
                  options={{
                    clientSecret,
                    fonts: [
                      {
                        cssSrc: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap",
                      },
                    ],
                    appearance: {
                      theme: "stripe",
                      variables: {
                        colorPrimary: "hsl(142, 71%, 30%)",
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
                          border: "1px solid hsl(142, 71%, 30%)",
                          boxShadow:
                            "0 0 0 3px hsla(142, 71%, 30%, 0.15)",
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
                          borderColor: "hsl(142, 71%, 30%)",
                          boxShadow: "0 0 0 1px hsl(142, 71%, 30%)",
                        },
                      },
                    },
                  }}
                >
                  <PaymentForm
                    product={product}
                    paymentId={paymentId}
                    onSuccess={() => setShowSuccess(true)}
                  />
                </Elements>
              ) : null}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
