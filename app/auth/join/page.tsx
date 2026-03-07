"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
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
  validateInvitationToken,
  acceptInvitation,
  type InvitationInfo,
} from "@/lib/actions/auth";
import {
  Loader2,
  AlertCircle,
  User,
  Lock,
  ArrowRight,
  CheckCircle2,
  Building2,
  XCircle,
} from "lucide-react";

const schema = z
  .object({
    name: z.string().min(1, "Name is required").max(100),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirm: z.string(),
  })
  .refine((data) => data.password === data.confirm, {
    message: "Passwords do not match",
    path: ["confirm"],
  });

type FormData = z.infer<typeof schema>;

export default function JoinPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState<InvitationInfo | null>(null);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
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
      toast.success("Account created! You can now sign in.");
      return;
    }
    setError(result.error);
    toast.error(result.error);
  }

  // Loading state
  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-14">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // Invalid or missing token
  if (!token || !info) {
    return (
      <Card>
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <div className="h-14 w-14 rounded-full bg-destructive/10 flex items-center justify-center">
              <XCircle className="h-7 w-7 text-destructive" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">
            Invalid Invitation
          </CardTitle>
          <CardDescription className="leading-relaxed max-w-xs mx-auto">
            This invitation link is invalid or has already been used. Please ask
            the agency owner to send a new invitation.
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

  // Expired invitation
  if (info.expired) {
    return (
      <Card>
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <div className="h-14 w-14 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <AlertCircle className="h-7 w-7 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">
            Invitation Expired
          </CardTitle>
          <CardDescription className="leading-relaxed max-w-xs mx-auto">
            This invitation to join <strong>{info.agencyName}</strong> has
            expired. Please ask the agency owner to resend the invitation.
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

  // Success state
  if (success) {
    return (
      <Card>
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
              <CheckCircle2 className="h-7 w-7 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">
            You&apos;re all set!
          </CardTitle>
          <CardDescription className="leading-relaxed max-w-xs mx-auto">
            Your account has been created and you&apos;ve joined{" "}
            <strong>{info.agencyName}</strong>. Sign in to start managing
            listings.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            asChild
            className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
          >
            <Link href="/auth/login">
              Sign in
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Join form
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl font-bold tracking-tight">
          Join {info.agencyName}
        </CardTitle>
        <CardDescription>
          {info.inviterName ? (
            <>
              <strong>{info.inviterName}</strong> invited you to join as a broker
            </>
          ) : (
            <>You&apos;ve been invited to join as a broker</>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Agency badge */}
        <div className="flex items-center gap-3 rounded-lg border bg-muted/50 px-4 py-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Building2 className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{info.agencyName}</p>
            <p className="text-xs text-muted-foreground truncate">
              {info.email}
            </p>
          </div>
        </div>

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
                Join & create account
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </form>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border/60" />
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
