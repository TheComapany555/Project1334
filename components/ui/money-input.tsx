"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

function formatWholeAud(n: number): string {
  return new Intl.NumberFormat("en-AU", { maximumFractionDigits: 0 }).format(n);
}

export type MoneyInputProps = Omit<
  React.ComponentProps<typeof Input>,
  "type" | "value" | "onChange" | "inputMode"
> & {
  value: number | null | undefined;
  onValueChange: (value: number | null) => void;
};

/**
 * Whole-dollar AUD-style input with thousand separators while typing.
 */
export function MoneyInput({
  id,
  value,
  onValueChange,
  disabled,
  className,
  ...props
}: MoneyInputProps) {
  const [text, setText] = React.useState(() =>
    value != null && Number.isFinite(value) ? formatWholeAud(value) : "",
  );

  React.useEffect(() => {
    if (value != null && Number.isFinite(value)) {
      setText(formatWholeAud(value));
    } else {
      setText("");
    }
  }, [value]);

  return (
    <Input
      {...props}
      id={id}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      disabled={disabled}
      className={cn("tabular-nums", className)}
      value={text}
      onChange={(e) => {
        const digits = e.target.value.replace(/\D/g, "");
        if (!digits) {
          setText("");
          onValueChange(null);
          return;
        }
        const n = parseInt(digits, 10);
        if (!Number.isFinite(n)) return;
        onValueChange(n);
        setText(formatWholeAud(n));
      }}
    />
  );
}
