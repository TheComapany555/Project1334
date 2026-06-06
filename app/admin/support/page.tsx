import { listAdminTickets } from "@/lib/actions/support";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/admin/page-header";
import { LifeBuoy } from "lucide-react";
import { AdminTicketsTable } from "./admin-tickets-table";
import { DEFAULT_PAGE_SIZE } from "@/lib/types/pagination";

export const metadata = { title: "Support" };

type SP = { [key: string]: string | string[] | undefined };

function pickStr(v: string | string[] | undefined): string | null {
  if (!v) return null;
  const s = Array.isArray(v) ? v[0] : v;
  return s?.trim() || null;
}

export default async function AdminSupportPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(pickStr(sp.page) ?? 1));
  const pageSize = Math.max(1, Number(pickStr(sp.pageSize) ?? DEFAULT_PAGE_SIZE));
  const q = pickStr(sp.q);
  const status = pickStr(sp.status);
  const priority = pickStr(sp.priority);

  const result = await listAdminTickets({ page, pageSize, q, status, priority });
  const hasFilters = !!(q || status || priority);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Support"
        description="View, assign, and respond to broker support tickets."
      />
      <Card>
        <CardHeader>
          <CardTitle>Tickets</CardTitle>
          <CardDescription>
            Brokers raise tickets here. Reply, leave internal notes, assign, and
            move them through the status workflow.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {result.total === 0 && !hasFilters ? (
            <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <LifeBuoy className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="font-medium">No tickets yet</p>
              <p className="text-sm text-muted-foreground">
                Support tickets raised by brokers will appear here.
              </p>
            </div>
          ) : (
            <AdminTicketsTable result={result} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
