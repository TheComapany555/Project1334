"use client";

import { useEffect, useState, Suspense } from "react";
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
  validateSetPasswordToken,
  setPasswordWithToken,
  type SetPasswordTokenInfo,
} from "@/lib/actions/auth";
import {
  Loader2,
  AlertCircle,
  Lock,
  ArrowRight,
  CheckCircle2,
  Building2,
  XCircle,
} from "lucide-react";

const schema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters"),
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

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-14">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!token || !info) {
    return (
      <Card>
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <div className="h-14 w-14 rounded-full bg-destructive/10 flex items-center justify-center">
              <XCircle className="h-7 w-7 text-destructive" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Invalid link</CardTitle>
          <CardDescription className="leading-relaxed max-w-xs mx-auto">
            This password-setup link is invalid or has already been used. Ask the person who created your account to send a fresh one.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground">
            <Link href="/auth/login">
              Go to sign in
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (info.expired) {
    return (
      <Card>
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <div className="h-14 w-14 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <AlertCircle className="h-7 w-7 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Link expired</CardTitle>
          <CardDescription className="leading-relaxed max-w-xs mx-auto">
            Your set-password link has expired. You can request a new one by using <strong>Forgot password</strong> on the sign-in page.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button asChild className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground">
            <Link href="/auth/reset">
              Reset password
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" className="w-full h-11">
            <Link href="/auth/login">Back to sign in</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (success) {
    return (
      <Card>
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
              <CheckCircle2 className="h-7 w-7 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Password set</CardTitle>
          <CardDescription className="leading-relaxed max-w-xs mx-auto">
            Your password has been saved. Sign in to get started.
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl font-bold tracking-tight">Set your password</CardTitle>
        <CardDescription>
          Your account is ready. Choose a password to sign in.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Account info badge */}
        <div className="flex items-center gap-3 rounded-lg border bg-muted/50 px-4 py-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Building2 className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">
              {info.name ?? info.email}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {info.agencyName ? `${info.agencyName} · ${info.email}` : info.email}
            </p>
          </div>
        </div>

        {error && (
          <Alert variant="destructive" className="border-destructive/40 bg-destructive/5 text-destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-sm font-medium">Password</Label>
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

          <div className="space-y-1.5">
            <Label htmlFor="confirm" className="text-sm font-medium">Confirm password</Label>
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

          <Button
            type="submit"
            className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm mt-2"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : (
              <>
                Set password &amp; continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default function SetPasswordPage() {
  return (
    <Suspense
      fallback={
        <Card>
          <CardContent className="flex items-center justify-center py-14">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      }
    >
      <SetPasswordInner />
    </Suspense>
  );
}
