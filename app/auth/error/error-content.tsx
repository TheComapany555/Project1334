"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { AuthOutcome, AuthPending } from "@/components/auth/auth-shell";
import { AlertTriangle, ArrowRight, ArrowLeft } from "lucide-react";

function AuthErrorContentInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const error = searchParams.get("error") ?? "Something went wrong.";

  useEffect(() => {
    if (error === "EmailVerification") {
      signOut({ redirect: false }).then(() => router.refresh());
    }
  }, [error, router]);

  const message =
    error === "CredentialsSignin"
      ? "That email and password don't match. Check them and try again."
      : error === "EmailVerification"
        ? "Verify your email address before signing in. Check your inbox for the link we sent."
        : "Something went wrong while signing you in. Please try again.";

  return (
    <AuthOutcome
      icon={AlertTriangle}
      tone="error"
      title="We couldn't sign you in"
      description={message}
      action={{
        href: "/auth/login",
        label: (
          <>
            Try again
            <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
          </>
        ),
      }}
      secondaryAction={{
        href: "/",
        label: (
          <>
            <ArrowLeft className="mr-2 h-4 w-4" aria-hidden />
            Back to home
          </>
        ),
      }}
    />
  );
}

export function AuthErrorContent() {
  return (
    <Suspense fallback={<AuthPending label="Loading" />}>
      <AuthErrorContentInner />
    </Suspense>
  );
}
