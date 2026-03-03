import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { verifyEmailToken } from "@/lib/actions/auth";
import { AlertTriangle, ArrowRight, LinkIcon } from "lucide-react";

type Props = { searchParams: Promise<{ token?: string }> };

export default async function VerifyPage({ searchParams }: Props) {
  const { token } = await searchParams;
  if (!token) {
    return (
      <Card>
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <div className="h-14 w-14 rounded-full bg-destructive/10 flex items-center justify-center">
              <LinkIcon className="h-7 w-7 text-destructive" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Invalid link</CardTitle>
          <CardDescription>
            This verification link is invalid or has expired.
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

  const result = await verifyEmailToken(token);
  if (!result.ok) {
    return (
      <Card>
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <div className="h-14 w-14 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="h-7 w-7 text-destructive" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Verification failed</CardTitle>
          <CardDescription>{result.error}</CardDescription>
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

  redirect("/auth/login?verified=1");
}
