import { Skeleton } from "@/components/ui/skeleton";

type PublicHeaderSkeletonProps = {
  maxWidth?: string;
};

export function PublicHeaderSkeleton({
  maxWidth = "max-w-7xl",
}: PublicHeaderSkeletonProps) {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/95 backdrop-blur">
      <div
        className={`mx-auto flex h-14 sm:h-16 items-center justify-between gap-2 px-4 sm:px-6 ${maxWidth}`}
      >
        <Skeleton className="h-7 w-28 sm:h-9 sm:w-32" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-8 rounded-md" />
          <Skeleton className="h-8 w-20 rounded-md" />
          <Skeleton className="h-8 w-28 rounded-md hidden sm:block" />
        </div>
      </div>
    </header>
  );
}
