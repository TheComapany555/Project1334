"use client";

import { useState, useEffect, useRef } from "react";
import { signIn, getSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
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
} from "@/components/auth/auth-shell";
import { Loader2, Clock } from "lucide-react";
import {
  verifyLoginCaptcha,
  checkBrokerPendingApproval,
} from "@/lib/actions/auth";
import { AuthOutcome } from "@/components/auth/auth-shell";
import { trackEmailVerified } from "@/lib/analytics/conversions";

const schema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password"),
});

type FormData = z.infer<typeof schema>;

const RECAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY ?? "";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/search";
  const initialRole: AuthRole =
    searchParams.get("tab") === "broker" ? "broker" : "buyer";

  const [role, setRole] = useState<AuthRole>(initialRole);
  const [error, setError] = useState<string | null>(null);
  const [awaitingApproval, setAwaitingApproval] = useState(false);
  const recaptchaRef = useRef<ReCAPTCHA>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (searchParams.get("verified") === "1") {
      toast.success("Email verified. You can now sign in.");
      // /auth/verify is a server component that redirects here, so this is the
      // first client render after a successful verification.
      trackEmailVerified();
    }
  }, [searchParams]);

  async function onSubmit(data: FormData) {
    setError(null);

    const captchaToken = recaptchaRef.current?.getValue();
    if (RECAPTCHA_SITE_KEY) {
      if (!captchaToken) {
        const message = "Confirm you're not a robot to continue.";
        setError(message);
        toast.error(message);
        return;
      }
      const captchaOk = await verifyLoginCaptcha(captchaToken);
      if (!captchaOk) {
        recaptchaRef.current?.reset();
        const message = "That check didn't go through. Please try again.";
        setError(message);
        toast.error(message);
        return;
      }
    }

    const res = await signIn("credentials", {
      email: data.email,
      password: data.password,
      redirect: false,
    });
    recaptchaRef.current?.reset();

    if (res?.error) {
      // `authorize` returns null both for bad credentials and for a broker whose
      // agency is still awaiting approval. Ask the server which it was so a
      // queued broker isn't told their password is wrong.
      const { pending } = await checkBrokerPendingApproval(
        data.email,
        data.password,
      );
      if (pending) {
        setAwaitingApproval(true);
        return;
      }

      const message =
        res.error === "CredentialsSignin"
          ? "That email and password don't match. If you just signed up, verify your email first."
          : "That email and password don't match.";
      setError(message);
      toast.error(message);
      return;
    }

    if (res?.ok) {
      toast.success("Signed in successfully.");
      // Route on the session's real role, never on the selected segment.
      const session = await getSession();
      const sessionRole = session?.user?.role;
      let redirect: string;
      if (sessionRole === "admin") {
        redirect = searchParams.get("callbackUrl") ?? "/admin";
      } else if (sessionRole === "broker") {
        redirect = searchParams.get("callbackUrl") ?? "/dashboard";
      } else {
        redirect = callbackUrl; // buyer → /search (or callbackUrl)
      }
      router.push(redirect);
      router.refresh();
      return;
    }

    setError("Something went wrong. Please try again.");
    toast.error("Something went wrong. Please try again.");
  }

  const isBroker = role === "broker";

  if (awaitingApproval) {
    return (
      <AuthOutcome
        icon={Clock}
        tone="warning"
        title="Your account is awaiting approval"
        description="Your email is verified and your agency is in our review queue. We check new agencies manually to keep the marketplace trustworthy — usually within one business day. We'll email you as soon as you're approved, and you can sign in straight away after that."
        action={{ href: "/broker-onboarding", label: "Need help getting set up?" }}
        secondaryAction={{ href: "/", label: "Back to home" }}
      />
    );
  }

  return (
    <div className="grid gap-7">
      <AuthHeader
        title="Welcome back"
        description={
          isBroker
            ? "Sign in to manage your listings, enquiries, and agency. Admin accounts use this option too."
            : "Sign in to save listings, compare businesses, and access documents."
        }
      />

      <RoleSwitch
        value={role}
        onChange={(next) => {
          setRole(next);
          setError(null);
        }}
      />

      {error && <AuthError>{error}</AuthError>}

      <form
        onSubmit={(event) => {
          void handleSubmit(onSubmit)(event);
        }}
        className="grid gap-5"
        noValidate
      >
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
          autoComplete="current-password"
          placeholder="Your password"
          error={errors.password?.message}
          labelAction={
            <Link
              href="/auth/reset"
              className="text-muted-foreground hover:text-foreground text-xs underline-offset-4 transition-colors hover:underline"
            >
              Forgot password?
            </Link>
          }
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
              Signing in…
            </>
          ) : (
            "Sign in"
          )}
        </Button>
      </form>

      <AuthFootLink
        prompt="Don't have an account?"
        href={`/auth/register?tab=${role}`}
        label={isBroker ? "Register your agency" : "Create a buyer account"}
      />
    </div>
  );
}
