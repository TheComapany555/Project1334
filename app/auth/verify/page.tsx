import { redirect } from "next/navigation";
import { AuthOutcome } from "@/components/auth/auth-shell";
import { verifyEmailToken } from "@/lib/actions/auth";
import { AlertTriangle, ArrowRight, LinkIcon } from "lucide-react";

type Props = { searchParams: Promise<{ token?: string }> };

export default async function VerifyPage({ searchParams }: Props) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <AuthOutcome
        icon={LinkIcon}
        tone="error"
        title="This link isn't valid"
        description="This verification link is invalid or has expired. Sign in to request a new one."
        action={{
          href: "/auth/login",
          label: (
            <>
              Go to sign in
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
            </>
          ),
        }}
      />
    );
  }

  const result = await verifyEmailToken(token);
  if (!result.ok) {
    return (
      <AuthOutcome
        icon={AlertTriangle}
        tone="error"
        title="We couldn't verify your email"
        description={result.error}
        action={{
          href: "/auth/login",
          label: (
            <>
              Go to sign in
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
            </>
          ),
        }}
      />
    );
  }

  redirect("/auth/login?verified=1");
}
