"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { AuthPasswordField } from "@/components/auth/auth-field";
import {
  AuthError,
  AuthHeader,
  AuthIdentity,
  AuthOutcome,
  AuthPending,
} from "@/components/auth/auth-shell";
import {
  validateSetPasswordToken,
  setPasswordWithToken,
  type SetPasswordTokenInfo,
} from "@/lib/actions/auth";
import {
  Loader2,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Building2,
  XCircle,
} from "lucide-react";

const schema = z
  .object({
    password: z.string().min(8, "Use at least 8 characters"),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: "Passwords do not match",
    path: ["confirm"],
  });

type FormData = z.infer<typeof schema>;

function SetPasswordInner() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [loading, setLoading] = useState<boolean>(!!token);
  const [info, setInfo] = useState<SetPasswordTokenInfo | null>(null);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (!token) return;
    validateSetPasswordToken(token).then((result) => {
      setInfo(result);
      setLoading(false);
    });
  }, [token]);

  async function onSubmit(data: FormData) {
    setError(null);
    const result = await setPasswordWithToken(token, data.password);
    if (result.ok) {
      setSuccess(true);
      toast.success("Password set. You can now sign in.");
      return;
    }
    setError(result.error ?? "Something went wrong.");
    toast.error(result.error ?? "Something went wrong.");
  }

  if (loading) return <AuthPending label="Checking your link" />;

  if (!token || !info) {
    return (
      <AuthOutcome
        icon={XCircle}
        tone="error"
        title="This link isn't valid"
        description="This password-setup link is invalid or has already been used. Ask whoever created your account to send a fresh one."
        action={{
          href: "/auth/login",
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

  if (info.expired) {
    return (
      <AuthOutcome
        icon={AlertCircle}
        tone="warning"
        title="This link has expired"
        description="Set-password links are short-lived. Request a new one from the sign-in page using “Forgot password”."
        action={{
          href: "/auth/reset",
          label: (
            <>
              Request a new link
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
            </>
          ),
        }}
        secondaryAction={{ href: "/auth/login", label: "Back to sign in" }}
      />
    );
  }

  if (success) {
    return (
      <AuthOutcome
        icon={CheckCircle2}
        title="Password set"
        description="Your password has been saved. Sign in to get started."
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

  return (
    <div className="grid gap-7">
      <AuthHeader
        title="Set your password"
        description="Your account is ready. Choose a password to sign in with."
      />

      <AuthIdentity
        icon={Building2}
        primary={info.name ?? info.email}
        secondary={
          info.agencyName ? `${info.agencyName} · ${info.email}` : info.email
        }
      />

      {error && <AuthError>{error}</AuthError>}

      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-5" noValidate>
        <AuthPasswordField
          label="Password"
          id="password"
          autoComplete="new-password"
          placeholder="At least 8 characters"
          error={errors.password?.message}
          {...register("password")}
        />
        <AuthPasswordField
          label="Confirm password"
          id="confirm"
          autoComplete="new-password"
          placeholder="Repeat your password"
          error={errors.confirm?.message}
          {...register("confirm")}
        />
        <Button
          type="submit"
          size="lg"
          className="h-11 w-full cursor-pointer"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
              Saving…
            </>
          ) : (
            <>
              Set password &amp; continue
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
            </>
          )}
        </Button>
      </form>
    </div>
  );
}

export default function SetPasswordPage() {
  return (
    <Suspense fallback={<AuthPending label="Loading" />}>
      <SetPasswordInner />
    </Suspense>
  );
}
