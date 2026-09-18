import { listOnboardingRequests } from "@/lib/actions/broker-onboarding";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/admin/page-header";
import { Rocket } from "lucide-react";
import { OnboardingRequestsTable } from "./onboarding-requests-table";
import { DEFAULT_PAGE_SIZE } from "@/lib/types/pagination";

export const metadata = { title: "Onboarding Requests" };

type SP = { [key: string]: string | string[] | undefined };

function pickStr(v: string | string[] | undefined): string | null {
  if (!v) return null;
  const s = Array.isArray(v) ? v[0] : v;
  return s?.trim() || null;
}

export default async function AdminOnboardingRequestsPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(pickStr(sp.page) ?? 1));
  const pageSize = Math.max(
    1,
    Number(pickStr(sp.pageSize) ?? DEFAULT_PAGE_SIZE),
  );
  const q = pickStr(sp.q);
  const status = pickStr(sp.status);

  const result = await listOnboardingRequests({ page, pageSize, q, status });
  const hasFilters = !!(q || status);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Onboarding Requests"
        description="Brokers who asked us to set up their agency for them."
      />
      <Card>
        <CardHeader>
          <CardTitle>Requests</CardTitle>
          <CardDescription>
            Submitted from the public onboarding page. Call them, then move each
            request through the workflow so nothing is picked up twice.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {result.total === 0 && !hasFilters ? (
            <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
              <div className="bg-muted flex h-12 w-12 items-center justify-center rounded-full">
                <Rocket className="text-muted-foreground h-6 w-6" />
              </div>
              <p className="font-medium">No requests yet</p>
              <p className="text-muted-foreground text-sm">
                Requests from brokers who want managed onboarding will appear
                here.
              </p>
            </div>
          ) : (
            <OnboardingRequestsTable result={result} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
