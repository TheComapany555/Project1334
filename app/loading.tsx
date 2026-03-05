import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { PublicHeaderSkeleton } from "@/components/public-header-skeleton";

export default function HomeLoading() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PublicHeaderSkeleton />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="container px-4 sm:px-6 max-w-7xl mx-auto pt-10 pb-10 sm:pt-24 sm:pb-20 md:pt-32 md:pb-28">
            <div className="mx-auto max-w-4xl text-center space-y-6">
              <Skeleton className="h-6 w-64 rounded-full mx-auto" />
              <Skeleton className="h-12 w-3/4 mx-auto sm:h-14" />
              <Skeleton className="h-5 w-2/3 mx-auto" />
              {/* Search bar */}
              <div className="mx-auto max-w-2xl">
                <Skeleton className="h-16 w-full rounded-2xl" />
              </div>
              <Skeleton className="h-4 w-72 mx-auto" />
            </div>
          </div>
        </section>

        {/* Stats bar */}
        <section className="border-y border-border/50 bg-muted/30">
          <div className="container px-4 sm:px-6 max-w-7xl mx-auto py-6 sm:py-8">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 sm:gap-8">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="text-center space-y-1">
                  <Skeleton className="h-7 w-16 mx-auto" />
                  <Skeleton className="h-4 w-24 mx-auto" />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Recent listings */}
        <section className="container px-4 sm:px-6 max-w-7xl mx-auto py-10 sm:py-16 md:py-20">
          <div className="flex items-end justify-between gap-4 mb-6 sm:mb-8">
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-8 w-44" />
            </div>
            <Skeleton className="h-8 w-20" />
          </div>

          <div className="hidden sm:grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="overflow-hidden">
                <Skeleton className="aspect-[16/10] w-full" />
                <CardContent className="p-4 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                  <div className="flex items-center justify-between pt-2 border-t border-border/40 mt-2">
                    <Skeleton className="h-5 w-16" />
                    <Skeleton className="h-3 w-10" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Mobile scroll skeleton */}
          <div className="block sm:hidden -mx-4">
            <div className="flex gap-3.5 px-4 overflow-hidden">
              {[1, 2].map((i) => (
                <Card key={i} className="shrink-0 w-[72vw] max-w-[280px] overflow-hidden">
                  <Skeleton className="aspect-[16/10] w-full" />
                  <CardContent className="p-3 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                    <div className="flex items-center justify-between pt-2 border-t border-border/40 mt-2">
                      <Skeleton className="h-5 w-16" />
                      <Skeleton className="h-3 w-10" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="border-t border-border/50 bg-muted/20">
          <div className="container px-4 sm:px-6 max-w-7xl mx-auto py-10 sm:py-16 md:py-20">
            <div className="text-center mb-8 sm:mb-10 space-y-2">
              <Skeleton className="h-3 w-28 mx-auto" />
              <Skeleton className="h-8 w-64 mx-auto" />
            </div>
            <div className="grid gap-4 sm:gap-5 grid-cols-1 sm:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="p-5 sm:p-6">
                  <Skeleton className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl mb-4" />
                  <Skeleton className="h-5 w-32 mb-2" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-4/5 mt-1" />
                </Card>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
