import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { PublicHeaderSkeleton } from "@/components/public-header-skeleton";

export default function SearchLoading() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PublicHeaderSkeleton maxWidth="max-w-6xl" />

      <main className="container mx-auto flex-1 px-4 py-8 sm:py-10 max-w-6xl">
        <div className="space-y-8">
          {/* Breadcrumb + heading */}
          <div className="space-y-3">
            <Skeleton className="h-4 w-40" />
            <div className="space-y-1">
              <Skeleton className="h-8 w-48 sm:h-9" />
              <Skeleton className="h-4 w-72" />
            </div>
            <Skeleton className="h-px w-full" />
          </div>

          {/* Search form skeleton */}
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <Skeleton className="h-10 w-full sm:w-64" />
              <Skeleton className="h-10 w-40" />
              <Skeleton className="h-10 w-40" />
              <Skeleton className="h-10 w-24" />
            </div>
          </div>

          {/* Results grid */}
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="overflow-hidden">
                <Skeleton className="aspect-[16/10] w-full" />
                <CardContent className="p-4 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                  <div className="flex items-center justify-between pt-2">
                    <Skeleton className="h-5 w-20" />
                    <Skeleton className="h-3 w-12" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
