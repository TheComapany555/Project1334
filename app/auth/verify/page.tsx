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

type Props = { searchParams: Promise<{ token?: string }> };

export default async function VerifyPage({ searchParams }: Props) {
  const { token } = await searchParams;
  if (!token) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Invalid link</CardTitle>
          <CardDescription>
            This verification link is invalid or has expired.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/auth/login">Go to sign in</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const result = await verifyEmailToken(token);
  if (!result.ok) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Verification failed</CardTitle>
          <CardDescription>{result.error}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/auth/login">Go to sign in</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  redirect("/auth/login?verified=1");
}
