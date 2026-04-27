import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { percentChange, formatPercent } from "@/lib/utils/format";

type Props = {
  label: string;
  value: string;
  /** Optional secondary line under the value. */
  subValue?: string;
  /** Compare last vs prev period for delta arrow. Both expected to be numbers. */
  current?: number;
  previous?: number;
  /** When true, "down" is good (e.g. churn). Inverts arrow color. */
  inverseTrend?: boolean;
  icon: React.ReactNode;
  /** Right-side accent on the icon tile. */
  tone?: "default" | "primary" | "emerald" | "amber" | "rose";
};

const TONE_CLASSES: Record<NonNullable<Props["tone"]>, string> = {
  default: "bg-muted text-muted-foreground",
  primary: "bg-primary/10 text-primary",
  emerald:
    "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400",
  amber:
    "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400",
  rose: "bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400",
};

export function KpiCard({
  label,
  value,
  subValue,
  current,
  previous,
  inverseTrend,
  icon,
  tone = "default",
}: Props) {
  const change =
    current !== undefined && previous !== undefined
      ? percentChange(current, previous)
      : null;

  const goodDirection = inverseTrend ? "down" : "up";
  const isGood = change?.direction === goodDirection;
  const isFlat = change?.direction === "flat";

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-5 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
            {label}
          </p>
          <div
            className={cn(
              "h-8 w-8 rounded-md flex items-center justify-center shrink-0",
              TONE_CLASSES[tone],
            )}
          >
            {icon}
          </div>
        </div>
        <div className="space-y-0.5">
          <p className="text-2xl font-semibold tabular-nums leading-tight">
            {value}
          </p>
          {subValue && (
            <p className="text-xs text-muted-foreground">{subValue}</p>
          )}
        </div>
        {change && (
          <div className="flex items-center gap-1.5 text-[11px]">
            <span
              className={cn(
                "inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 font-medium tabular-nums",
                isFlat
                  ? "bg-muted text-muted-foreground"
                  : isGood
                    ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400"
                    : "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400",
              )}
            >
              {isFlat ? (
                <Minus className="h-3 w-3" />
              ) : change.direction === "up" ? (
                <ArrowUp className="h-3 w-3" />
              ) : (
                <ArrowDown className="h-3 w-3" />
              )}
              {formatPercent(change.value, 0)}
            </span>
            <span className="text-muted-foreground">vs prev 30 days</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
