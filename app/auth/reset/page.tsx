"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
    if (ok) setRequestSent(true);
    else setError("Something went wrong. Please try again.");
  }

  async function onResetSubmit(data: ResetForm) {
    if (!token) return;
    setError(null);
    const result = await resetPasswordWithToken(token, data.password);
    if (result.ok) setResetDone(true);
    else setError(result.error ?? "Something went wrong.");
  }

  if (resetDone) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Password reset</CardTitle>
          <CardDescription>
            Your password has been updated. You can now sign in.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full">
            <Link href="/auth/login">Sign in</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (token) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Set new password</CardTitle>
          <CardDescription>Enter your new password below.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={resetForm.handleSubmit(onResetSubmit)}
            className="space-y-4"
          >
            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
            <div className="space-y-2">
              <Label htmlFor="password">New password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                {...resetForm.register("password")}
              />
              {resetForm.formState.errors.password && (
                <p className="text-sm text-destructive">
                  {resetForm.formState.errors.password.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm">Confirm password</Label>
              <Input
                id="confirm"
                type="password"
                autoComplete="new-password"
                {...resetForm.register("confirm")}
              />
              {resetForm.formState.errors.confirm && (
                <p className="text-sm text-destructive">
                  {resetForm.formState.errors.confirm.message}
                </p>
              )}
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={resetForm.formState.isSubmitting}
            >
              {resetForm.formState.isSubmitting ? "Updating…" : "Update password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    );
  }

  if (requestSent) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Check your email</CardTitle>
          <CardDescription>
            If an account exists for that email, we sent a password reset link.
            Check your inbox and spam folder.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline" className="w-full">
            <Link href="/auth/login">Back to sign in</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Forgot password</CardTitle>
        <CardDescription>
          Enter your email and we’ll send you a reset link.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={requestForm.handleSubmit(onRequestSubmit)}
          className="space-y-4"
        >
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              {...requestForm.register("email")}
            />
            {requestForm.formState.errors.email && (
              <p className="text-sm text-destructive">
                {requestForm.formState.errors.email.message}
              </p>
            )}
          </div>
          <Button
            type="submit"
            className="w-full"
            disabled={requestForm.formState.isSubmitting}
          >
            {requestForm.formState.isSubmitting ? "Sending…" : "Send reset link"}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          <Link href="/auth/login" className="text-primary hover:underline">
            Back to sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

export default function ResetPage() {
  return (
    <Suspense fallback={<Card><CardContent className="pt-6">Loading…</CardContent></Card>}>
      <ResetFormInner />
    </Suspense>
  );
}
