import { Suspense } from "react";
import { AuthErrorContent } from "./error-content";
import { AuthPending } from "@/components/auth/auth-shell";

export default function AuthErrorPage() {
  return (
    <Suspense fallback={<AuthPending label="Loading" />}>
      <AuthErrorContent />
    </Suspense>
  );
}
