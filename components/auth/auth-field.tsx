"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/**
 * One labelled input with its error message, sized for the auth surface.
 *
 * The error slot is only rendered when there is an error, but the message is
 * `aria-live` and the input carries `aria-invalid` + `aria-describedby`, so a
 * screen reader hears the problem rather than only seeing a red border.
 */
export const AuthField = React.forwardRef<
  HTMLInputElement,
  React.ComponentProps<"input"> & {
    label: string;
    error?: string;
    hint?: string;
  }
>(function AuthField({ label, error, hint, id, className, ...props }, ref) {
  const autoId = React.useId();
  const fieldId = id ?? autoId;
  const errorId = `${fieldId}-error`;
  const hintId = `${fieldId}-hint`;

  return (
    <div className="grid gap-2">
      <Label htmlFor={fieldId}>{label}</Label>
      <Input
        ref={ref}
        id={fieldId}
        aria-invalid={error ? true : undefined}
        aria-describedby={
          cn(error && errorId, hint && !error && hintId).trim() || undefined
        }
        className={cn("h-11", className)}
        {...props}
      />
      {error ? (
        <p id={errorId} role="alert" className="text-destructive text-xs">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="text-muted-foreground text-xs">
          {hint}
        </p>
      ) : null}
    </div>
  );
});

/**
 * Password input with a reveal toggle.
 *
 * Letting people check what they typed cuts failed sign-ins far more than a
 * confirm field does, and the toggle is a real button with an accessible name
 * that changes with its state.
 */
export const AuthPasswordField = React.forwardRef<
  HTMLInputElement,
  React.ComponentProps<"input"> & {
    label: string;
    error?: string;
    hint?: string;
    /** Rendered to the right of the label, e.g. a "Forgot password?" link. */
    labelAction?: React.ReactNode;
  }
>(function AuthPasswordField(
  { label, error, hint, labelAction, id, className, ...props },
  ref,
) {
  const [visible, setVisible] = React.useState(false);
  const autoId = React.useId();
  const fieldId = id ?? autoId;
  const errorId = `${fieldId}-error`;
  const hintId = `${fieldId}-hint`;

  return (
    <div className="grid gap-2">
      {labelAction ? (
        <div className="flex items-baseline justify-between gap-3">
          <Label htmlFor={fieldId}>{label}</Label>
          {labelAction}
        </div>
      ) : (
        <Label htmlFor={fieldId}>{label}</Label>
      )}
      <div className="relative">
        <Input
          ref={ref}
          id={fieldId}
          type={visible ? "text" : "password"}
          aria-invalid={error ? true : undefined}
          aria-describedby={
            cn(error && errorId, hint && !error && hintId).trim() || undefined
          }
          className={cn("h-11 pr-11", className)}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          className="text-muted-foreground hover:text-foreground focus-visible:ring-ring/60 absolute inset-y-0 right-0 flex w-11 cursor-pointer items-center justify-center rounded-r-md transition-colors outline-none focus-visible:ring-2"
        >
          {visible ? (
            <EyeOff className="h-4 w-4" aria-hidden />
          ) : (
            <Eye className="h-4 w-4" aria-hidden />
          )}
        </button>
      </div>
      {error ? (
        <p id={errorId} role="alert" className="text-destructive text-xs">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="text-muted-foreground text-xs">
          {hint}
        </p>
      ) : null}
    </div>
  );
});
