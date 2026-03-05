import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { PublicHeaderSkeleton } from "@/components/public-header-skeleton";

export default function ListingLoading() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PublicHeaderSkeleton maxWidth="max-w-3xl" />

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:py-10 space-y-6">
        {/* Breadcrumb */}
        <Skeleton className="h-4 w-52" />

        {/* Title block */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-8 w-3/4 sm:h-9" />
          <div className="flex items-center gap-3">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-5 w-24" />
          </div>
        </div>

        {/* Image */}
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <Skeleton className="aspect-[16/10] w-full" />
            <div className="flex gap-2 p-3 border-t border-border">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-24 rounded" />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Tags */}
        <div className="space-y-2">
          <Skeleton className="h-3 w-12" />
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-5 w-24 rounded-full" />
            ))}
          </div>
        </div>

        {/* Summary */}
        <Card>
          <CardHeader className="pb-3">
            <Skeleton className="h-6 w-24" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-4/6" />
            </div>
          </CardContent>
        </Card>

        {/* Description */}
        <Card>
          <CardHeader className="pb-3">
            <Skeleton className="h-6 w-28" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-5/6" />
            </div>
          </CardContent>
        </Card>

        {/* Key details */}
        <Card>
          <CardHeader className="pb-3">
            <Skeleton className="h-6 w-28" />
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-border">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between py-3">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-20" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Broker */}
        <Card>
          <CardHeader className="pb-3">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-36" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Skeleton className="h-14 w-14 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-8 w-24 rounded-md" />
            </div>
          </CardContent>
        </Card>

        {/* Enquiry form */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-36" />
            <Skeleton className="h-4 w-56" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-10 w-32" />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
