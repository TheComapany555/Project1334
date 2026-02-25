"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function AuthErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error") ?? "Something went wrong.";

  const message =
    error === "CredentialsSignin"
      ? "Invalid email or password."
      : error === "EmailVerification"
        ? "Please verify your email before signing in."
        : "An error occurred during sign in.";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sign in error</CardTitle>
        <CardDescription>{message}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <Button asChild className="w-full">
          <Link href="/auth/login">Try again</Link>
        </Button>
        <Button asChild variant="outline" className="w-full">
          <Link href="/">Back to home</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
