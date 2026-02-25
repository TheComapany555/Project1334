import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { HugeiconsIcon } from "@hugeicons/react";
import { LockIcon } from "@hugeicons/core-free-icons";

export default function ForbiddenPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4 py-8">
      <Card className="max-w-md w-full shadow-lg text-center sm:text-left">
        <CardHeader className="space-y-3">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 sm:mx-0">
            <HugeiconsIcon icon={LockIcon} className="size-7 text-destructive" />
          </div>
          <CardTitle className="text-xl">Access denied</CardTitle>
          <CardDescription className="text-base">
            You do not have permission to view this page. Return home or sign in with a different account.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 sm:flex-row">
          <Button asChild size="lg" className="w-full sm:w-auto">
            <Link href="/">Go to home</Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
            <Link href="/auth/login">Sign in</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
