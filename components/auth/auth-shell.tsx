import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Shared building blocks for every /auth screen, so the six pages read as one
 * surface instead of six separately-styled forms. The layout owns the frame;
 * these own what sits inside it.
 */

export function AuthHeader({
  title,
  description,
  className,
}: {
  title: string;
  description?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid gap-2", className)}>
      <h1 className="text-foreground text-[1.75rem] leading-tight font-semibold tracking-[-0.02em]">
        {title}
      </h1>
      {description && (
        <p className="text-muted-foreground text-sm leading-relaxed text-pretty">
          {description}
        </p>
      )}
    </div>
  );
}

/** Form-level failure. Field-level problems belong on the field itself. */
export function AuthError({ children }: { children: React.ReactNode }) {
  return (
    <div
      role="alert"
      className="border-destructive/30 bg-destructive/[0.06] text-destructive flex items-start gap-2.5 rounded-lg border px-3.5 py-3 text-sm"
    >
      <AlertCircle className="mt-px h-4 w-4 shrink-0" aria-hidden />
      <span className="leading-relaxed">{children}</span>
    </div>
  );
}

/**
 * Terminal screen — "check your email", "password updated", "invalid link".
 * `tone` only shifts the icon treatment; the layout stays identical so moving
 * between outcomes never shifts the page.
 */
export function AuthOutcome({
  icon: Icon,
  tone = "success",
  title,
  description,
  action,
  secondaryAction,
}: {
  icon: React.ComponentType<{ className?: string }>;
  tone?: "success" | "error" | "warning";
  title: string;
  description?: React.ReactNode;
  action?: { href: string; label: React.ReactNode };
  secondaryAction?: { href: string; label: React.ReactNode };
}) {
  return (
    <div className="grid gap-6">
      <div
        className={cn(
          "flex h-12 w-12 items-center justify-center rounded-xl",
          tone === "success" && "bg-primary/10 text-primary",
          tone === "error" && "bg-destructive/10 text-destructive",
          tone === "warning" &&
            "bg-warning/15 text-warning-foreground dark:text-warning",
        )}
      >
        <Icon className="h-6 w-6" aria-hidden />
      </div>
      <AuthHeader title={title} description={description} />
      {(action || secondaryAction) && (
        <div className="grid gap-2.5">
          {action && (
            <Button asChild size="lg" className="h-11 w-full">
              <Link href={action.href}>{action.label}</Link>
            </Button>
          )}
          {secondaryAction && (
            <Button asChild variant="outline" size="lg" className="h-11 w-full">
              <Link href={secondaryAction.href}>{secondaryAction.label}</Link>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Identity strip — confirms *which* account an invite or setup link belongs to,
 * so nobody sets a password on the wrong one. Not a card: a flat inset row, so
 * it never competes with the form it sits above.
 */
export function AuthIdentity({
  icon: Icon,
  primary,
  secondary,
}: {
  icon: React.ComponentType<{ className?: string }>;
  primary: string;
  secondary?: string;
}) {
  return (
    <div className="bg-muted/50 border-border/70 flex items-center gap-3 rounded-lg border px-3.5 py-3">
      <span className="bg-primary/10 text-primary flex h-9 w-9 shrink-0 items-center justify-center rounded-lg">
        <Icon className="h-4.5 w-4.5" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="text-foreground truncate text-sm font-medium">{primary}</p>
        {secondary && (
          <p className="text-muted-foreground truncate text-xs">{secondary}</p>
        )}
      </div>
    </div>
  );
}

/** Centered spinner for token-validation waits, sized to the form block. */
export function AuthPending({ label = "Loading" }: { label?: string }) {
  return (
    <div
      className="flex items-center justify-center py-16"
      role="status"
      aria-live="polite"
    >
      <span className="border-muted-foreground/25 border-t-primary h-6 w-6 animate-spin rounded-full border-2" />
      <span className="sr-only">{label}</span>
    </div>
  );
}

/** Bottom-of-form link, e.g. "Already have an account? Sign in". */
export function AuthFootLink({
  prompt,
  href,
  label,
}: {
  prompt: string;
  href: string;
  label: string;
}) {
  return (
    <p className="text-muted-foreground text-center text-sm">
      {prompt}{" "}
      <Link
        href={href}
        className="text-foreground hover:text-primary font-medium underline-offset-4 transition-colors hover:underline"
      >
        {label}
      </Link>
    </p>
  );
}
