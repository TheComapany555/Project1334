"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import {
  requestPasswordReset,
  resetPasswordWithToken,
} from "@/lib/actions/auth";
import {
  Loader2,
  AlertCircle,
  Mail,
  Lock,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  MailOpen,
} from "lucide-react";

const requestSchema = z.object({
  email: z.string().email("Enter a valid email"),
});

const resetSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirm: z.string(),
}).refine((d) => d.password === d.confirm, {
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

  /* ── Password reset success ── */
  if (resetDone) {
    return (
      <Card>
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
              <CheckCircle2 className="h-7 w-7 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Password updated</CardTitle>
          <CardDescription>
            Your password has been reset successfully. You can now sign in with your new password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground">
            <Link href="/auth/login">
              Sign in
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  /* ── Set new password form (with token) ── */
  if (token) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold tracking-tight">Set new password</CardTitle>
          <CardDescription>Enter your new password below.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive" className="border-destructive/40 bg-destructive/5 text-destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">{error}</AlertDescription>
            </Alert>
          )}
          <form
            onSubmit={resetForm.handleSubmit(onResetSubmit)}
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-medium">New password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
                  className={`pl-9 h-11 ${resetForm.formState.errors.password ? "border-destructive focus-visible:ring-destructive" : ""}`}
                  {...resetForm.register("password")}
                />
              </div>
              {resetForm.formState.errors.password && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {resetForm.formState.errors.password.message}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm" className="text-sm font-medium">Confirm password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="confirm"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Repeat password"
                  className={`pl-9 h-11 ${resetForm.formState.errors.confirm ? "border-destructive focus-visible:ring-destructive" : ""}`}
                  {...resetForm.register("confirm")}
                />
              </div>
              {resetForm.formState.errors.confirm && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {resetForm.formState.errors.confirm.message}
                </p>
              )}
            </div>
            <Button
              type="submit"
              className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm mt-2"
              disabled={resetForm.formState.isSubmitting}
            >
              {resetForm.formState.isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating…
                </>
              ) : (
                <>
                  Update password
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    );
  }

  /* ── Check your email (request sent) ── */
  if (requestSent) {
    return (
      <Card>
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
              <MailOpen className="h-7 w-7 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Check your email</CardTitle>
          <CardDescription className="leading-relaxed">
            If an account exists for that email, we sent a password reset link.
            Check your inbox and spam folder.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline" className="w-full h-11">
            <Link href="/auth/login">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to sign in
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  /* ── Request reset form ── */
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl font-bold tracking-tight">Forgot password</CardTitle>
        <CardDescription>
          Enter your email and we&apos;ll send you a reset link.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive" className="border-destructive/40 bg-destructive/5 text-destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">{error}</AlertDescription>
          </Alert>
        )}
        <form
          onSubmit={requestForm.handleSubmit(onRequestSubmit)}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-sm font-medium">Email address</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                className={`pl-9 h-11 ${requestForm.formState.errors.email ? "border-destructive focus-visible:ring-destructive" : ""}`}
                {...requestForm.register("email")}
              />
            </div>
            {requestForm.formState.errors.email && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {requestForm.formState.errors.email.message}
              </p>
            )}
          </div>
          <Button
            type="submit"
            className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm mt-2"
            disabled={requestForm.formState.isSubmitting}
          >
            {requestForm.formState.isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending…
              </>
            ) : (
              <>
                Send reset link
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </form>
        <p className="text-center text-sm text-muted-foreground">
          <Link href="/auth/login" className="text-primary hover:underline inline-flex items-center gap-1">
            <ArrowLeft className="h-3 w-3" />
            Back to sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

export default function ResetPage() {
  return (
    <Suspense fallback={<Card><CardContent className="pt-6"><div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div></CardContent></Card>}>
      <ResetFormInner />
    </Suspense>
  );
}
