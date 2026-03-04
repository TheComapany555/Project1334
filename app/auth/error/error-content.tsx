"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
      ? "Invalid email or password."
      : error === "EmailVerification"
        ? "Please verify your email before signing in."
        : "An error occurred during sign in.";

  return (
    <Card>
      <CardHeader className="text-center">
        <div className="flex justify-center mb-2">
          <div className="h-14 w-14 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="h-7 w-7 text-destructive" />
          </div>
        </div>
        <CardTitle className="text-2xl font-bold tracking-tight">Sign in error</CardTitle>
        <CardDescription>{message}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <Button asChild className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground">
          <Link href="/auth/login">
            Try again
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
        <Button asChild variant="outline" className="w-full h-11">
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to home
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export function AuthErrorContent() {
  return (
    <Suspense fallback={<div className="text-muted-foreground">Loading…</div>}>
      <AuthErrorContentInner />
    </Suspense>
  );
}
