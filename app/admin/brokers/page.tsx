import { listAdminAgencies } from "@/lib/actions/admin-brokers";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/admin/page-header";
import { Building2 } from "lucide-react";
import { AgenciesTable } from "./agencies-table";
import { DEFAULT_PAGE_SIZE } from "@/lib/types/pagination";
import type { AgencyStatus } from "@/lib/types/agencies";

type SP = { [key: string]: string | string[] | undefined };

function pickStr(v: string | string[] | undefined): string | null {
  if (!v) return null;
  const s = Array.isArray(v) ? v[0] : v;
  return s?.trim() || null;
}

export default async function AdminBrokersPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(pickStr(sp.page) ?? 1));
  const pageSize = Math.max(1, Number(pickStr(sp.pageSize) ?? DEFAULT_PAGE_SIZE));
  const q = pickStr(sp.q);
  const status = pickStr(sp.status) as AgencyStatus | null;

  const result = await listAdminAgencies({ page, pageSize, q, status });
  const hasFilters = !!(q || status);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Agencies"
        description="Manage agency accounts. Approve new signups or disable access."
      />
      <Card>
        <CardHeader>
          <CardTitle>Manage agencies</CardTitle>
          <CardDescription>
            New agencies are pending until you approve. Each agency has an owner and may have multiple brokers.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {result.total === 0 && !hasFilters ? (
            <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                <Building2 className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="font-medium">No agencies yet</p>
              <p className="text-sm text-muted-foreground">Agencies will appear here once brokers sign up.</p>
            </div>
          ) : (
            <AgenciesTable result={result} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
