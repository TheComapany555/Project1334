import { CalendarClock } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Shown in place of real listings on every public/buyer-facing surface while
 * the admin "listings coming soon" toggle (/admin/settings) is on.
 */
export function ListingsComingSoon({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card shadow-sm px-6 py-16 sm:py-24 text-center",
        className,
      )}
    >
      <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
        <CalendarClock className="h-6 w-6 text-primary" aria-hidden />
      </div>
      <span className="inline-flex items-center gap-2 rounded-sm border border-primary/20 bg-primary/8 px-3 py-1.5 text-[11px] sm:text-xs font-medium text-primary">
        <span className="relative flex h-2 w-2 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
        </span>
        Coming soon
      </span>
      <h2 className="mt-4 text-xl sm:text-2xl font-bold tracking-tight text-foreground">
        Listings are coming soon
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground leading-relaxed">
        We&apos;re preparing a curated range of businesses for sale across
        Australia. Check back soon to browse the first opportunities.
      </p>
    </div>
  );
}
