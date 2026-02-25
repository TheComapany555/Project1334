import { Suspense } from "react";
import { AuthErrorContent } from "./error-content";

export default function AuthErrorPage() {
  return (
    <Suspense fallback={<div className="text-muted-foreground">Loading…</div>}>
      <AuthErrorContent />
    </Suspense>
  );
}
