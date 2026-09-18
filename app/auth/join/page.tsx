"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { AuthField, AuthPasswordField } from "@/components/auth/auth-field";
import {
  AuthError,
  AuthHeader,
  AuthIdentity,
  AuthOutcome,
  AuthPending,
} from "@/components/auth/auth-shell";
import {
  validateInvitationToken,
  acceptInvitation,
  type InvitationInfo,
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
    name: z.string().min(1, "Enter your full name").max(100),
    password: z.string().min(8, "Use at least 8 characters"),
    confirm: z.string(),
  })
  .refine((data) => data.password === data.confirm, {
    message: "Passwords do not match",
    path: ["confirm"],
  });

type FormData = z.infer<typeof schema>;

function JoinInner() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  // No token means nothing to validate, so there is no loading phase at all.
  const [loading, setLoading] = useState(!!token);
  const [info, setInfo] = useState<InvitationInfo | null>(null);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (!token) return;
    validateInvitationToken(token).then((result) => {
      setInfo(result);
      setLoading(false);
    });
  }, [token]);

  async function onSubmit(data: FormData) {
    setError(null);
    const formData = new FormData();
    formData.set("name", data.name);
    formData.set("password", data.password);
    const result = await acceptInvitation(token, formData);
    if (result.ok) {
      setSuccess(true);
      toast.success("Account created. You can now sign in.");
      return;
    }
    setError(result.error);
    toast.error(result.error);
  }

  if (loading) return <AuthPending label="Checking your invitation" />;

  if (!token || !info) {
    return (
      <AuthOutcome
        icon={XCircle}
        tone="error"
        title="This invitation isn't valid"
        description="This invitation link is invalid or has already been used. Ask the agency owner to send you a new one."
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
        title="This invitation has expired"
        description={
          <>
            The invitation to join <strong>{info.agencyName}</strong> is no
            longer valid. Ask the agency owner to resend it.
          </>
        }
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

  if (success) {
    return (
      <AuthOutcome
        icon={CheckCircle2}
        title="You're all set"
        description={
          <>
            Your account is created and you&apos;ve joined{" "}
            <strong>{info.agencyName}</strong>. Sign in to start managing
            listings.
          </>
        }
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
        title={`Join ${info.agencyName}`}
        description={
          info.inviterName ? (
            <>
              <strong className="text-foreground font-medium">
                {info.inviterName}
              </strong>{" "}
              invited you to join as a broker.
            </>
          ) : (
            <>You&apos;ve been invited to join as a broker.</>
          )
        }
      />

      <AuthIdentity
        icon={Building2}
        primary={info.agencyName}
        secondary={info.email}
      />

      {error && <AuthError>{error}</AuthError>}

      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-5" noValidate>
        <AuthField
          label="Full name"
          id="name"
          type="text"
          autoComplete="name"
          placeholder="Jane Smith"
          error={errors.name?.message}
          {...register("name")}
        />
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
              Creating account…
            </>
          ) : (
            <>
              Create account &amp; join
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
            </>
          )}
        </Button>
      </form>
    </div>
  );
}

export default function JoinPage() {
  return (
    <Suspense fallback={<AuthPending label="Loading" />}>
      <JoinInner />
    </Suspense>
  );
}
