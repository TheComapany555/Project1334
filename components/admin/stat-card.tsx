import Link from "next/link";
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Trend = { value: string; up: boolean };

type StatCardProps = {
  label: string;
  value: string | number;
  icon: LucideIcon;
  iconClassName?: string;
  trend?: Trend;
  href?: string;
  linkLabel?: string;
  description?: string;
  className?: string;
};

export function StatCard({
  label,
  value,
  icon: Icon,
  iconClassName = "text-primary",
  trend,
  href,
  linkLabel,
  description,
  className,
}: StatCardProps) {
  return (
    <Card className={cn("shadow-sm", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <span className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
          {label}
        </span>
        <span
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted",
            iconClassName
          )}
        >
          <Icon className="size-4" aria-hidden />
        </span>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold tabular-nums">{value}</p>
        {trend && (
          <div className="mt-1 flex items-center gap-1">
            {trend.up ? (
              <TrendingUp className="size-3.5 text-success" aria-hidden />
            ) : (
              <TrendingDown className="size-3.5 text-destructive" aria-hidden />
            )}
            <span
              className={cn(
                "text-xs font-medium",
                trend.up ? "text-success" : "text-destructive"
              )}
            >
              {trend.value}
            </span>
          </div>
        )}
        {description && (
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        )}
        {href && linkLabel && (
          <Button variant="link" className="mt-2 h-auto p-0 text-xs" asChild>
            <Link href={href}>{linkLabel}</Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
