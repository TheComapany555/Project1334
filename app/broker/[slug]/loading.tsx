import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { PublicHeaderSkeleton } from "@/components/public-header-skeleton";

export default function BrokerProfileLoading() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PublicHeaderSkeleton maxWidth="max-w-6xl" />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:py-12 space-y-6">
        {/* Breadcrumb */}
        <Skeleton className="h-4 w-48" />

        {/* Hero card */}
        <Card className="overflow-hidden">
          <div className="h-1.5 w-full bg-gradient-to-r from-primary/60 via-primary to-primary/60" />
          <CardContent className="pt-8 pb-8 sm:pt-10 sm:pb-10">
            <div className="flex flex-col items-center gap-6 text-center sm:flex-row sm:items-start sm:text-left">
              <Skeleton className="h-24 w-24 sm:h-28 sm:w-28 rounded-full" />
              <div className="flex-1 min-w-0 space-y-4">
                <div className="space-y-2">
                  <Skeleton className="h-7 w-48 mx-auto sm:mx-0" />
                  <Skeleton className="h-4 w-32 mx-auto sm:mx-0" />
                  <Skeleton className="h-5 w-28 rounded-full mx-auto sm:mx-0" />
                </div>
                <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
                  <Skeleton className="h-8 w-20 rounded-md" />
                  <Skeleton className="h-8 w-20 rounded-md" />
                  <Skeleton className="h-8 w-24 rounded-md" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* About */}
        <Card>
          <CardHeader className="pb-3">
            <Skeleton className="h-4 w-16" />
          </CardHeader>
          <Separator />
          <CardContent className="pt-4 space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/6" />
          </CardContent>
        </Card>

        {/* Listings */}
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-3 w-16" />
          </CardHeader>
          <Separator />
          <CardContent className="pt-4">
            <div className="grid gap-3 sm:grid-cols-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex gap-4 rounded-xl border border-border bg-muted/20 p-4">
                  <Skeleton className="h-[72px] w-24 rounded-lg shrink-0" />
                  <div className="flex-1 space-y-2 py-0.5">
                    <Skeleton className="h-4 w-3/4" />
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-3 w-20" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
