import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { PublicHeaderSkeleton } from "@/components/public-header-skeleton";

export default function AgencyPublicLoading() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PublicHeaderSkeleton maxWidth="max-w-6xl" />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:py-12 space-y-6">
        <Skeleton className="h-4 w-48" />

        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <Card>
            <CardContent className="pt-6 pb-6 flex flex-col items-center gap-4">
              <Skeleton className="h-24 w-24 rounded-xl" />
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-5 w-24 rounded-full" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-20" />
            </CardHeader>
            <Separator />
            <CardContent className="pt-4 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-4 rounded-lg border border-border p-3">
                  <Skeleton className="h-20 w-28 shrink-0 rounded-md" />
                  <div className="flex-1 space-y-2 py-1">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
