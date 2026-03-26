import { getAgenciesForAdmin } from "@/lib/actions/admin-brokers";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/admin/page-header";
import { Building2 } from "lucide-react";
import { AgenciesTable } from "./agencies-table";

export default async function AdminBrokersPage() {
  const agencies = await getAgenciesForAdmin();

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
          {agencies.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                <Building2 className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="font-medium">No agencies yet</p>
              <p className="text-sm text-muted-foreground">Agencies will appear here once brokers sign up.</p>
            </div>
          ) : (
            <AgenciesTable agencies={agencies} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
