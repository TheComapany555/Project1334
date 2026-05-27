import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  /** Matches the `containerClassName` prop on MessagesShell so the skeleton lines up with the real component. */
  containerClassName?: string;
};

export function MessagesShellSkeleton({ containerClassName }: Props) {
  return (
    <div
      className={cn(
        "grid min-h-0 h-full grid-cols-1 overflow-hidden rounded-lg border bg-card shadow-sm md:grid-cols-[minmax(280px,320px)_1fr]",
        containerClassName ?? "h-[calc(100vh-12rem)] min-h-[420px]",
      )}
    >
      {/* Thread list skeleton */}
      <div className="flex min-h-0 h-full flex-col overflow-hidden border-r">
        <div className="shrink-0 space-y-2 border-b p-3">
          <Skeleton className="h-9 w-full rounded-md" />
          <Skeleton className="h-8 w-full rounded-md" />
        </div>
        <div className="min-h-0 flex-1 overflow-hidden p-2">
          <div className="space-y-1">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex gap-3 rounded-lg p-3">
                <Skeleton className="size-10 shrink-0 rounded-full" />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Skeleton className="h-3.5 w-2/3" />
                    <Skeleton className="h-2.5 w-8 shrink-0" />
                  </div>
                  <Skeleton className="h-3 w-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Empty conversation pane state — md+ only, mirrors MessagesShell */}
      <div className="hidden min-h-0 h-full flex-col items-center justify-center p-8 text-center text-muted-foreground md:flex">
        <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-muted">
          <MessageSquare className="size-5 opacity-70" />
        </div>
        <p className="text-sm font-medium text-foreground">
          Loading conversations…
        </p>
        <p className="mt-1 max-w-xs text-xs">
          We&apos;re fetching your messages.
        </p>
      </div>
    </div>
  );
}
