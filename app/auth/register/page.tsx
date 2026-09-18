"use client";

import { useState, useRef, Suspense } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import ReCAPTCHA from "react-google-recaptcha";
import { Button } from "@/components/ui/button";
import { RoleSwitch, type AuthRole } from "@/components/auth/role-switch";
import { AuthField, AuthPasswordField } from "@/components/auth/auth-field";
import {
  AuthError,
  AuthFootLink,
  AuthHeader,
  AuthOutcome,
} from "@/components/auth/auth-shell";
import { register as registerAction, registerBuyer } from "@/lib/actions/auth";
import { trackSignUpConversion } from "@/lib/analytics/conversions";
import { Loader2, MailOpen, ArrowRight, LifeBuoy } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";

// ── Schema ──
// One schema for both roles. `company` is required only for brokers, which the
// superRefine below enforces, so the two forms stay a single code path.

const schema = z
  .object({
    role: z.enum(["buyer", "broker"]),
    name: z.string().min(1, "Enter your full name").max(100),
    company: z.string().max(200).optional(),
    email: z.string().email("Enter a valid email address"),
    password: z.string().min(8, "Use at least 8 characters"),
  })
  .superRefine((data, ctx) => {
    if (data.role === "broker" && !data.company?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Enter your agency or company name",
        path: ["company"],
      });
    }
  });

type FormData = z.infer<typeof schema>;

const RECAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY ?? "";

export default function RegisterPage() {
  return (
    <Suspense fallback={<RegisterFallback />}>
      <RegisterForm />
    </Suspense>
  );
}

/** Matches the real form's rhythm so nothing jumps when it hydrates. */
function RegisterFallback() {
  return (
    <div className="grid gap-7" aria-hidden>
      <div className="grid gap-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-full max-w-xs" />
      </div>
      <Skeleton className="h-11 w-full rounded-xl" />
      <div className="grid gap-5">
        <Skeleton className="h-[4.25rem] w-full" />
        <Skeleton className="h-[4.25rem] w-full" />
        <Skeleton className="h-[4.25rem] w-full" />
        <Skeleton className="h-11 w-full" />
      </div>
    </div>
  );
}

function RegisterForm() {
  const searchParams = useSearchParams();
  const initialRole: AuthRole =
    searchParams.get("tab") === "buyer" ? "buyer" : "broker";

  const [role, setRole] = useState<AuthRole>(initialRole);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recaptchaRef = useRef<ReCAPTCHA>(null);

  const {
    register,
    handleSubmit,
    setValue,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { role: initialRole },
  });

  function handleRoleChange(next: AuthRole) {
    setRole(next);
    setValue("role", next);
    setError(null);
    // The agency field disappears for buyers — drop any error it left behind.
    clearErrors("company");
  }

  async function onSubmit(data: FormData) {
    setError(null);

    const captchaToken = recaptchaRef.current?.getValue();
    if (RECAPTCHA_SITE_KEY && !captchaToken) {
      const message = "Confirm you're not a robot to continue.";
      setError(message);
      toast.error(message);
      return;
    }

    const formData = new FormData();
    formData.set("email", data.email);
    formData.set("password", data.password);
    formData.set("name", data.name);
    formData.set("captchaToken", captchaToken ?? "");
    if (data.role === "broker") formData.set("company", data.company ?? "");

    const result =
      data.role === "broker"
        ? await registerAction(formData)
        : await registerBuyer(formData);

    recaptchaRef.current?.reset();

    if (result.ok) {
      // Report the conversion only once the server confirms the account was
      // created. Registration never navigates, so a URL-based Ads conversion
      // cannot see this moment — see lib/analytics/conversions.ts.
      trackSignUpConversion(data.role);
      setSubmitted(true);
      toast.success("Account created. Check your email to verify.");
      return;
    }
    setError(result.error);
    toast.error(result.error);
  }

  if (submitted) {
    return (
      <AuthOutcome
        icon={MailOpen}
        title="Check your email"
        description="We sent a verification link to your inbox. Open it to activate your account, then sign in. It can take a minute to arrive — check spam if you don't see it."
        action={{
          href: `/auth/login?tab=${role}`,
          label: (
            <>
              Go to sign in
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
            </>
          ),
        }}
      />
    );
  }

  const isBroker = role === "broker";

  return (
    <div className="grid gap-7">
      <AuthHeader
        title="Create your account"
        description={
          isBroker
            ? "List businesses for sale, manage enquiries, and grow your agency."
            : "Save listings, compare businesses, sign NDAs, and access documents."
        }
      />

      <RoleSwitch value={role} onChange={handleRoleChange} />

      {error && <AuthError>{error}</AuthError>}

      <form
        onSubmit={(event) => {
          void handleSubmit(onSubmit)(event);
        }}
        className="grid gap-5"
        noValidate
      >
        <input type="hidden" {...register("role")} value={role} readOnly />

        <AuthField
          label="Full name"
          id="name"
          type="text"
          autoComplete="name"
          placeholder="Jane Smith"
          error={errors.name?.message}
          {...register("name")}
        />

        {isBroker && (
          <AuthField
            label="Agency name"
            id="company"
            type="text"
            autoComplete="organization"
            placeholder="Your agency or company"
            error={errors.company?.message}
            {...register("company")}
          />
        )}

        <AuthField
          label="Email"
          id="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          error={errors.email?.message}
          {...register("email")}
        />

        <AuthPasswordField
          label="Password"
          id="password"
          autoComplete="new-password"
          placeholder="At least 8 characters"
          error={errors.password?.message}
          hint="Use at least 8 characters."
          {...register("password")}
        />

        {RECAPTCHA_SITE_KEY && (
          <div className="flex justify-center">
            <ReCAPTCHA ref={recaptchaRef} sitekey={RECAPTCHA_SITE_KEY} />
          </div>
        )}

        <Button
          type="submit"
          size="lg"
          className="h-11 w-full cursor-pointer"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
              Creating account…
            </>
          ) : isBroker ? (
            "Create agency account"
          ) : (
            "Create buyer account"
          )}
        </Button>

        <p className="text-muted-foreground -mt-1 text-center text-xs leading-relaxed">
          By creating an account you agree to our{" "}
          <a
            href="/terms"
            className="hover:text-foreground underline underline-offset-2 transition-colors"
          >
            Terms
          </a>{" "}
          and{" "}
          <a
            href="/privacy"
            className="hover:text-foreground underline underline-offset-2 transition-colors"
          >
            Privacy Policy
          </a>
          .
        </p>
      </form>

      {/* Managed-onboarding escape hatch — shown to brokers, who are the ones
          facing a setup job. Buyers have nothing to onboard. */}
      {isBroker && (
        <Link
          href="/broker-onboarding"
          className="group border-border/70 hover:border-border hover:bg-muted/40 focus-visible:ring-ring/60 -mt-1 flex items-start gap-3 rounded-xl border p-4 transition-colors outline-none focus-visible:ring-2"
        >
          <span
            className="bg-primary/10 text-primary mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
            aria-hidden
          >
            <LifeBuoy className="h-4 w-4" />
          </span>
          <span className="min-w-0">
            <span className="text-foreground block text-sm font-medium">
              Prefer we set it up for you?
            </span>
            <span className="text-muted-foreground mt-0.5 block text-xs leading-relaxed">
              Our team will onboard your agency and load your listings.
            </span>
          </span>
          <ArrowRight
            className="text-muted-foreground group-hover:text-foreground mt-1 h-4 w-4 shrink-0 transition-colors"
            aria-hidden
          />
        </Link>
      )}

      <AuthFootLink
        prompt="Already have an account?"
        href={`/auth/login?tab=${role}`}
        label="Sign in"
      />
    </div>
  );
}
