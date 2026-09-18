"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AuthField, AuthPasswordField } from "@/components/auth/auth-field";
import {
  AuthError,
  AuthFootLink,
  AuthHeader,
  AuthOutcome,
} from "@/components/auth/auth-shell";
import {
  requestPasswordReset,
  resetPasswordWithToken,
} from "@/lib/actions/auth";
import {
  Loader2,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  MailOpen,
} from "lucide-react";

const requestSchema = z.object({
  email: z.string().email("Enter a valid email address"),
});

const resetSchema = z
  .object({
    password: z.string().min(8, "Use at least 8 characters"),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: "Passwords do not match",
    path: ["confirm"],
  });

type RequestForm = z.infer<typeof requestSchema>;
type ResetForm = z.infer<typeof resetSchema>;

function ResetFormInner() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [requestSent, setRequestSent] = useState(false);
  const [resetDone, setResetDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestForm = useForm<RequestForm>({
    resolver: zodResolver(requestSchema),
  });
  const resetForm = useForm<ResetForm>({
    resolver: zodResolver(resetSchema),
  });

  async function onRequestSubmit(data: RequestForm) {
    setError(null);
    const formData = new FormData();
    formData.set("email", data.email);
    const ok = await requestPasswordReset(formData);
    if (ok) {
      setRequestSent(true);
      toast.success("If an account exists, we sent a reset link to your email.");
    } else {
      setError("Something went wrong. Please try again.");
      toast.error("Something went wrong. Please try again.");
    }
  }

  async function onResetSubmit(data: ResetForm) {
    if (!token) return;
    setError(null);
    const result = await resetPasswordWithToken(token, data.password);
    if (result.ok) {
      setResetDone(true);
      toast.success("Password updated. You can sign in now.");
    } else {
      setError(result.error ?? "Something went wrong.");
      toast.error(result.error ?? "Something went wrong.");
    }
  }

  /* ── Password reset succeeded ── */
  if (resetDone) {
    return (
      <AuthOutcome
        icon={CheckCircle2}
        title="Password updated"
        description="Your password has been reset. You can now sign in with your new password."
        action={{
          href: "/auth/login",
          label: (
            <>
              Sign in
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
            </>
          ),
        }}
      />
    );
  }

  /* ── Set a new password (arrived with a token) ── */
  if (token) {
    return (
      <div className="grid gap-7">
        <AuthHeader
          title="Set a new password"
          description="Choose a new password for your Salebiz account."
        />

        {error && <AuthError>{error}</AuthError>}

        <form
          onSubmit={resetForm.handleSubmit(onResetSubmit)}
          className="grid gap-5"
          noValidate
        >
          <AuthPasswordField
            label="New password"
            id="password"
            autoComplete="new-password"
            placeholder="At least 8 characters"
            error={resetForm.formState.errors.password?.message}
            {...resetForm.register("password")}
          />
          <AuthPasswordField
            label="Confirm new password"
            id="confirm"
            autoComplete="new-password"
            placeholder="Repeat your new password"
            error={resetForm.formState.errors.confirm?.message}
            {...resetForm.register("confirm")}
          />
          <Button
            type="submit"
            size="lg"
            className="h-11 w-full cursor-pointer"
            disabled={resetForm.formState.isSubmitting}
          >
            {resetForm.formState.isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                Updating…
              </>
            ) : (
              <>
                Update password
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
              </>
            )}
          </Button>
        </form>
      </div>
    );
  }

  /* ── Reset link sent ── */
  if (requestSent) {
    return (
      <AuthOutcome
        icon={MailOpen}
        title="Check your email"
        description="If an account exists for that address, we've sent a password reset link. Check your inbox and your spam folder."
        action={{
          href: "/auth/login",
          label: (
            <>
              <ArrowLeft className="mr-2 h-4 w-4" aria-hidden />
              Back to sign in
            </>
          ),
        }}
      />
    );
  }

  /* ── Request a reset link ── */
  return (
    <div className="grid gap-7">
      <AuthHeader
        title="Forgot your password?"
        description="Enter the email on your account and we'll send you a link to set a new password."
      />

      {error && <AuthError>{error}</AuthError>}

      <form
        onSubmit={requestForm.handleSubmit(onRequestSubmit)}
        className="grid gap-5"
        noValidate
      >
        <AuthField
          label="Email"
          id="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          error={requestForm.formState.errors.email?.message}
          {...requestForm.register("email")}
        />
        <Button
          type="submit"
          size="lg"
          className="h-11 w-full cursor-pointer"
          disabled={requestForm.formState.isSubmitting}
        >
          {requestForm.formState.isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
              Sending link…
            </>
          ) : (
            <>
              Send reset link
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
            </>
          )}
        </Button>
      </form>

      <AuthFootLink
        prompt="Remembered it?"
        href="/auth/login"
        label="Back to sign in"
      />
    </div>
  );
}

function ResetFallback() {
  return (
    <div className="grid gap-7" aria-hidden>
      <div className="grid gap-2">
        <Skeleton className="h-8 w-60" />
        <Skeleton className="h-4 w-full max-w-sm" />
      </div>
      <Skeleton className="h-[4.25rem] w-full" />
      <Skeleton className="h-11 w-full" />
    </div>
  );
}

export default function ResetPage() {
  return (
    <Suspense fallback={<ResetFallback />}>
      <ResetFormInner />
    </Suspense>
  );
}
