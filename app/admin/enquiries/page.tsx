import { getAllEnquiries } from "@/lib/actions/enquiries";
import { getBrokersForAdmin } from "@/lib/actions/admin-brokers";
import { PageHeader } from "@/components/admin/page-header";
import { EmptyState } from "@/components/admin/empty-state";
import { Pagination } from "@/components/admin/pagination";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EnquiriesTable } from "./enquiries-table";
import { EnquiriesFilterBar } from "./enquiries-filter-bar";
import { Inbox } from "lucide-react";

const PAGE_SIZE = 20;

type Props = { searchParams: Promise<{ page?: string; reason?: string; broker_id?: string }> };

export default async function AdminEnquiriesPage({ searchParams }: Props) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
  const reason = params.reason?.trim() || null;
  const broker_id = params.broker_id?.trim() || null;

  const [brokers, { enquiries, total }] = await Promise.all([
    getBrokersForAdmin(),
    getAllEnquiries({ page, pageSize: PAGE_SIZE, reason, broker_id }),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE) || 1;
  const brokerOptions = brokers.map((b) => ({
    value: b.id,
    label: b.name || b.company || b.email || b.id,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Enquiries"
        description="All enquiries across brokers. Use filters to narrow by reason or broker."
      />

      <Card className="overflow-hidden shadow-sm">
        <CardHeader className="border-b bg-muted/30 px-4 py-4 sm:px-6">
          <div className="space-y-4">
            <div>
              <CardTitle className="text-base">All enquiries</CardTitle>
              <CardDescription className="mt-0.5">
                {total === 0
                  ? "No enquiries yet."
                  : `${total} enquiry${total === 1 ? "" : "ies"} total`}
              </CardDescription>
            </div>
            <EnquiriesFilterBar brokerOptions={brokerOptions} />
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6">
          {enquiries.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title="No enquiries"
              description="Enquiries will appear here when buyers contact brokers from listing pages. Try changing the filters."
            />
          ) : (
            <>
              <EnquiriesTable enquiries={enquiries} page={page} totalPages={totalPages} />
              <Pagination
                page={page}
                totalPages={totalPages}
                basePath="/admin/enquiries"
                searchParams={{
                  ...(reason && { reason }),
                  ...(broker_id && { broker_id }),
                }}
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
