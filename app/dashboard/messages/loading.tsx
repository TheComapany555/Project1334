import { Skeleton } from "@/components/ui/skeleton";
import { MessagesShellSkeleton } from "@/components/messaging/messages-shell-skeleton";

export default function BrokerMessagesLoading() {
  return (
    <div className="flex min-h-0 flex-col gap-4 h-[calc(100dvh-var(--header-height)-7rem)] min-h-[480px]">
      {/* PageHeader skeleton */}
      <div className="shrink-0 space-y-1.5">
        <Skeleton className="h-7 w-32 sm:h-8" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <MessagesShellSkeleton containerClassName="min-h-0 flex-1" />
    </div>
  );
}
