"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type ChartTipRow = {
  label: ReactNode;
  value: ReactNode;
  /** Swatch colour. Omit for a secondary row (keeps alignment, no swatch shown). */
  color?: string;
  /** Dimmed value (e.g. a percentage or a secondary metric). */
  muted?: boolean;
};

/**
 * The one tooltip used by every chart in the app, so hover states are pixel-
 * identical everywhere. Charts map their Recharts payload into `rows` and pass
 * an optional `title` (usually the x-axis label).
 */
export function ChartTip({
  title,
  rows,
  className,
}: {
  title?: ReactNode;
  rows: ChartTipRow[];
  className?: string;
}) {
  return (
    <div
      className={cn(
        "min-w-32 rounded-lg border border-border/60 bg-background px-3 py-2 text-xs shadow-xl",
        className,
      )}
    >
      {title != null && title !== "" && (
        <p className="mb-1.5 font-medium text-foreground">{title}</p>
      )}
      <div className="grid gap-1">
        {rows.map((row, i) => (
          <div key={i} className="flex items-center gap-2">
            <span
              className="h-2 w-2 shrink-0 rounded-[2px]"
              style={{ backgroundColor: row.color ?? "transparent" }}
              aria-hidden
            />
            <span className="text-muted-foreground">{row.label}</span>
            <span
              className={cn(
                "ml-auto font-semibold tabular-nums",
                row.muted ? "text-muted-foreground" : "text-foreground",
              )}
            >
              {row.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
