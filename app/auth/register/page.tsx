"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import ReCAPTCHA from "react-google-recaptcha";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { register as registerAction } from "@/lib/actions/auth";
import {
  Loader2,
  AlertCircle,
  Mail,
  Lock,
  User,
  Building2,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

const schema = z
  .object({
    name: z.string().min(1, "Name is required").max(100),
    company: z.string().min(1, "Agency / company name is required").max(200),
    email: z.string().email("Enter a valid email"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirm: z.string(),
  })
  .refine((data) => data.password === data.confirm, {
    message: "Passwords do not match",
    path: ["confirm"],
  });

type FormData = z.infer<typeof schema>;

const RECAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY ?? "";

export default function RegisterPage() {
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recaptchaRef = useRef<ReCAPTCHA>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormData) {
    setError(null);
    const captchaToken = recaptchaRef.current?.getValue();
    if (!captchaToken) {
      setError("Please complete the CAPTCHA.");
      toast.error("Please complete the CAPTCHA.");
      return;
    }
    const formData = new FormData();
    formData.set("email", data.email);
    formData.set("password", data.password);
    formData.set("name", data.name);
    formData.set("company", data.company);
    formData.set("captchaToken", captchaToken);
    const result = await registerAction(formData);
    recaptchaRef.current?.reset();
    if (result.ok) {
      setSuccess(true);
      toast.success("Account created. Check your email to verify.");
      return;
    }
    setError(result.error);
    toast.error(result.error);
  }

  /* ── Success state ── */
  if (success) {
    return (
      <Card>
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
              <CheckCircle2 className="h-7 w-7 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Check your email</CardTitle>
          <CardDescription className="leading-relaxed max-w-xs mx-auto">
            We sent a verification link to your email. Click it to verify your
            account, then sign in.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            asChild
            className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
          >
            <Link href="/auth/login">
              Go to sign in
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  /* ── Register form ── */
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl font-bold tracking-tight">Create an account</CardTitle>
        <CardDescription>Register your agency on Salebiz.com.au</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Error alert */}
        {error && (
          <Alert
            variant="destructive"
            className="border-destructive/40 bg-destructive/5 text-destructive"
          >
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">{error}</AlertDescription>
          </Alert>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-sm font-medium">
              Full name
            </Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                id="name"
                type="text"
                autoComplete="name"
                placeholder="Jane Smith"
                className={`pl-9 h-11 ${errors.name ? "border-destructive focus-visible:ring-destructive" : ""}`}
                {...register("name")}
              />
            </div>
            {errors.name && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.name.message}
              </p>
            )}
          </div>

          {/* Company / Agency name */}
          <div className="space-y-1.5">
            <Label htmlFor="company" className="text-sm font-medium">
              Agency / company name
            </Label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                id="company"
                type="text"
                autoComplete="organization"
                placeholder="Your business or agency name"
                className={`pl-9 h-11 ${errors.company ? "border-destructive focus-visible:ring-destructive" : ""}`}
                {...register("company")}
              />
            </div>
            {errors.company && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.company.message}
              </p>
            )}
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-sm font-medium">
              Email address
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                className={`pl-9 h-11 ${errors.email ? "border-destructive focus-visible:ring-destructive" : ""}`}
                {...register("email")}
              />
            </div>
            {errors.email && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.email.message}
              </p>
            )}
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-sm font-medium">
              Password
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                placeholder="At least 8 characters"
                className={`pl-9 h-11 ${errors.password ? "border-destructive focus-visible:ring-destructive" : ""}`}
                {...register("password")}
              />
            </div>
            {errors.password && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.password.message}
              </p>
            )}
          </div>

          {/* Confirm password */}
          <div className="space-y-1.5">
            <Label htmlFor="confirm" className="text-sm font-medium">
              Confirm password
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                id="confirm"
                type="password"
                autoComplete="new-password"
                placeholder="Repeat password"
                className={`pl-9 h-11 ${errors.confirm ? "border-destructive focus-visible:ring-destructive" : ""}`}
                {...register("confirm")}
              />
            </div>
            {errors.confirm && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.confirm.message}
              </p>
            )}
          </div>

          {/* reCAPTCHA */}
          {RECAPTCHA_SITE_KEY && (
            <div className="flex justify-center">
              <ReCAPTCHA ref={recaptchaRef} sitekey={RECAPTCHA_SITE_KEY} />
            </div>
          )}

          {/* Submit */}
          <Button
            type="submit"
            className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm mt-2"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating account…
              </>
            ) : (
              <>
                Create account
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </form>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-card px-3 text-xs text-muted-foreground">
              Already have an account?
            </span>
          </div>
        </div>

        {/* Sign in CTA */}
        <Button asChild variant="outline" className="w-full h-11">
          <Link href="/auth/login">Sign in instead</Link>
        </Button>
      </CardContent>
    </Card>
  );
}