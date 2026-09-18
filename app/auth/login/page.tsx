import { Suspense } from "react";
import { LoginForm } from "./login-form";
import { Skeleton } from "@/components/ui/skeleton";

/** Mirrors the real form's rhythm so nothing jumps when it hydrates. */
function LoginFallback() {
  return (
    <div className="grid gap-7" aria-hidden>
      <div className="grid gap-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-full max-w-xs" />
      </div>
      <Skeleton className="h-11 w-full rounded-xl" />
      <div className="grid gap-5">
        <Skeleton className="h-[4.25rem] w-full" />
        <Skeleton className="h-[4.25rem] w-full" />
        <Skeleton className="h-11 w-full" />
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginForm />
    </Suspense>
  );
}
