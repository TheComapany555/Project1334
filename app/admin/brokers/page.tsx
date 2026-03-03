import { getBrokersForAdmin } from "@/lib/actions/admin-brokers";
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
import { BrokerActions } from "./broker-actions";
import { Users } from "lucide-react";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function AdminBrokersPage() {
  const brokers = await getBrokersForAdmin();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Brokers"
        description="Approve new signups, or enable/disable broker access. Pending and disabled brokers cannot sign in."
      />
      <Card>
        <CardHeader>
          <CardTitle>Manage brokers</CardTitle>
          <CardDescription>
            New brokers are pending until you approve. Approve to allow sign-in, or disable to block access.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {brokers.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                <Users className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="space-y-1">
                <p className="font-medium">No brokers yet</p>
                <p className="text-sm text-muted-foreground">Brokers will appear here once they sign up.</p>
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {brokers.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell className="font-medium">{b.email}</TableCell>
                    <TableCell>{b.name ?? "—"}</TableCell>
                    <TableCell>{b.company ?? "—"}</TableCell>
                    <TableCell>
                      <StatusBadge status={b.status} className="border-0" />
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatDate(b.created_at)}
                    </TableCell>
                    <TableCell>
                      <BrokerActions brokerId={b.id} status={b.status} />
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
