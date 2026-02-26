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
import { Badge } from "@/components/ui/badge";
import { BrokerActions } from "./broker-actions";

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
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Brokers</h1>
        <p className="text-muted-foreground mt-1">
          Approve new signups, or enable/disable broker access. Pending and disabled brokers cannot sign in.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Manage brokers</CardTitle>
          <CardDescription>
            New brokers are pending until you approve. Approve to allow sign-in, or disable to block access.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {brokers.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No brokers yet.
            </p>
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
                      <Badge
                        variant={
                          b.status === "active"
                            ? "success"
                            : b.status === "pending"
                              ? "warning"
                              : "secondary"
                        }
                        className="border-0"
                      >
                        {b.status === "active" ? "Active" : b.status === "pending" ? "Pending" : "Disabled"}
                      </Badge>
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
