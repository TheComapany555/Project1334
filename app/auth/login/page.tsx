import { Suspense } from "react";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="text-muted-foreground">Loading…</div>}>
      <LoginForm />
    </Suspense>
  );
}
