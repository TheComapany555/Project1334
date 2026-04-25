import { listAdminListings } from "@/lib/actions/admin-listings";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/admin/page-header";
import { FileText } from "lucide-react";
import { AdminListingsTable } from "./listings-table";
import { DEFAULT_PAGE_SIZE } from "@/lib/types/pagination";

type SP = { [key: string]: string | string[] | undefined };

function pickStr(v: string | string[] | undefined): string | null {
  if (!v) return null;
  const s = Array.isArray(v) ? v[0] : v;
  return s?.trim() || null;
}

export default async function AdminListingsPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(pickStr(sp.page) ?? 1));
  const pageSize = Math.max(1, Number(pickStr(sp.pageSize) ?? DEFAULT_PAGE_SIZE));
  const q = pickStr(sp.q);
  const status = pickStr(sp.status);
  const visibility = pickStr(sp.visibility);
  const featured = pickStr(sp.featured);

  const result = await listAdminListings({
    page,
    pageSize,
    q,
    status,
    visibility,
    featured,
  });

  const hasFilters = !!(q || status || visibility || featured);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Listings"
        description="Moderate listings. Removed listings are hidden from search and public pages."
      />
      <Card>
        <CardHeader>
          <CardTitle>Moderate listings</CardTitle>
          <CardDescription>
            Remove a listing from the marketplace or restore it. Brokers can still see their own listings.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {result.total === 0 && !hasFilters ? (
            <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                <FileText className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="font-medium">No listings yet</p>
              <p className="text-sm text-muted-foreground">Listings will appear here once brokers create them.</p>
            </div>
          ) : (
            <AdminListingsTable result={result} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
