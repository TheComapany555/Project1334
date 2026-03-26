import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-client";
import { getBrokerPayments, getAgencyPayments } from "@/lib/actions/payments";
import { PageHeader } from "@/components/admin/page-header";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { PaymentLogsTable } from "@/components/payments/payment-logs-table";

export default async function PaymentsPage() {
  const session = await getSession();
  if (!session?.user) redirect("/auth/login");

  const isOwner = session.user.agencyRole === "owner";
  const payments = isOwner ? await getAgencyPayments() : await getBrokerPayments();

  const total = payments.length;
  const paid = payments.filter((p) => p.status === "paid" || p.status === "approved").length;
  const pending = payments.filter((p) => p.status === "pending" || p.status === "invoiced").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payments"
        description={isOwner
          ? "All payment activity across your agency."
          : "Your payment history."
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="py-4">
          <CardContent className="flex flex-col items-center gap-0.5 p-0 text-center">
            <span className="text-2xl font-semibold">{total}</span>
            <span className="text-xs text-muted-foreground">Total</span>
          </CardContent>
        </Card>
        <Card className="py-4">
          <CardContent className="flex flex-col items-center gap-0.5 p-0 text-center">
            <span className="text-2xl font-semibold text-success">{paid}</span>
            <span className="text-xs text-muted-foreground">Completed</span>
          </CardContent>
        </Card>
        <Card className="py-4">
          <CardContent className="flex flex-col items-center gap-0.5 p-0 text-center">
            <span className="text-2xl font-semibold text-warning">{pending}</span>
            <span className="text-xs text-muted-foreground">Pending</span>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="text-base">Payment logs</CardTitle>
        </CardHeader>
        <Separator className="mt-4" />
        <CardContent className="p-0">
          <PaymentLogsTable payments={payments} showBroker={isOwner} />
        </CardContent>
      </Card>
    </div>
  );
}
