"use client";

import { useState, useEffect, useRef } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import ReCAPTCHA from "react-google-recaptcha";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { verifyLoginCaptcha } from "@/lib/actions/auth";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

type FormData = z.infer<typeof schema>;

const RECAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY ?? "";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";
  const [error, setError] = useState<string | null>(null);
  const recaptchaRef = useRef<ReCAPTCHA>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (searchParams.get("verified") === "1") {
      toast.success("Email verified. You can now sign in.");
    }
  }, [searchParams]);

  async function onSubmit(data: FormData) {
    setError(null);
    const captchaToken = recaptchaRef.current?.getValue();
    if (!captchaToken) {
      setError("Please complete the CAPTCHA.");
      toast.error("Please complete the CAPTCHA.");
      return;
    }
    const captchaOk = await verifyLoginCaptcha(captchaToken);
    if (!captchaOk) {
      recaptchaRef.current?.reset();
      setError("CAPTCHA verification failed. Please try again.");
      toast.error("CAPTCHA verification failed. Please try again.");
      return;
    }
    const res = await signIn("credentials", {
      email: data.email,
      password: data.password,
      redirect: false,
    });
    recaptchaRef.current?.reset();
    if (res?.error) {
      const message =
        res.error === "CredentialsSignin"
          ? "Invalid email or password. If you just signed up, verify your email first."
          : "Invalid email or password.";
      setError(message);
      toast.error(message);
      return;
    }
    if (res?.ok) {
      toast.success("Signed in successfully.");
      router.push(callbackUrl);
      router.refresh();
      return;
    }
    setError("Something went wrong. Please try again.");
    toast.error("Something went wrong. Please try again.");
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-bold">Welcome back</h1>
        <p className="text-sm text-muted-foreground">
          Login to your Salebiz account
        </p>
      </div>

      {error && (
        <p className="text-sm text-destructive text-center">{error}</p>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="m@example.com"
            className={errors.email ? "border-destructive" : ""}
            {...register("email")}
          />
          {errors.email && (
            <p className="text-xs text-destructive">{errors.email.message}</p>
          )}
        </div>

        <div className="grid gap-2">
          <div className="flex items-center">
            <Label htmlFor="password">Password</Label>
            <Link
              href="/auth/reset"
              className="ml-auto text-sm underline-offset-4 hover:underline"
            >
              Forgot your password?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            className={errors.password ? "border-destructive" : ""}
            {...register("password")}
          />
          {errors.password && (
            <p className="text-xs text-destructive">{errors.password.message}</p>
          )}
        </div>

        {RECAPTCHA_SITE_KEY && (
          <div className="w-full" style={{ transform: "scaleX(1.22)", transformOrigin: "0 0" }}>
            <ReCAPTCHA ref={recaptchaRef} sitekey={RECAPTCHA_SITE_KEY} />
          </div>
        )}

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Signing in…
            </>
          ) : (
            "Login"
          )}
        </Button>
      </form>

      <div className="text-center text-sm">
        Don&apos;t have an account?{" "}
        <Link href="/auth/register" className="underline underline-offset-4 hover:text-primary">
          Sign up
        </Link>
      </div>
    </div>
  );
}
