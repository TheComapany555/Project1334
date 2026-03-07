import { getAgenciesForAdmin } from "@/lib/actions/admin-brokers";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/admin/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { AgencyActions } from "./agency-actions";
import { Building2 } from "lucide-react";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function AdminBrokersPage() {
  const agencies = await getAgenciesForAdmin();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Agencies"
        description="Manage agency accounts. Approve new signups or disable access. When an agency is disabled, all brokers in that agency are blocked from signing in."
      />
      <Card>
        <CardHeader>
          <CardTitle>Manage agencies</CardTitle>
          <CardDescription>
            New agencies are pending until you approve. Each agency has an owner and may have multiple brokers.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {agencies.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                <Building2 className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="space-y-1">
                <p className="font-medium">No agencies yet</p>
                <p className="text-sm text-muted-foreground">Agencies will appear here once brokers sign up.</p>
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agency</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead className="text-center">Brokers</TableHead>
                  <TableHead className="text-center">Listings</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agencies.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{a.name}</p>
                        {a.email && (
                          <p className="text-xs text-muted-foreground">{a.email}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm">{a.owner_name ?? "—"}</p>
                        <p className="text-xs text-muted-foreground">{a.owner_email}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">{a.broker_count}</TableCell>
                    <TableCell className="text-center">{a.listing_count}</TableCell>
                    <TableCell>
                      <StatusBadge status={a.status} className="border-0" />
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatDate(a.created_at)}
                    </TableCell>
                    <TableCell>
                      <AgencyActions agencyId={a.id} status={a.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
